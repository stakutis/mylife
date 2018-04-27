

'use strict';
const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const request = require('request');

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;


const HELP_MESSAGE = 'You can say tell me a space fact, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

/* These global will later be automatically loaded-from the DynamoDB database */
/**
 * "contact" is general contact info for any entity (cell, email, fullname)
 * "core" is general info about a human (gender, DoB, first/lastName, street, city, state, zip)
 * "frequency" Once, EachTime, Daily, TwiceWeek, Weekly, Monthly
 * **/

let
  MyLife_Organizations = [
    {
      "ID": "24hourscare",
      "contact": {
        "cell": "6177920500",
        "email": "collins@24hourscare.com",
        "name": "Collins Emerhi"
      },
      "webite": "www.24hourscare.com"
    },
    {
      "ID": "ConcordSoftware",
      "contact": {
        "cell": "9787643488",
        "email": "chris.stakutis@gmail.com",
        "name": "Chris Stakutis"
      },
      "webite": "www.concordsoftwareandexecutiveconsulting.com"
    }
    ];
    
let MyLife_Caregivers = [
    {
      "ID": "3488",  /* The caregiver select because they need to remember it*/
      "code": "3488",/* pass-code that the 'setup' uses to verify them */
      "contact": {
        "cell": "9787643488",
        "email": "chris.stakutis@gmail.com",
        "firstName": "Chris",
        "lastName": "Stakutis"
      }
    },
    {
      "ID": "3489",  /* The caregiver select because they need to remember it*/
      "code": "3489",/* pass-code that the 'setup' uses to verify them */
      "contact": {
        "cell": "9787643488",
        "email": "chris.stakutis@gmail.com",
        "firstName": "Chris",
        "lastName": "Stakutis"
      }
    }
  ];

let MyLife_Subjects = [
    {
      "ID": new Date().toISOString(),  /* Index */
      "caregiverID": "3488",           /* Index */
      "deviceID" : null, //"amzn1.ask.device.AFPBT6VKYQO7KV6ZSFSL5P5JF2RHS47KMNJJIAXZWKXZOFSVSNJRCHQXVUSOVE7WLLH4QPHHJKBW4YZBKBJGH5OVBKKNUQP4C424UKFFTBPVZNWT4DZLECTHYYLL533XJ6K4JI473MKXMDBBG4WHNWGTVK4A",
      "contact": {  /* These are relatively static */
        "cell": "1112223333",
        "email": "vin@heaven.com",
        "firstName": "Richard",
        "lastName": "Smith",
        "zipcode": "01742"
      },
      "core": {  /* These are relatively static */
        "DoB": "Full ISO time",
        "gender": "M",
        "healthConditions": [ ],  /* Diabetes, ... */
        "medications": [
              {
                "name":"Aspirin",
                "sideEffects": "Bloating, mental anquish"
              },
              {
                "name":"Tylenol",
                "sideEffects": "Mood swings, strange happiness"
              },
              {
                "name":"Jelly beans",
                "sideEffects": "Stomache ache, soreness"
              }
            ],
        "interests": {
        "hobbies": ["golf","crossword","puzzles"],
        "religion": ["christian","catholic"],
        "sports": {
          "baseball": [
            "redsox",
            "yankees"
          ],
          "hockey": [
            "bruins"
          ]
        }
      }
      },
      "interactions" : {
        /*
        Their messages (always)
        Ask about medication side effects (per freq)
        Surveys (as-scheduled)
        Reminders (per freq)
        */
        "messages": [
          {
            "from": "Sally",
            "msg": "I hope you have a fantastic week!"
          },
          {
            "from": "Joe",
            "msg": "Dont forget to call Penny on her birthday this week."
          },
          {
            "from": "Peter",
            "msg": "I got an A on my math test!"
          }
        ],
        "sideEffects": { 
          "frequency":"always",
          "whichOne":"random1" /* or "all" */
        },
        "completedSurveys" : [ ],  // .name, response, date
        "completedSideEffects": [ ],  // { } .date, .medication, .sideEffect
        /**
         * .completedDate
         * .survey (name)
         * .answers [" "," "... ]
         * **/
        "surveys" : [
            {
              "name" : "TodaysFeelings",
              "frequency": "always",
              "questions": [
                {
                  "question": "Tell me how you are feeling right now compared to yesterday. "+
                              "Would you say SAME, BETTER, or WORSE?",
                  "expected": "same,better,worse",
                  "responseAck":"Ok.,That's great.,Oh, sorry you feel that way.",
                  "lastCompletedDate": null,
                },
                {
                  "question": "Is today rainy?",
                  "expected": "yes,no",
                  "responseAck":"Too bad!,That's good.",
                  "lastCompletedDate": null,
                },
              ]
            },
            {
              "name" : "TomorrowsFeelings",
              "frequency": "always",
              "questions": [
                {
                  "question": "Will you go for a walk tomorrow?",
                  "expected": "yes,no",
                  "responseAck":"That's great.,Oh... sorry you won't walk yourself to good health!",
                  "lastCompletedDate": null,
                },
              ]
            },
          ],
        "reminders": {
          "frequency":"always",
          "whichOne":"random1", /* or "all" */
          "selections": [
            "Dont forget to go for a walk today.",
            "Please take your medications on schedule.",
            "Be careful in the snow!",
            "Be sure to eat all of your dinner.",
            "Your family loves you; think about that."
            ]
        }
      },
    },
    {
      "ID": new Date().toISOString(),
      "caregiverID": "3488",
      "deviceID" : null,
      "contact": {
        "cell": "9787643488",
        "email": "chris.stakutis@gmail.com",
        "firstName": "Chris",
        "lastName": "Stakutis",
        "zipcode": "01742"
      },
    }    
  ];

function updateSubjectAttributeOnly(self, ID, data, attribute, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient();
  console.log('updateSubjectAttributeOnly: ',ID, ' attr:',attribute);

  console.log('reading items from Subjects DynamoDB table');
  const params = {
        TableName: 'MyLife_Subjects',
        Key: {"ID":ID},
        UpdateExpression: "set "+attribute+" = :r",
        ExpressionAttributeValues: { ":r":data},
        ReturnConsumedCapacity: "TOTAL"
  };
  console.log('...params:',params);
  docClient.update(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        }
        nextFunction(self, err, data.Item);
    });  
}

function updateSubjectDB(self, subject, nextFunction) {
    let docClient = new AWS.DynamoDB.DocumentClient();
    console.log('updateSubjectDB: ',subject.ID);    
    let params = {
	TableName : "MyLife_Subjects",
	Item : subject
    };
    docClient.put(params, (err,data) => {
	if (err) {
	    console.log("!!!! Error updating subject table:",err);
	}
	nextFunction(self, err, data);
    });
}

    
function findUsersForSubject(self, subjectID, nextFunction) {
    console.log('findUsesrForSubject: ',subjectID);

    var docClient = new AWS.DynamoDB.DocumentClient();
    console.log('reading items from Subjects DynamoDB table');
    const params = {
        TableName: 'MyLife_Users',
        FilterExpression: '#subjectIDName = :subjectID ',
        ConsistentRead: false,
        ExpressionAttributeNames: {
            '#subjectIDName': 'subjectID'
        },
        ExpressionAttributeValues : {
            ':subjectID': subjectID
        },
        ReturnConsumedCapacity: "TOTAL"
    };
    console.log('scanning with params:',params);
    docClient.scan(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        } 
        nextFunction(self, err, data.Items);
    });  

    return null;
}

function findSubjectByDeviceID(self, deviceID, nextFunction) {
  console.log('findSubjectByDeviceID: ',deviceID);

  var docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
        TableName: 'MyLife_Subjects',
        FilterExpression: '#deviceIDName = :deviceID ',
        ConsistentRead: false,
        ExpressionAttributeNames: {
          '#deviceIDName': 'deviceID'
        },
        ExpressionAttributeValues : {
          ':deviceID': deviceID
        },
        ReturnConsumedCapacity: "TOTAL"
  };
  docClient.scan(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        }
        nextFunction(self, err, data.Items);
    });  

  return null;
}

function findSubjectByID(self, ID, nextFunction) {
  console.log('findSubjectByID: ',ID);

  var docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
        TableName: 'MyLife_Subjects',
        FilterExpression: '#deviceIDName = :deviceID ',
        Key: { ID: ID },
        ConsistentRead: false,
        ReturnConsumedCapacity: "TOTAL"
  };
  docClient.get(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        } 
        nextFunction(self, err, data.Item);
    });  

  return null;
}


/*
  getRealSlotValue returns:
    {
        status: "BadDataStructure", "UnknownSlot", "SlotNotSet"
                "TrueValue", "MatchedValue", "SpokenValue"
        value : could be 'null' IF no default and no derived value.
                TrueValue and Matchedvalue mean that what the user said
                was *either* the defined word/slottype for the slot OR
                it was a synonym (and we'll return the *defined* value);
                else it was a "spoken" word and status will be SpokenValue
                and below will be 'TRUE'; sometimes we want their best-effort
                spoken words, other times we want to insist it is a direct match.
        unmatchedValue: boolean;  FALSE if any of the bad values OR Spoken value used
    }
    
    Cases:
      SlotType is an AMAZON.* and is specified:
        status="TrueValue", value=".value", unmatchedValue = FALSE
      SlotType is a word(s) list AND matches one specified:
        status="MatchedValue", value=[].value, unmatchedValued = FALSE
      SlotType is a word(s) list and unmatched in the word list:
        status="SpokenValue", value=".value", unmatchedValue = TRUE !!
      If BadDataStructure or UnknownSlot or SlotNotSet:
        status= status, value=default, unmatchedValue=TRUE
*/
function getRealSlotValue(self, whichSlot, defaultValue) {
    // console.log('getRealSlotValue: slot:',whichSlot);
    if (defaultValue == undefined) defaultValue = null;
    let ret={status:"MatchedValue", value:defaultValue, unmatchedValue:false};
    
    while (true) {
        // Check first for gross data-struct errors
        if (!self || !whichSlot || ! self.event 
            || !self.event.request
            || !self.event.request.intent
            || !self.event.request.intent.slots) {
                console.log('Missing something!');
                ret.unmatchedValue=true;
                ret.status="BadDataStructure";
                break;
            }
        let slots=self.event.request.intent.slots;
        // Similar, see if the caller asked for an unspecified slot
        if (!slots[whichSlot]) {
            //console.log('Unspecified slot!',whichSlot);
            ret.unmatchedValue=true;
            ret.status="UnknownSlot";
            break;
         }
         
	// STAKUTIS Friday 4/28/2018; Below. This seems always to be the right choice
        ret.value = slots[whichSlot].value;
        break;


         // Ok, either we have something like an AMAZON.*
         // in which case we dont have resolutions BUT we have
         // a real top-level value OR we have resolutions
        if (!slots[whichSlot].resolutions) {
          //console.log('No resolutions for slot ',whichSlot);
          if (slots[whichSlot].value == undefined) {
              // Alexa gave us a slot, but no data in it at all
              // meaning the user didn't hit that slot
            ret.status="SlotNotSet";
            ret.unmatchedValue=true;
            //console.log(' user didnt specify any value for this slot ',whichSlot);
            break;
          }
          //console.log('Using value alone because no resolutions:',slots[whichSlot].value);
          ret.status="TrueValue";  // Likely an AMAZON.* type of thing
          ret.value=slots[whichSlot].value;
          break;
        }
        
        // Ok, we're here because we have 'resolutions' and not a direct value
        // console.log(' using resolutions for slot:',whichSlot);
        // Now, check the status match value; if ER_SUCCESS_NO_MATCH then use the .value slot top level
        if (slots[whichSlot].resolutions.resolutionsPerAuthority[0].status.code == "ER_SUCCESS_NO_MATCH") {
          //console.log('WARNING: NO MATCH; using input .value');
          ret.value = slots[whichSlot].value;
          ret.unmatchedValue = true;
          ret.status = "SpokenValue";
          break;
        }
        
        // We're here because we have a slot, it has resolutions, and is is ER_SUCCESS
        var valueRecord=slots[whichSlot].resolutions.resolutionsPerAuthority[0].values[0];
        //console.log('We have resolutions AND ER_SUCCESS, valueRecord:',valueRecord);
        ret.value = valueRecord.value.name; 
        break;
    }
    console.log('getRealSlotValue of '+whichSlot+' returning:');
    console.log(ret);
    return ret;  
}

function dumpStuff(intent, self) {
//    console.log('**** INTENT: '+intent+' ****');
//    if (self.attributes) 
//        console.log('   attributes:',self.attributes);
        /*
    console.log("This keys:"+Object.keys(self));  // emit, event, attributes, context, response
    console.log("This.event keys:"+Object.keys(self.event)); // version,session,context,request
    console.log("*** YOUR DEVICE ID IS:"+self.event.context.System.device.deviceId);
    console.log("This.event.request keys:"+Object.keys(self.event.request));  // intent, dialogState...
    try {
        console.log("This.event.request.intent keys:"+Object.keys(self.event.request.intent)); // name, slots[]...
    } catch (e) {}
    console.log("This.event.session.attributes keys:"+Object.keys(self.event.session.attributes));
    console.log("This.event.session.user keys:"+Object.keys(self.event.session.user));
    console.log("Your USER ID IS:"+self.event.session.user.userId);
    */
    // 'context' has .System.device.deviceId
}

const RandomGetStartedMessages=[
    "We're off to the races!",
    "Enjoy the rest of the day.",
    "Remember, life is good.",
    "This was fun.",
    "Today is a good day.",
    "Thanx for using this tool."
    ];
    
const RandomGetGreatingMessages=[
    "Hello ",
    "Welcome back ",
    "Today is a good day ",
    "Let's get started "
    ];
    
function getRandom(ary) {
  return ary[Math.floor(Math.random() * ary.length)];
}

function getPrefix(self) {
  let prefix=self.attributes.prefix || '';
  self.attributes.prefix='';
  return prefix;
}

let RandomSideEffectStart = [
  "I see that you take ",
  "Because you take ",
  "Since you take "
  ];

function isTrue(word) {
  if ("yes,ya,yep,yeah,sorta,true,i do,okay,ok,o.k.,sure".indexOf(word.toLowerCase()) != -1)
    return true;
  return false;
}

function isFalse(word) {
  if (word.length > 1 && "no,nope,nah,false,none".indexOf(word.toLowerCase()) != -1)
    return true;
  return false;
}

function expect2Str(expect) {
    // remove bars
    let words = expect.split(',');
    for (let i=0; i<words.length; i++) words[i]=words[i].split('|')[0];
    return words.join(", ");
}

function handleReminders(self, subject, word) {
  let msg="";
  console.log('handleReminders: state:'+self.attributes.state);
   
  if (self.attributes.state == 'Start') {
      console.log(' ************* REMINDERS start **************');
      // Pick a random reminder and then add it to the prefix attribute
      msg = "You have the following reminder: ";
      msg += getRandom(subject.interactions.reminders.selections)+', ... ' ;
      self.attributes.prefix += msg;
      self.attributes.state = 'Start';
      self.attributes.skipReminders = true;
  }
}

function handleSurveys(self, subject, word) {
    let msg="";
    let survey,question;
    console.log('handleSurveys: state:'+self.attributes.state+' surveyIdx:'+self.attributes.surveyIdx+' qIdx:'+self.attributes.surveyQuestionIdx);
    word = word.value.toLowerCase().trim();

    if (self.attributes.state == 'Start') {
	console.log('*************** Surveys start **************');
	self.attributes.surveyQuestionIdx = 0;
	self.attributes.surveyIdx = 0;
	self.attributes.state = 'SurveyQuestion';
    }

    // Convenience variables...
    survey = subject.interactions.surveys[self.attributes.surveyIdx];
    question = survey.questions[self.attributes.surveyQuestionIdx];
    
    if (self.attributes.state == 'SurveyQuestion') {
	if (self.attributes.surveyQuestionIdx == 0) {
	    // build a new output record
	    self.attributes.surveyAnswers = { answers:[], survey:survey.name} ;
	    if (survey.startingMessage && !survey.announcedStartingMessage) {
		self.attributes.prefix += survey.startingMessage+', ... ';
		survey.announcedStartingMessage = true;
	    }
	}  
	self.attributes.state = 'SurveyAnswer';
	msg = question.question;
	console.log('     handleSurvey: Asking: '+msg);
	self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg, msg);
	return;
    }
    
    /* Must be in 'answer' state */

    /* Setup the 'expect' variable */
    let expect = survey.defaultExpect;
    if (!expect) expect = question.expect;
    if (!expect) expect = "";  // means take whatever they say

    // See if the expected responses are yes/no type and then allow flexibility
    if (expect == "yes,no" || expect == "yes, no") {
	if (isTrue(word)) word='yes';
	else if (isFalse(word)) word='no';
    }
    
    // Now, see if the 'word' is in the expected list
    let i;
    let list=expect.split(',');
    for (i=0; i < list.length; i++) {
	list[i]=list[i].trim();
	if (list[i].indexOf(word) != -1) break;
    }
    if (i >= list.length) {
	self.attributes.prefix += "I'm sorry, your response didn't match what I was expecting,"+
	    " I was expecting one of, "+expect2Str(expect)+"., ";
	self.attributes.state = 'SurveyQuestion';  // Completely re-ask the question
	console.log("    asking:"+self.attributes.prefix);
	self.emit("InteractionIntent");
	return;
    }
    
    console.log('Got an expected answer');
    self.attributes.surveyAnswers.answers.push(list[i]);
    
    // Let's now setup an Acknowledgement for the user
    let ack = survey.defaultAck;
    if (!ack) ack = question.responseAck;
    if (ack)
	try { self.attributes.prefix += ack.split(',')[i]+', '; 
	      console.log('Providing ack:'+self.attributes.prefix);
	    } catch (e) {
		console.log('Dang it, couldnt get the ack, e:',e);
	    }

    self.attributes.surveyQuestionIdx++;
    /*** See if we finished THIS survey ***/
    if (self.attributes.surveyQuestionIdx >= 
	subject.interactions.surveys[self.attributes.surveyIdx].questions.length) {
	console.log("Finished this questionairre");
	self.attributes.surveyAnswers.completedDate = 
	    survey.lastCompletedDate = new Date().toISOString();
	self.attributes.surveyIdx++;
	self.attributes.surveyQuestionIdx=0;
	if (!subject.interactions.completedSurveys)
	    subject.interactions.completedSurveys = [ ];
	subject.interactions.completedSurveys.push(self.attributes.surveyAnswers);
	updateSubjectAttributeOnly(self, 
				   subject.ID,
				   subject.interactions.completedSurveys,
				   "interactions.completedSurveys", (self, err, data) => {
				       if (err) self.attributes.prefix += "ERROR saving to database! ";

				       /** Invoke library is specified **/
				       if (survey.library) {
					   if (survey.library.charAt(0) != '/' )
					       survey.library = "./"+survey.library;
					   let library=require(survey.library);
					   console.log("Got library:",library);
					   library.handleCompletion(self, subject, survey, self.attributes.surveyAnswers);
				       }

				       /*** Lets see if we're all done with all surveys ***/
				       if (self.attributes.surveyIdx >= subject.interactions.surveys.length) {
					   console.log("Finished all surveys! Current completed is:",subject.interactions.completedSurveys);
					   self.attributes.state = 'Start';
					   self.attributes.prefix += "Completed all the surveys! ";
					   self.attributes.skipSurveys = true;
					   console.log("     Saying:"+self.attributes.prefix);
					   self.emit("InteractionIntent");
					   return;
				       }

				       /*** Go on to the next survey **/
				       self.attributes.prefix += "You finished this survey. Let's start another one. ";
				       console.log('About to start next survey, idx:'+self.attributes.surveyIdx);
				       self.attributes.state = 'SurveyQuestion';
				       console.log("     Saying:"+self.attributes.prefix);
				       self.emit('InteractionIntent');  
				       return;
				   });
	return;
    }

    self.attributes.state = 'SurveyQuestion';
    console.log("     Saying:"+self.attributes.prefix);
    self.emit('InteractionIntent');  
}

function handleSurveys_SAVE(self, subject, word) {
    let msg="";
    console.log('handleSurveys: state:'+self.attributes.state+' surveyIdx:'+self.attributes.surveyIdx+' qIdx:'+self.attributes.surveyQuestionIdx);
    word = word.value.toLowerCase().trim();

    if (self.attributes.state == 'Start') {
	console.log('*************** Surveys start **************');
	self.attributes.surveyIdx = 0;
	self.attributes.surveyQuestionIdx = 0;
	self.attributes.state = 'SurveyQuestion';
    }
    
    if (self.attributes.state == 'SurveyQuestion') {
	if (self.attributes.surveyQuestionIdx == 0) {
	    // build a new output record
	    self.attributes.surveyAnswers = { answers:[], survey:subject.interactions.surveys[self.attributes.surveyIdx].name} ;
	}  
	self.attributes.state = 'SurveyAnswer';
	msg = subject.interactions.surveys[self.attributes.surveyIdx].questions[self.attributes.surveyQuestionIdx].question;
	console.log('     handleSurvey: Asking: '+msg);
	self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg, msg);
	return;
    }
    
    /* Must be in 'answer' state */
    // See if the expected responses are yes/no type and then allow flexibility
    let question = subject.interactions.surveys[self.attributes.surveyIdx].
	                questions[self.attributes.surveyQuestionIdx];
    if (question.question.indexOf('yes') != 0) {
	if (isTrue(word)) word='yes';
	else if (isFalse(word)) word='no';
    }
    
    // Now, see if the 'word' is in the expected list
    let i;
    let list=question.expected.split(',');
    // Hack, let's look for certain expected words and alter miss-speaks if necessary
    for (i=0; i < list.length; i++) {
	if (list[i]=='same' && (word=='send' || word=='saying')) word='same';
	if (list[i]=='worse' && (word=='horse')) word='worsee';
    }
    
    for (i=0; i < list.length; i++)
	if (word == list[i]) break;
    if (i >= list.length) {
	self.attributes.prefix += "I'm sorry, your response didn't match what I was expecting. ";
	self.attributes.state = 'SurveyQuestion';  // Completely re-ask the question
	console.log("    asking:"+self.attributes.prefix);
	self.emit("InteractionIntent");
	return;
    }
    
    console.log('Got an expected answer');
    self.attributes.surveyAnswers.answers.push(word);
    
    try { self.attributes.prefix += question.responseAck.split(',')[i]+' '; 
	  console.log('Providing ack:'+self.attributes.prefix);
	} catch (e) {
	    console.log('Dang it, couldnt get the ack, e:',e);
	}

    self.attributes.surveyQuestionIdx++;
    /*** See if we finished THIS survey ***/
    if (self.attributes.surveyQuestionIdx >= 
	subject.interactions.surveys[self.attributes.surveyIdx].questions.length) {
	console.log("Finished this questionairre");
	self.attributes.surveyAnswers.completedDate = 
	    subject.interactions.surveys[self.attributes.surveyIdx].lastCompletedDate = new Date().toISOString();
	self.attributes.surveyIdx++;
	self.attributes.surveyQuestionIdx=0;
	if (!subject.interactions.completedSurveys)
	    subject.interactions.completedSurveys = [ ];
	subject.interactions.completedSurveys.push(self.attributes.surveyAnswers);
	updateSubjectAttributeOnly(self, 
				   subject.ID,
				   subject.interactions.completedSurveys,
				   "interactions.completedSurveys", (self, err, data) => {
				       if (err) self.attributes.prefix += "ERROR saving to database! ";

				       /*** Lets see if we're all done with all surveys ***/
				       if (self.attributes.surveyIdx >= subject.interactions.surveys.length) {
					   console.log("Finished all surveys! Current completed is:",subject.interactions.completedSurveys);
					   self.attributes.state = 'Start';
					   self.attributes.prefix += "Completed all the surveys! ";
					   self.attributes.skipSurveys = true;
					   console.log("     Saying:"+self.attributes.prefix);
					   self.emit("InteractionIntent");
					   return;
				       }
				       /*** Go on to the next survey **/
				       self.attributes.prefix += "You finished this survey. Let's start another one. ";
				       console.log('About to start next survey, idx:'+self.attributes.surveyIdx);
				       self.attributes.state = 'SurveyQuestion';
				       console.log("     Saying:"+self.attributes.prefix);
				       self.emit('InteractionIntent');  
				       return;
				   });
	return;
    }

    self.attributes.state = 'SurveyQuestion';
    console.log("     Saying:"+self.attributes.prefix);
    self.emit('InteractionIntent');  
}


function handleMeds(self, subject, word) {
  let msg="";
  console.log('handleMeds: state:'+self.attributes.state);
   
  if (self.attributes.state == 'Start') {
      console.log('************** MEDS start **************');
      // Pick a random med and then ask if they have symptoms
      let idx = Math.floor(Math.random() * subject.core.medications.length);
      
      // First, if the selected med doesn't have a side-effects list, then we'll
      // skip doing this
      if (!subject.core.medications[idx].sideEffects ||
          subject.core.medications[idx].sideEffects=="") {
            self.attributes.skipMeds = true;
            self.emit('InteractionIntent');  // Just come back to our evaluator
            return;
          }

      msg = "Let's check for any side effects of your medications. ";
      msg += getRandom(RandomSideEffectStart)+subject.core.medications[idx].name+', today do you have any of these conditions: '+
        subject.core.medications[idx].sideEffects+'?';
      self.attributes.medicationName = subject.core.medications[idx].name;
      self.attributes.medicationSideEffects = subject.core.medications[idx].sideEffects;
      self.attributes.state = 'MedsResponse';
      self.attributes.skipMeds = false;
      console.log("     Saying:"+msg);
      self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg,"Please say yes or no.");
      return;
  }

  if (self.attributes.state == 'MedsResponse') {
    if (isTrue(word.value)) {
      console.log('handleMeds: Subject said yes to side effect');
      if (!subject.interactions.completedSideEffects) subject.interactions.completedSideEffects = [];
      subject.interactions.completedSideEffects.push({
        date : new Date().toISOString(),
        medication : self.attributes.medicationName,
        sideEffects: self.attributes.medicationSideEffects 
      });
      updateSubjectAttributeOnly(self, subject.ID, 
				 subject.interactions.completedSideEffects, 
				 "interactions.completedSideEffects", (self, err, data) => {
				     msg = "";
				     if (err) msg += "ERROR writing to database! ";
				     msg += "Oh goodness, I'm sorry to hear that. Would you like me to tell someone in your care circle?";
				     self.attributes.state = "MedsCareCircleResponse";
				     console.log("     Saying:"+self.attributes.prefix);
				     self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg,'Please say yes or no.');
				 });
      return;
    }
    console.log('handleMeds: Subject said NO to side effect');
    msg += getRandom(["That's great! ","Super. ","Thanx. ","Ok. "]);
  }

  if (self.attributes.state == 'MedsCareCircleResponse') {
    if (isTrue(word.value))
      msg += "Ok, I will tell someone in your care circle. ";
    else
      msg += "Oh, ok, I do hope you feel better! ";
  }
  
  self.attributes.state = "Start";
  //msg += "Ready to continue?";
  self.attributes.skipMeds = true;
  self.attributes.prefix += msg;
  console.log("     Saying:"+self.attributes.prefix+msg);
  self.emit('InteractionIntent');
  //self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg,"Please say yes or no.");
  
  return;
}


function handleSendMessage(self, subject, word) {
    console.log('handleSendMessage: state:'+self.attributes.state);

    if (self.attributes.state == 'Start') {
	console.log('*************** SendMessage start; get user-list of this patient/subject ************');
	self.attributes.skipSendMessage = true;
	findUsersForSubject(self, subject.ID, (self, err, data) => {
            let msg="";
            if (!self.attributes.users) msg+="Would you like to send a message to someone in your care circle? ";
	    if (self.attributes.secondTry) 
		self.attributes.prefix += 'Hmmm. Sometimes names are hard for me to understand. Instead, please say one of the following numbers, or NO.';
            else msg +=" You can say, No ";
            self.attributes.users = data;
            if (err) return self.emit(':tell',"Error from database:"+err);
            if (!data.length) {
		// no users found so dont bother the patient
		return self.emit('InteractionIntent');
            }
            for (let i=0; i < data.length; i++) {
		if (self.attributes.secondTry)
		    msg += ', Say '+(i+1)+' for '+data[i].contact.firstName;
		else
		    msg+=", or "+data[i].contact.firstName;
	    }
            self.attributes.state = 'SendMessageGetUser';
	    console.log("     Saying:"+self.attributes.prefix+msg);
            self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg,msg);
	});
	return;
    }

    if (self.attributes.state=="SendMessageGetMessage") {
	self.attributes.state = 'Start';
	console.log('will send to user: ',self.attributes.sendTo,' msg:',word.value);
        request.post("https://api.twilio.com/2010-04-01/Accounts/AC6203fa66f81b40708bbc4810c28fe049/Messages",
		     { 
			 body: "&From=+16179968873&To="+self.attributes.sendTo+",&Body="+subject.contact.firstName+" says: "+word.value,
			 headers: {'content-type' : 'application/x-www-form-urlencoded'},
			 auth: {
			     'user': 'AC6203fa66f81b40708bbc4810c28fe049',
			     'pass': '6866b679dd68e09efb537d43cc5f6dba'
			 }
		     },
		     (err, resp, body) => {
			 if (err) self.attributes.prefix += "Message failed:"+err+" ";
			 else self.attributes.prefix+="Message sent. ";
			 console.log("     Saying:"+self.attributes.prefix);
			 self.emit('InteractionIntent');
		     }
		    );
        return;
    }
    
    if (self.attributes.state == 'SendMessageGetUser') {
	console.log('SendMessage: GetUser, got word:',word.value);
	self.attributes.state = 'Start';
	if (isFalse(word.value)) {
	    console.log('Got a NO response');
	    return self.emit('InteractionIntent');
	}
	
	self.attributes.state = 'Start';
	//
	// Try to find the user in the list
	//
	let users = self.attributes.users;
	let idx = -1;
	if (self.attributes.secondTry) {
	    idx=parseInt(word.value);
	    console.log('secondTry: Converting '+word.value+' to '+idx);
	    if (!idx) idx= -1;
	    else idx--;
	}
	else 
	    for (idx=0; idx < users.length; idx++)
		if (users[idx].contact.firstName.toLowerCase() == word.value) 
		    break;

	if (idx<0 || idx >= users.length) {
	    console.log('Couldnt find the user, will solict again...');
	    self.attributes.state = 'Start';
	    self.attributes.skipSendMessage = false;
	    self.attributes.secondTry = true;
	    //    self.attributes.prefix += "Sorry, I couldn't find the user "+word.value+". ";
	    self.emit('InteractionIntent');
	    return;
	}
	else {
	    console.log('Asking for the message to send...');
	    self.attributes.sendTo=users[idx].phone;
	    self.attributes.state="SendMessageGetMessage";
	    console.log("     Asking for SMS message");
	    self.emit(':elicitSlot','RandomWordSlot',
		      getPrefix(self)+' Tell me the message for '+users[idx].contact.firstName+'; keep it short please.',
		      'Please offer a short message to send to '+word.value);
	    return;
	}
    }
}

function isAQuestion(msg) {
    console.log('isAQuestion ['+msg+']');
    msg = msg.trim().toLowerCase();
    if (msg.slice(-1)=='?') return true;
    if (msg.indexOf('do')!=-1) return true;
    if (msg.indexOf('tell')!=-1) return true;
    if (msg.indexOf('what')!=-1) return true;
    if (msg.indexOf('how')!=-1) return true;
    if (msg.indexOf('are')!=-1) return true;
    if (msg.indexOf('will')!=-1) return true; 
    if (msg.indexOf('when')!=-1) return true;
    if (msg.indexOf('why')!=-1) return true;
    console.log('...is false');
    return false;
}

function handleMessages(self, subject, word) {
   console.log('handleMessages: state:'+self.attributes.state);
   
   if (self.attributes.state == 'Start') {
      console.log('************** MESSAGES start **************');
       let people={};
      let from="You have messages from ";
      let max=5;
       // Avoid stating a name multiple times
      for (let i=0; i < subject.interactions.messages.length && i < max; i++) 
        people[subject.interactions.messages[i].from]=true;
      let peopleArray=Object.keys(people);
      for (let i=0; i < peopleArray.length && i < max; i++) 
        from+=peopleArray[i] + ", ";
      from+=" Would you like to hear them now?";
      self.attributes.state = 'MessagesResponse';
      self.attributes.msgnum = -1;
      self.attributes.skipMessages = false;
       console.log('Asking if they want to hear their messages...');
      self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+from,"Please say yes or no.");
      return;
  }

  if (self.attributes.state == 'MessagesResponse') {
    console.log('MESSAGE Response for yes/no, got:'+word.value);
    if (!isTrue(word.value)) {
      self.attributes.state = 'Start';
      self.attributes.skipMessages = true;
      self.attributes.prefix += "That's fine "+subject.contact.firstName+", I'll save them for later; ";
      self.emit('InteractionIntent');
      return;
    }
    self.attributes.msgnum++;
    self.attributes.state = "MessagesSayMessage";
  }
  
    if (self.attributes.state == 'MessagesGetReply') {
	console.log('Using reply of:'+word.value+' .. sending SMS...');
        request.post("https://api.twilio.com/2010-04-01/Accounts/AC6203fa66f81b40708bbc4810c28fe049/Messages",
		     { 
			 body: "&From=+16179968873&To="+
			     subject.interactions.messages[self.attributes.msgnum].userPhone+
			     ",&Body="+subject.contact.firstName+" says: "+word.value,
			 headers: {'content-type' : 'application/x-www-form-urlencoded'},
			 auth: {
			     'user': 'AC6203fa66f81b40708bbc4810c28fe049',
			     'pass': '6866b679dd68e09efb537d43cc5f6dba'
			 }
		     },
		     (err, resp, body) => {
			 console.log('Result of sending sms:',err);
			 if (err) self.attributes.prefix += "Message failed:"+err+" ";
			 else self.attributes.prefix+="Message sent. ";
			 self.emit('InteractionIntent');
		     }
		    );
	self.attributes.state = 'MessagesSayMessage';
	self.attributes.msgreplied = true;
	return;
    }

    if (self.attributes.state == 'MessagesSayMessage') {
	console.log('In SayMessage...idx:'+self.attributes.msgnum);
	let msg="";
	if (self.attributes.msgreplied) 
	    self.attributes.msgreplied=false;
	else {
	    msg=subject.interactions.messages[self.attributes.msgnum].from + " says:, "+
		subject.interactions.messages[self.attributes.msgnum].msg + ", ";
	    console.log('MESSAGE We have a message to say');
	    if (isAQuestion(subject.interactions.messages[self.attributes.msgnum].msg) &&
	       subject.interactions.messages[self.attributes.msgnum].userPhone) {
		console.log('The message turns out to be a question, so solicit an answer');
		self.attributes.state = 'MessagesGetReply';
		self.emit(':elicitSlot','RandomWordSlot',
			  getPrefix(self)+msg,
			  "Please answer the question with a very short phrase or word.");
		return;
	    }
	}
	// Determine if this is the LAST message or there are more to go
	if (self.attributes.msgnum >= subject.interactions.messages.length - 1) {
            console.log('MESSAGES Stating the LAST message to the subject.');
            self.attributes.state = "Start";
            subject.interactions.messages = [];
            updateSubjectAttributeOnly(self, subject.ID, 
				       subject.interactions.messages, 
				       "interactions.messages",(self,err,data) => {
					   if (err) err+="ERROR writing database! ";
					   msg += "That's all your messages, ... ... ";
					   self.attributes.skipMessages = false;
					   self.attributes.prefix += msg;
					   self.emit('InteractionIntent');
				       });
            return;
	}
	msg+="Would you like to hear the next one?";
	console.log('MESSAGES Stating the next message to subject.');
	self.attributes.state = "MessagesResponse";
	console.log('Sending msg:'+msg);
	self.emit(':elicitSlot','RandomWordSlot',getPrefix(self)+msg,"Please say yes or no.");
	return;
    }
  console.log('MESSAGES unknown situation!');
  self.emit(':tell',"Messages have an unknown situation, state is "+self.attributes.state);
  return;
}

function handleSetup(self) {
    if (!self.attributes.setupState) {
	console.log('********* HandleSetup ****************');
        self.attributes.setupState = "start";
    }
    console.log('handleSetup: setupState:'+self.attributes.setupState);
    if (self.attributes.setupState == 'start') {
	console.log('Starting device setup; ask for device I.D. ...');
        self.attributes.setupState = 'getDeviceID';
        self.emit(':elicitSlot',"NumberSlot",
		  "Welcome to setup. What is your temporary device I.D.?",
		  "Please say your device I.D. number.");
	console.log('Request sent to alexa');
	return;
    }
    else
	if (self.attributes.setupState == 'getDeviceID') {
            self.attributes.setupDeviceID = getRealSlotValue(self, 'NumberSlot').value;
            console.log('Verifying temporary Device ID:'+self.attributes.setupDeviceID);
            findSubjectByDeviceID(self, self.attributes.setupDeviceID,(self2, err, data) => {
		if (err) {
		    self.emit(':tell',"Oh no, error accessing the database:"+err);
		    return;
		}
		if (!data.length) {
		    self.emit(':tell',"Your device I.D. number "+self.attributes.setupDeviceID+" is not known. Please start over.");
		    return;
		}
		// if (data.length > 1) {
		//   self.emit(':tell',"Detected multiple Subject accounts with that device I.D. of "+
		//     self.attributes.setupDeviceID+", please contact MyLife support.");
		//   return;
		// }
		let subject = data[0];
		subject.deviceID = self.event.context.System.device.deviceId;
		updateSubjectAttributeOnly(self, subject.ID, subject.deviceID, "deviceID",(self,err,data) => {
		    if (err) {
			self.emit(':tell',"ERROR updating database");
			return;
		    }
		    console.log('Set subject.deviceID to :'+subject.deviceID);
		    self.emit(':tell',"Thank you, you chose the patient "+subject.contact.firstName+
			      ". Setup is complete now, let the patient enjoy the application!");
		});
            });
	}
    else self.emit(':tell','Oh oh...I have no clue');
}

function handleLaunch(self, subject) {
    console.log('Launch event is asking the subject Are You Ready to kick-off the dialog');
    self.attributes.state = "Start";
    self.attributes.subject = subject;  // WARNING, this results in a full-copy when it comes back, NOT the reference
    let launchLibrary="./"+subject.libraries.launch;
    let launch=null;
    let launchMessage="";
    try {
	launch = require(launchLibrary);
	launchMessage = launch.launchMessage;
    } catch (e) {
	console.log("Not able to load launch library "+launchLibrary,e);
    }
    self.emit(':ask',getPrefix(self)+"..."+
	      getRandom(RandomGetGreatingMessages)+subject.contact.firstName+'! '+
	      launchMessage+' Are you ready?');
}

function copySubject(self, copyFromID) {
    console.log('copySubject: '+copyFromID+'; first GET the current subject.');
    findSubjectByDeviceID(self, self.event.context.System.device.deviceId, (self, err, data) => {
        if (err) {
            self.emit(':tell',"Ooops, trouble reading the database!");
            return;
        }
        if (!data || !data.length) self.emit(':tell',"I'm sorry, your Alexa device is not set up yet. " +
					     "Please ask your caregiver to say... Alexa ... ask My Life, configure now... ");
        else {
	    let subject=data[0];
            self.attributes.deviceId = self.event.context.System.device.deviceId;
            console.log("Retievd subject; now find the copyFrom subject");
	    findSubjectByID(self, copyFromID, (self, err,fromSubject) => {
		if (err) {
		    console.log('Error in find by id:',err);
		    self.emit(':tell',"Database error:"+err);
		    return;
		}
		if (!fromSubject) {
		    console.log('Could not find the From subject');
		    self.emit(':tell',"Sorry, that subject "+copyFromID+" was not found.");
		    return;
		}
		fromSubject.ID = subject.ID;
		fromSubject.deviceID = subject.deviceID;
		updateSubjectDB(self, fromSubject, (self, err, data) => {
		    if (err) self.attributes.prefix="ERROR writing to database!";
		    self.emit(':tell',getPrefix(self)+" Updated.");
		});
	    });
        }
    });

}

const handlers = {
    'LaunchRequest': function () {
        console.log('********* LauchRequest ***********');
        let subject=findSubjectByDeviceID(this, this.event.context.System.device.deviceId, (self, err, data) => {
          if (err) {
            self.emit(':tell',"Ooops, trouble reading the database!");
            return;
          }
          if (!data || !data.length) this.emit(':tell',"I'm sorry, your Alexa device is not set up yet. " +
              "Please ask your caregiver to say... Alexa ... tell My Life, configure now... ");
          else {
            self.attributes.deviceId = self.event.context.System.device.deviceId;
            console.log("Retievd subject:",data[0]);
            handleLaunch(this, data[0]);
          }
        });
    },
    'ActivateIntent': function () {
	dumpStuff('ActivateIntent', this);
	let word=getRealSlotValue(this,'RandomWordSlot');
	let words=word.value.split(' ');
	let result="";
	for (let i=0; i<words.length; i++) 
	    result+=words[i].charAt(0).toUpperCase() + words[i].substr(1);
	console.log('Activate itent:['+result+']');
	copySubject(this, result);
    },
    'SetupIntent': function () {
      dumpStuff('SetupIntent',this);  
      handleSetup(this);
    },
    'TestIntent': function () {
      let word=getRealSlotValue(this,'WordSlot');
	console.log('got word:'+word.value);
	this.emit(':elicitSlot','WordSlot',"Got: "+word.value,"ha ha");
	return;
	},
    'InteractionIntent': function () {
      let word, subject;
      dumpStuff('InteractionIntent',this);
      word=getRealSlotValue(this,'RandomWordSlot');
/*
	console.log('got word:'+word.value);
	this.emit(':elicitSlot','RandomWordSlot',"Just testing WordSlot, go again! I got:"+word.value,"ha ha");
	return;
*/
      subject=this.attributes.subject;
      if (!subject) {
        this.emit(':tell',"Oh dear, something went wrong and I can't find your device in our database.");
        return;
      }

      // If the 'word' is null it probably means the subject said something that matched the canned
      // utturances such as "yes" "yeah" "okay". This happens for-sure at the beginning of a session
      // because our Launch makes the subject say/answer "yes" to kick-off the dialog.
      if (word.value == null) {
          console.log('ATTENTION: InteractionIntent is assuming a yes/yeah/okay automatically');
          word.value = "yes";
      }

      // The 'Start' state means we're either just-starting a session OR we've completed 
      // some tasks and look for more things to do.  Find the next thing to do or say goodbye.
      if (this.attributes.state == 'Start') {
/*
        if (subject.interactions.surveys && subject.interactions.surveys.length && !this.attributes.skipSurveys)
          return handleSurveys(this, subject, word);
*/
/*
        if (!this.attributes.skipSendMessage)
          return handleSendMessage(this, subject, word);
*/
        if (subject.interactions.messages && subject.interactions.messages.length && !this.attributes.skipMessages)   
          return handleMessages(this, subject, word);
        if (subject.core.medications && subject.core.medications.length && !this.attributes.skipMeds)   
          return handleMeds(this, subject, word);
        if (subject.interactions.surveys && subject.interactions.surveys.length && !this.attributes.skipSurveys)
          return handleSurveys(this, subject, word);
        if (subject.interactions.reminders && subject.interactions.reminders.selections && subject.interactions.reminders.selections.length && !this.attributes.skipReminders)   
          handleReminders(this, subject, word);  // DONT return; this sets up the 'prefix' attribute, or not
        if (!this.attributes.skipSendMessage)
          return handleSendMessage(this, subject, word);
      }
      
      if (this.attributes.state.startsWith('SendMessage')) return handleSendMessage(this, subject, word);
      if (this.attributes.state.startsWith('Messages')) return handleMessages(this, subject, word);
      if (this.attributes.state.startsWith('Meds')) return handleMeds(this, subject, word);
      if (this.attributes.state.startsWith('Survey')) return handleSurveys(this, subject, word);

      console.log('InteractionIntent: Finished all tasks.');
      this.emit(':tell', getPrefix(this)+" That's all for today. "+RandomGetStartedMessages[Math.floor(Math.random() * RandomGetStartedMessages.length)] + 
                " Please come back soon "+subject.contact.firstName);
      this.attributes.state="";
    },
    
    'SessionEndedRequest': function () {
      console.log('***** SESSION END REQUEST ****************');
      // This means an ubrupt end like the subject walked away/time-out or an error on the Alexa side
      // Here is where we'd clean up anything we need to possibly like writing to the database
      // this.session.attributes and this.session.user.userId seem to be filled
    },

    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },

    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },

    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

let file='./test.js';
const test =require(file);

console.log("test:",test);

