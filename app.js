require('dotenv').config();
let getWatsonResponse = require('./watsonServices').getWatsonResponse;
let readExcelColumn = require('./excelSheetColumnReader');
let CACHING = process.env.ENABLE_CACHING; //Caching to Minimise pinging API for the same query - ON or OFF

let cachedPingsOfQnA = {};
//Watson Assistant instances for each bot. Beneficial when bots are in seperate instances
const firstAssist = require('./watsonServices').getAssistant(process.env.WS1_WATSON_API_KEY, process.env.WS1_WATSON_URL);
const secondAssist = require('./watsonServices').getAssistant(process.env.WS2_WATSON_API_KEY, process.env.WS2_WATSON_URL);

//SKills Objects and properties
let skill1 = {
    assistant: firstAssist,
    skillID: process.env.WS1_WATSON_WORKSPACE_ID,
    lastResponse: "",
    botName: process.env.BOT1_NAME || "BOT A"
}

let skill2 = {
    assistant: secondAssist,
    skillID: process.env.WS2_WATSON_WORKSPACE_ID,
    lastResponse: "",
    botName: process.env.BOT2_NAME || "BOT B"
}

let questionBank = [];
//Question Bank Retriever
async function readExcelConvertToArray(excelFile, columnNumber) {
    let result = await readExcelColumn(excelFile, columnNumber);
    questionBank = result;
    return result;
}

//Excel functions
let excelFunctions = require('./excelServices');
let newWorkBook = excelFunctions.getWorkBook();


async function runApp(excelInputFile, userSelectedColumns) { //UserSelectedColumn in parsed in as an array
    let arrayOfColumnsToPing = userSelectedColumns;

    // if (!excelColumn) arrayOfColumnsToPing.push(1);
    for (let i = 0; i < arrayOfColumnsToPing.length; i++) {
        // console.log("Counter | Number of columns to ping: "+ i);
        // if (i != arrayOfColumnsToPing[i]) continue; //skips invalid selections
        let visitingColumn = arrayOfColumnsToPing[i];
        let theWorkSheetToWriteTo = newWorkBook.addWorksheet("Column " + arrayOfColumnsToPing[i] + " pings"); //Part of workbook
        //WorkSheet Headings
        theWorkSheetToWriteTo.row = 1; theWorkSheetToWriteTo.column = 1;
        theWorkSheetToWriteTo.cell(theWorkSheetToWriteTo.row, 1).string("User's Query");
        theWorkSheetToWriteTo.cell(theWorkSheetToWriteTo.row, 2).string(process.env.BOT1_NAME);
        theWorkSheetToWriteTo.cell(theWorkSheetToWriteTo.row, 3).string(process.env.BOT2_NAME);
        theWorkSheetToWriteTo.cell(theWorkSheetToWriteTo.row, 4).string("Comparison");

        await readExcelConvertToArray(excelInputFile, visitingColumn);
        await pingsBOTS_toExcel(theWorkSheetToWriteTo, questionBank, skill1, skill2).then(() => {
            //Sends question bank to the BOTS - PINGS both Watson Assistant BOTs .
            console.log("Already done excel");
        }).
            then(questionBank => {
                console.log("Collecting Column items now...")
                console.log(questionBank);

            })
    }
}

let columns = process.env.Column_Select.split(" ") //Parsing user Selected column
console.log(columns)
runApp(process.env.InputExcelFileName, columns)
    .then(() => {
        let generatedFileName = process.env.OutPutFileName || "compare_Bots_Output";
        newWorkBook.write(generatedFileName + ".xlsx");
    })
    .then(() => {
        console.log("Pings and comparison is now complete!")
    });


async function pingsBOTS_toExcel(theWorkSheet, questionBank, skill1, skill2) {//Expecting Array 
    console.log("Entered pingsBOT to Excel");
    console.log(questionBank);
    //This method does stores item in the cache too
    //Assumes questionBank is an array
    for (const question of questionBank) {
        let done1 = null, done2 = null;

        //If question already exist in cache, Get Responses from Cache
        if (CACHING == "ON" && cachedPingsOfQnA && cachedPingsOfQnA.question) {
            // continue; //If uncommented, it will move to next interation instead of retrieving item from cache.
            done1 = cachedPingsOfQnA.question[0];
            doen2 = cachedPingsOfQnA.question[1];
            skill1.lastResponse = done1;
            skill2.lastResponse = done2;
            console.log("Retrieving from Cache");
            console.log("Question: " + question);
            console.log("BOT1: " + cachedPingsOfQnA.question[0]);
            console.log("BOT2 " + cachedPingsOfQnA.question[1]);
            continue; // Retrieves item from cache and continues, does not enter the ping section.
        }

        //Ping section
        await getBotResponse(question, skill1).then(output => done1 = output);
        await getBotResponse(question, skill2).then(output => done2 = output);

        while (done1 == "null" || done2 == "null"); //Keeps checking till they're both updated.

        // console.log("skill1: " + skill1.lastResponse);
        // console.log("skill2: " + done2);

        if (CACHING == "ON") { //If Canching is on, cache the question.
            cacheQuestionsStore(question, skill1.lastResponse, skill2.lastResponse);//caches the question from response
        }

        //Sends the Results to ExcelRows
        var result = calculateComparisonText(skill1.lastResponse, skill2.lastResponse)
        writeRowToExcel(theWorkSheet, question, skill1.lastResponse, skill2.lastResponse, result);
    }
}

//Log for the calculating result column
function calculateComparisonText(response1, response2) {
    return response1 == response2 ? "PASS" : "INSPECT";
}

//Function for storing items in the cache.Param Question to store, Response from BOT1, and Response from BOT2
function cacheQuestionsStore(question, responseFromBot1, responseFromBot2) {
    cachedPingsOfQnA[question] = [responseFromBot1, responseFromBot2]; //Maps each response to the question asked.
}

//Gets response from Skill based on Query and saves the Response to the skillResponses object. 
async function getBotResponse(userQuery, skill) {
    let botAsst = skill.assistant; let botSkillID = skill.skillID;
    let botResponse;
    await getWatsonResponse(botAsst, botSkillID, userQuery).then(botSkillOutput => {
        botResponse = botSkillOutput.result.output.generic;
        if (botResponse.length == 0) {
            botResponse = "null";
        } else {
            botResponse = botResponse[0].text;
        }
        skill.lastResponse = botResponse;
    })
    return botResponse;
}

//Writes Row to excel, doesn't care what about what you give it, it dumps it.
async function writeRowToExcel(worksheet, input, skill1, skill2, note) {
    worksheet.row++; //Increment row before writing.
    let botOneResponse = skill1, botTwoResponse = skill2;
    // console.log("ROW: "+worksheet.row+ " | INPUT: " + input + " | " + "BOT 1: " + botOneResponse + " | BOT2: " + botTwoResponse + " | Extra Note: " + note + "\n");

    worksheet.cell(worksheet.row, 1).string(input);
    worksheet.cell(worksheet.row, 2).string(botOneResponse);
    worksheet.cell(worksheet.row, 3).string(botTwoResponse);
    worksheet.cell(worksheet.row, 4).string(note);
}