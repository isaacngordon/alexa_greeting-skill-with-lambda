'use strict mode';

//include http module for API access
var http = require('http');

/*
event is the request object of the event.json file
context will communicate with the lambda service. It has "success" and "fail"
*/
try{
    exports.handler = function(event, context){
        var request = event.request;
        /*
        request.types
        1) LaunchRequest: no intents or slots, generally followed by a welcome message
        2) IntentRequest: whenever a command is uttered, follwed by a function action and then response to the user
        3) SessionEndedRequest: what to do at then end of the session, ie the cleanup on exit
        */
    
        //if a launch request, welcome the user. usually will end with a question
        if(request.type === "LaunchRequest"){
            //create options object, using let because we only need it locally
            let options = {};
            options.speechText = "Welcome to Greetings Skill, made from a tutorial. You can greet your friends using this skill. Who would you like to greet?";
            options.repromptText = "Whom do you want to greet? Example: Say hello to John.";
            options.endSession = false;
    
            //pass it to succeed context
            context.succeed(buildResponse(options));
    
        //if intent request, map to correct intent
        } else if(request.type === "IntentRequest"){                                //if there is an IntentREquest
            let options ={};                                                        //create options Object
            
            if(request.intent.name === "HelloIntent"){                              //if intent is HelloIntent
                let name = request.intent.slots.FirstName.value;                    //get the value fo the guest's firstname
                options.speechText = `Hello <say-as interpret-as="spell-out">${name}</say-as> ${name}. `;                         //set the greeting
                options.speechText += getWish();                                    //with the correct wish
                
                //concat a quote to the speechText
                getQuote(function(quote,err) {
                    if(err){
                        context.fail(err);                                          //try-catch will not cathc teh async error, so use context
                    } else {
                        options.speechText += quote;
                        /* move the below into the callback function bc otherwise it will be 
                        elcuded due to the async nature of the function */
                        options.endSession = true;                                  //set endSession to true so the session will end after
                        context.succeed(buildResponse(options));                    //say success and build response 
                    }//ifelse
                });//getQuote
                
            }else throw "Unknown Intent";    //context.fail("Unknown Intent");
    
        //if end request, clean up
        } else if(request.type === "SessionEndedRequest"){
    
        //else fail and tell user
        } else throw "Unknown intent type called."; //context.fail("Unknown intent type called."); 
    
    };//handler
} catch(e){
    console.log("Exception: " + e);
}//try-catch

//gets the time of day to decide whether to say "good morning" or "good evening"
function getWish(){
    var myDate = new Date();                        //native date object
    var hours = myDate.getUTCHours();               //gets standard hours in the timezone
    console.log(hours + " hours");
    if(hours < 0) hours+=24;                        //if less than 24 add 24
    hours -= 5;                                     //from UTC to EST

    //distinguish if its morning or night and print the correct message
    if(hours < 12){                             
        return 'Good Morning';
    }
    else if (hours < 17){
        return 'Good Afternoon. ';
    }
    else return 'Good Evening. ';
}//getWish

//this function gets a random quote from an API
function getQuote(callback){
    //open api link
    var url = "http://api.forismatic.com/api/1.0/json?method=getQuote&lang=en&format=json";
    var req = http.get(url, function(res){
        var body = '';
        
        //on data event, read chunk of data to body onject
        res.on('data', function(chunk){
            body+= chunk;
        });

        //on end event, parse the JSON data from the api url
        res.on('end', function(){
            body = body.replace(/\\/g,'');              //the JSON has extra escpae charachters that we need to remove globally
            var quote = JSON.parse(body);               //parse the JSON object
            callback(quote.quoteText);                  //we only want the quoteText field
        });
    });

    //on error event, call the callback function
    req.on('error', function(err){
        callback('', err);
    });
};


//forms a response based on the properties of the options object
function buildResponse(options){
    var response = {
        version : "1.0",
        response: {
            outputSpeech: {
              //type: "PlainText",
              //text: options.speechText
              type: "SSML",
              text: "<speak>"+options.speechText+"</speak>"
            },
            /*
            we will not be using a card yet
            card: {
              type: "Simple",
              title: "Greetings",
              content: "Welcome to Greetings skill."
            },
            
            reprompt text is we want to keep the session open, and we check to see if
            this property exists so we know whether or not to close. It will not exist
            for this application so we will keep it commented out
            
            reprompt: {
              outputSpeech: {
                type: "PlainText",
                text: "Whom you want to greet?"
              }
            },
            */
            shouldEndSession: options.endSession
        }//resposes
    };//responseObject

    if(options.repromptText){
        response.response.reprompt = {
            outputSpeech: {
                //type: "PlainText",
                //text: options.repromptText
                type: "SSML",
                text: "<speak>"+options.repromptText+"</speak>"
              }
        };
    };//if

    
    return response;
}