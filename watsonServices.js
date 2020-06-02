require('dotenv').config();
const AssistantV1 = require('ibm-watson/assistant/v1');
const { IamAuthenticator } = require('ibm-watson/auth');

function getAssistant(watsonAPIKEY, watsonURL) {
    const assistant = new AssistantV1({
        version: process.env.WS1_WATSON_VERSION,
        authenticator: new IamAuthenticator({
            apikey: watsonAPIKEY,
        }),
        url: watsonURL,
    });
    return assistant;
}

async function getWatsonResponse(assistant, workdpaceID, userInput) {
    var options = { workspaceId: workdpaceID, input: { text: userInput } };
    return new Promise((resolve, reject) =>{
        assistant.message(options, function (err, response) {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            }
        );
    });
}

let getIntentExamples = (assistant, workspaceID, intentName, jsonFile) => new Promise((resolve, reject) => {
    if (jsonFile) {
        console.log("found JSON")
        let intentsRes = jsonFile.intents;
        for (i in intentsRes) {
            if (intentsRes[i]['intent'] == intentName) {
                resolve(intentsRes[i]['examples'][0]['text']);
                return;
            }
        };
    }

    params = { workspaceId: workspaceID, intent: intentName };
    assistant.listExamples(params)
        .then(res => {
            //   console.log(res.result.examples[0]['text']);
            if ((res.result.examples).length > 0) resolve(res.result.examples[0]['text']);
            else {
                let errorMessage = "NO EXAMPLES for intentName: " + intentName + "| Workspace: " + params.workspaceId;
                console.log(errorMessage);
                resolve("");
            }
        })
        .catch(err => {
            console.log(err)
            reject(err);
        });
});

let getAllIntents = (watsonAssistant, jsonFile) => new Promise((resolve, error) => { //Hardcoded workspace
    // if (!watsonAssistant || !jsonFile) throw "Programm is missing a business Skill File or Skill valid  skill connection"
    if (jsonFile) {
        console.log("Getting intents from local file")
        let intentsRes = jsonFile.intents;
        for (i in intentsRes) {
            arrIntentLists.push(intentsRes[i]['intent']);
            // console.log("pushed " + intentsRes[i]['intent'] + " to array");
        };
        // console.log(arrIntentLists);
        resolve(arrIntentLists); //Try resolving the actuall arrList
        return;
    }

    params = { workspaceId: process.env.WS2_WATSON_WORKSPACE_ID }; //Gets intents from business skill
    // console.log(`params says: ${params.workspaceId}`);
    watsonAssistant.listIntents(params)
        .then(res => {
            let intentsRes = res.result.intents;
            for (i in intentsRes) {
                let intentName = intentsRes[i]['intent'];
                if (intentName) {
                    arrIntentLists.push(intentName);
                    // console.log("pushed " + intentsRes[i]['intent'] + " to array");
                } else {
                    console.log("unknown intent: " + JSON.stringify(intentName));
                }
            };
            console.log("All intents retrieved from business and pushed to array!");
            resolve(arrIntentLists); //Try resolving the actuall arrList
        })
        .catch(err => {
            console.log(err);
            error(error);
        });
});



module.exports = { getAssistant, getWatsonResponse, getIntentExamples, getAllIntents };