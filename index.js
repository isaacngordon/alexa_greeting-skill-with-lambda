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

        //get session attributes
        var session = event.session;                //get session object    
        if(!event.session.attributes){              //if attributes property does not exist
            event.session.attributes = {};          //initialize it
        }//if

        /*
        request.types
        1) LaunchRequest: no intents or slots, generally followed by a welcome message
        2) IntentRequest: whenever a command is uttered, follwed by a function action and then response to the user
        3) SessionEndedRequest: what to do at then end of the session, ie the cleanup on exit
        */
    
        //if a launch request, welcome the user. usually will end with a question
        if(request.type === "LaunchRequest"){
            
            handleLaunchRequest(context);
    
        //if intent request, map to correct intent
        } else if(request.type === "IntentRequest"){                                //if there is an IntentRequest
            
            if(request.intent.name === "HelloIntent"){                              //if intent is HelloIntent
               
                handleHelloIntent(request, context);
                
            } else if(request.intent.name === "QuoteIntent"){
                
                handleQuoteIntent(request, context, session);

            } else if(request.intent.name === "NextQuoteIntent"){

                handleNextQuoteIntent(request, context, session);

            } else if(request.intent.name === "AMAZON.StopIntent" || request.intent.name === "Amazon.CancelIntent"){

                context.succeed(buildResponse({
                    speechText: "Good bye fool. ",
                    shouldEndSession: true
                }));

            } else throw "Unknown Intent";    //context.fail("Unknown Intent");
    
        //if end request, clean up
        } else if(request.type === "SessionEndedRequest"){
    
        //else fail and tell user
        } else throw "Unknown intent type called."; //context.fail("Unknown intent type called."); 
    
    };//handler
} catch(e){
    console.log("Exception: " + e);
}//try-catch

//Hanldes launch requests
function handleLaunchRequest(context){
    //create options object, using let because we only need it locally
    let options = {};
    options.speechText = "Welcome to Greetings Skill, made from a tutorial. You can greet your friends using this skill. Who would you like to greet?";
    options.repromptText = "Whom do you want to greet? Example: Say hello to John.";
    options.endSession = false;

    //pass it to succeed context
    context.succeed(buildResponse(options));
}//hanldeLaunchRequest

//handles requests to the HelloIntent
function handleQuoteIntent(request, context,session){
    let options = {};
    options.session = session;
               
    //concat a quote to the speechText
    getQuote(function(quote,err) {
        if(err){
            context.fail(err);                                          //try-catch will not cathc teh async error, so use context
        } else {
            options.speechText = quote +" \nDo you want to listen to another quote?";
            options.repromptText = "You can say one more or yes.";
            /* move the below into the callback function bc otherwise it will be 
             elcuded due to the async nature of the function */
            options.endSession = false;                                  //set endSession to true so the session will end after       
            options.session.attributes.fromQuoteIntent = true;           //note that we are coming from the quote intent
            context.succeed(buildResponse(options));                    //say success and build response 
        }//ifelse
    });//getQuote
}//handleQuoteIntent

//handles requests to the QuoteIntent
function handleHelloIntent(request, context){
    let options = {};
    let name = request.intent.slots.FirstName.value;                    //get the value fo the guest's firstname
    options.speechText = `Hello <say-as interpret-as="spell-out">${name}</say-as> ${name}. `;                         //set the greeting
    options.speechText += getWish();                                    //with the correct wish
                
 //   options.cardTitle = `Hello ${name}!`;

    //concat a quote to the speechText
    getQuote(function(quote,err) {
        if(err){
            context.fail(err);                                          //try-catch will not cathc teh async error, so use context
        } else {
            options.speechText += quote;
//            options.cardContent = quote;
//            options.imageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVgbwQWNU168tilN79DIiElBacmN8lZsGfsiKnwhDEtsI7YXD6cw";
            /* move the below into the callback function bc otherwise it will be 
            elcuded due to the async nature of the function */
            options.endSession = true;                                  //set endSession to true so the session will end after
            context.succeed(buildResponse(options));                    //say success and build response 
        }//ifelse
    });//getQuote
}//handleQuoteIntent

//handles requests to the NextQuoteIntent
function handleNextQuoteIntent(request, context, session){
    let options = {};
    options.session = session;
               
    if(options.session.attributes.fromQuoteIntent){
        //concat a quote to the speechText
        getQuote(function(quote,err) {
            if(err){
                context.fail(err);                                          //try-catch will not cathc teh async error, so use context
            } else {
                options.speechText = quote + " \n Want to hear another quote? ";
                options.repromptText = `You can say "yes" or " stop". `;
                /* move the below into the callback function bc otherwise it will be 
                elcuded due to the async nature of the function */
                options.endSession = false;                                  //set endSession to true so the session will end after       
                //options.session.attributes.fromQuoteIntent = true;         //not needed in this case
                context.succeed(buildResponse(options));                     //say success and build response 
            }//ifelse
        });//getQuote
    }//if FromQuoteIntent

    else {
        options.speechText = "Wrong invocation of the intent.";
        options.endSession = true;
    }
}//handleNextQuoteIntent

//gets the time of day to decide whether to say "good morning" or "good evening"
function getWish(){
    var myDate = new Date();                        //native date object
    var hours = myDate.getUTCHours();               //gets standard hours in the timezone
    console.log(hours + " hours");
    hours -= 5;                                     //from UTC to EST
    if(hours < 0) hours+=24;                        //if less than 24 add 24
 

    //distinguish if its morning or night and print the correct message
    if(hours < 12){                             
        return 'Good Morning. ';
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
              ssml: "<speak>"+options.speechText+"</speak>"
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

    //if options has a reprompt text then set it
    if(options.repromptText){
        response.response.reprompt = {
            outputSpeech: {
                //type: "PlainText",
                //text: options.repromptText
                type: "SSML",
                ssml: "<speak>"+options.repromptText+"</speak>"
              }
        };
    };//if
    
    /*
    Adding Card to the response
    */
    
    //see if there is a card in options to uild a card into the response
    if(options.cardTitle){
        response.response.card = {
            title: options.cardTitle,
            type: "Simple"
        };//card

        //if an image is in options, lets add it to the response card
        if(options.imageUrl){
            response.response.card.type = "Standard";                           //reset card type
            response.response.card.text = options.cardContent;                  //reset text with new card content
            response.response.card.image = {                                    //set image
                smallImageUrl: options.image,                                       //for smaller screens
                largeImageUrl: options.image                                        //for larger screens
            };//image
        }//if
        //else set static content
        else response.response.card.content = options.cardContent; 
    }//if

    if(options.session && options.session.attributes){
        response.sessionAttributes = options.session.attributes;
    }//if

    
    return response;
}