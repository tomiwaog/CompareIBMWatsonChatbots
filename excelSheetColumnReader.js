async function readColumnFromExcel(excelFileName, targetColumn) {
    targetColumn--//Indexing from 0

    let questionBank = [];
    const xlsxFile = require('read-excel-file/node');
    //Extract Item from an Excel Column and populate them into Array Object

    await xlsxFile(excelFileName + '.xlsx').then((rows) => {
        var i=0;
        for (const eachRow of rows) {
            let eachMessage = eachRow[targetColumn]; //selected column
            
            if (i>0 && eachMessage != null) { //i>0 to ignore te first row which should be an header
                // console.log(eachMessage);
                let newlineArr = eachMessage.split(/\r?\n/);
                for (item of newlineArr) { //Messages with new line is seperated as different input.
                    questionBank.push(item);
                }
            }
            i++;
        }
    })
    return questionBank;
}
//Debugging Excell  File Reader
// let fileOne = "./testInputFile";
// readColumnFromExcel(fileOne, 0).then(result=>{
//     console.log(result);
// });

module.exports = readColumnFromExcel;