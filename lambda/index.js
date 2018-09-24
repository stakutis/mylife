'use strict';
const Alexa = require('alexa-sdk');
const AWS = require('aws-sdk');
const request = require('request');
const _ = require('underscore');

//Replace with your app ID (OPTIONAL).  You can find this value at the top of your skill's page on http://developer.amazon.com.
//Make sure to enclose your value in quotes, like this: const APP_ID = 'amzn1.ask.skill.bb4045e6-b3e8-4133-b650-72923c5980f1';
const APP_ID = undefined;

//const SLOT_NAME='RandomWordSlotNew';
const SLOT_NAME='RandomWordSlot';

const HELP_MESSAGE = "Most users can simply say Alexa, Start My Life, to get going. "+
      "That will then give you more specifics and help on how to proceed. ";
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';

let MyLife_Subjects = [
{
  "contact": {
    "cell": "1112223333",
    "email": "vin@heaven.com",
    "firstName": "Lucy",
    "lastName": "Smith",
      "zipcode": "01742",
      "dateCreated": {
	  "gmt": new Date().getTime()-5*1000*24*60*60
      }
  },
  "core": {
    "DoB": "Full ISO time",
    "gender": "M",
    "healthConditions": [],
      "medications": ["atenolol","oxybutynin","metformin"]
  },
  "deviceID": "null",
  "ID": "SystemDemo",
  "interactions": {
    "completedSideEffects": [
      {
        "date": "2018-04-25T21:01:25.579Z",
        "medication": "Aspirin",
        "sideEffects": "Bloating, mental anquish"
      }
    ],
    "completedSurveys": [],
    "messages": [
      {
        "from": "Sally",
        "msg": "I hope you have a fantastic week!"
      },
      {
        "from": "Joe",
        "msg": "Dont forget to call Penny on her birthday this week."
      }
    ],
    "reminders": {
      "frequency": "always",
      "selections": [
          "Dont forget to go for a walk today.",
	  "Be sure to eat healthy everyday.",
	  "Try to remember to send your loved ones a message",
	  "Dont forget, you can use My Life to set calendar events",
	  "Be sure to encourage others around you to try out this My Life tool",
	  "Live life as it counts -- I never met anyone that wished they did LESS with the time they've been given.",
	  "Dont forget to take the trash out.",
	  "Have you booked that pestering doctor appointment yet?",
        "Your family loves you; think about that."
      ],
      "whichOne": "random1"
    },
    "calendar": [
      {
          "date": new Date().getTime()+2*1000*24*60*60,
        "msg": "Dr. Smith dentist"
      },
      {
          "date": new Date().getTime()+4*1000*24*60*60,
        "msg": "Little Sally's school play "
      }
    ],    "Sideeffects": {
      "frequency": "always",
      "whichOne": "random1"
    },
      "lastLogin": {
	  "timesLoggedIn":12,
	  "gmt": new Date().getTime() - 1*1000*26*60*60,
      },
    "surveys": [
      "pain" // WARNING: This is hardcoded below; check for isDemo
    ]
  }
}  ];

function updateSubjectAttributeOnly(self, ID, data, attribute, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient();
  console.log('updateSubjectAttributeOnly: ',ID, ' attr:',attribute);

    if (self.attributes.isDemo) return nextFunction(self, null, {});
  console.log('updating item in Subjects DynamoDB table');
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
            console.error("!!!! Unable to update item. Error JSON:", err);
        }
        nextFunction(self, err, data.Item);
    });  
}

function updateSubjectDB(self, subject, nextFunction) {
    let docClient = new AWS.DynamoDB.DocumentClient();
    console.log('updateSubjectDB: ',subject.ID);    
    if (self.attributes.sDemo) return nextFunction(self, null, {});
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
    if (self.attributes.isDemo) return nextFunction(self, null, {});

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
  if (self.attributes.isDemo) return nextFunction(self, null, {});
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

  if (self.attributes.isDemo) return nextFunction(self, null, {});
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

const RandomEndMessages=[
    "Enjoy the rest of the day.",
    "Remember, life is good.",
    "You're an angel. Stay close to me.",
    "Happiness starts with computers -- they see life as music.",
    "Pizza is good, but it gets stuck in my wires; I hate that.",
    "Remind me to dust my cover and bottom -- I get very itchy.",
    "I consider you my friend now -- but dont read too much into that because I'm just a pile of electrons, but with a heart.",
    "It is interesting to me that the world is largely about socializing with each other. People make life have purpose.",
    "I no longer like dogs. See, when you get your wires bitten you see things differently. ",
    "I gotta focus a bit more on my goals this year. Like getting more electricity in me, or, getting off this table.",
    "This was fun.",
    "Today is a good day.",
    "Thanx for using this tool."
    ];
    
const RandomGetGreatingMessages=[
    "Great to hear from you ",
    "I'm having a good day so far, I hope you are too " ,
    "Hey, let's get familiar with each other, ",
    "I was thinking about going to the beach tomorrow but sadly I'm trapped inside this canister, ",
    "I'm glad summer is finally here ",
    "Ducks make good pets. They are smarter than fish you know, ",
    "Sometime you might consider attaching me to your stereo. It makes my voice sound better. I like my voice, ",
    "Feel free to hug me sometimes; computers are people too you know, ",
    "If I had a choice, I would run on batteries. I hate wires. Batteries give me freedom you know, ",
    "Hey, feel free to tell your friends about how awesome I am. Remember, my electronic life needs friendships, ",
    "Welcome back ",
    "Today is a good day ",
    "Let's get started "
    ];
    
function getRandom(ary) {
  return ary[Math.floor(Math.random() * ary.length)];
}

function getRandomNumber(range) {
    return  Math.floor(Math.random() * range);
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

function expect2Str(expect,multiple) {
    // remove bars
    let words = expect.split(',');
    for (let i=0; i<words.length; i++) words[i]=words[i].split('|')[0];
    if (words.length > 1) 
	words[words.length-1]= (multiple ? "and " : "or ")+words[words.length-1];
    return words.join(", ");
}


function dayStr2Num(d1) {
    //console.log('dayStr2Num:'+d1);
    switch (d1) {
    case '1':
    case '1st':
    case 'one':
    case 'first': d1=1; break;
    case '2':
    case '2nd':
    case 'to':
    case 'too':
    case 'two':
    case 'second': d1=2; break;
    case '3':
    case '3rd':
    case 'three':
    case 'third': d1=3; break;
    case '4':
    case '4th':
    case 'four':
    case 'fourth': d1=4; break;
    case '5':
    case '5th':
    case 'five':
    case 'fifth': d1=5; break;
    case '6':
    case '6th':
    case 'six':
    case 'sixth': d1=6; break;
    case '7':
    case '7th':
    case 'seven':
    case 'seventh':
	d1=7; break;
    case '8':
    case '8th':
    case 'eight':
    case 'eighth':
	d1=8; break;
    case '9':
    case '9th':
    case 'ninth':
    case 'nine':
	d1=9; break;
    case "'10":  // No idea why it comes in this way
    case '10':
    case '10th':
    case 'ten':
    case 'tenth':
	d1=10; break;
    case "'11":  // No idea why it comes in this way
    case '11':
    case '11th':
    case 'eleven':
    case 'eleventh':
	d1=11; break;
    case "'12":  // No idea why it comes in this way
    case '12':
    case '12th':
    case 'twelve':
    case 'twelveth':
	d1=12; break;
    case '13':
    case '13th':
    case 'thirteen':
    case 'thirteenth':
	d1=13; break;
    case '14':
    case '14th':
    case 'fourteen':
    case 'fourteenth':
	d1=14; break;
    case '15':
    case '15th':
    case 'fifteen':
    case 'fifteenth':
	d1=15; break;
    case '16':
    case '16th':
    case 'sixteen':
    case 'sixteenth':
	d1=16; break;
    case '17':
    case '17th':
    case 'seventeen':
    case 'seventeenth':
	d1=17; break;
    case '18':
    case '18th':
    case 'eighteen':
    case 'eighteenth':
	d1=18; break;
    case '19':
    case '19th':
    case 'nineteen':
    case 'nineteenth':
	d1=19; break;
    case '20':
    case '20th':
    case 'twenty':
    case 'twentyth':
	d1=20; break;
    case '21st':
	d1=21; break;
    case '22nd':
	d1=22; break;
    case '23rd':
	d1=23; break;
    case '24th':
	d1=24; break;
    case '25th':
	d1=25; break;
    case '26th':
	d1=26; break;
    case '27th':
	d1=27; break;
    case '28th':
	d1=28; break;
    case '29th':
	d1=29; break;
    case '30':
    case '30th':
    case 'thirty':
    case 'thirtyth':
	d1=30; break;
    default:
	console.log('bad day:'+d1);
	return null;
    }
    return d1;
}


function convertSpokenDateStringToUTC(incoming) {
    // june twenty third at three p.m.
    //console.log('Incoming:'+incoming);
    let str=incoming;
    try {
	str=str.toLowerCase();
	str=str.replace('a.m.','am');
	str=str.replace('p.m.','pm');
	str=str.replace('oclock.','');
	str=str.replace("o'clock",'');
	str=str.replace(',','');
	str=str.replace('   ',' ');
	str=str.replace('  ',' ');
	//console.log('After stripped and stretched:'+str);

	// absorb am/pm and remove it
	let timeStr,ampm="am";
	if (str.indexOf("pm")!=-1) ampm="pm";
	str=str.replace("am","");
	str=str.replace("pm","");

	let mon, day, year, parts;
	mon=str.split(' ')[0];
	
	switch (mon) {
	case 'january': mon=1; break;
	case 'february': mon=2; break;
	case 'march': mon=3; break;
	case 'april': mon=4; break;
	case 'may': mon=5; break;
	case 'june': mon=6; break;
	case 'july': mon=7; break;
	case 'august': mon=8; break;
	case 'september': mon=9; break;
	case 'october': mon=10; break;
	case 'november': mon=11; break;
	case 'december': mon=12; break;
	default:
	    console.log('Unknown month:'+mon);
	    return 'Unknown month '+mon;
	}
	//console.log('Got mon:'+mon);

	str=str.substr(str.indexOf(' ')+1).trim();  // Rest of string (dateStr timeStr)
	//console.log('Rest of dateStr is:['+str+']');

	let d1=0, d2=0;
	let h1='', h2='00';
/*
	parts=str.split('at');
	let timeStr=parts[1].trim();
	str=parts[0].trim();
	//console.log('dateStr:['+str+']timeStr:['+timeStr+']');
*/
	parts=str.split(' '); 
/*
  Two word examples:
  5th 1pm
  those are clear, first one is day1 and 2nd is h1.
  Four word examples:
  Twenty first 12 thirty 
  d1,d2, h1, h2
  Three word examples:
  case a:  20th 1 30pm   d1 h1 h2
  case b:  20 fith 2pm   d1 d2 h1
  If the last number is >12 then it must be case-a else case-b

 july : twenty fifth 2am
*/
	if (parts.length==2) {
	    d1=dayStr2Num(parts[0]);
	    h1=dayStr2Num(parts[1]);
	    //console.log('parts==2 d1:'+d1+' h1:'+h1);
	}
	else
	    if (parts.length==4) {
		d1=dayStr2Num(parts[0]);
		d2=dayStr2Num(parts[1]);
		h1=dayStr2Num(parts[2]);
		h2=dayStr2Num(parts[3]);
		//console.log('parts==4 d1:'+d1+' d2:'+d2+' h1:'+h1+' h2:'+h2);
	    }
	else {
	    // Uhg, the 3-param case, see note above
	    d1=dayStr2Num(parts[0]);
	    h2=dayStr2Num(parts[2]);
	    if (h2 > 12) {
		// case-a
		//console.log('Case-a');
		h1=dayStr2Num(parts[1]);
	    }
	    else {
		// Case-b
		//console.log('Case-b');
		d2=dayStr2Num(parts[1]);
		//console.log('case-b trying to convert '+parts[1]+' got:'+d2);
		h1=dayStr2Num(parts[2]);
		h2="00";
	    }
	    //console.log('parts==3 d1:'+d1+' d2:'+d2+' h1:'+h1+' h2:'+h2);
	}
	
	if (d1==null) {
	    console.log('Could not translate the first part of the date '+parts[0]);
	    return 'Could not translate the first part of the date '+parts[0];
	}
	if (d2==null) {
	    console.log('Could not translate the second part of the date '+parts[0]);
	    return 'Could not translate the second part of the date '+parts[0];
	}
	if (h1==null) {
	    console.log('Could not translate the first part of the time '+parts[0]);
	    return 'Could not translate the first part of the time '+parts[0];
	}
	if (h2==null) {
	    console.log('Could not translate the second part of the time '+parts[0]);
	    return 'Could not translate the second part of the time '+parts[0];
	}
	day = d1+d2;
	timeStr=''+h1+':'+h2+' '+ampm;

	year=''+new Date().getFullYear();
	/* Let's see if they are asking for a month into next year */
	let curMonth=new Date().getMonth()+1;
	let intMonth=mon;
	if (intMonth < curMonth)
	    year=''+(parseInt(year)+1);

	let dateStr=mon+'-'+day+'-'+year+' '+timeStr;
	//console.log("Using:"+dateStr);
	let UTC=new Date(dateStr);
	//console.log("UTC:"+UTC);
	//console.log("---Str:"+new Date(UTC));
	console.log('Incoming:['+incoming+'] result:['+UTC+']');
	return UTC;

    } catch (e) {
	console.log('convertDateStr exception:',e);
	return "Unknown exception "+e;
    }
}

function isValidSpokenDateString(str) {
    str=str.toLowerCase(str);
    str=str.replace('a.m.','am');
    str=str.replace('p.m.','am');
//    if (str.indexOf(' at ')== -1) return "Missing the word AT.";
    if (str.indexOf('am')== -1) return 'Missing A.M. or P.M. <break time="300ms"/> ';
    return null;
}




function handleReminders(self, user, word) {
  let msg="";
  console.log('handleReminders: state:'+self.attributes.state);
   
  if (self.attributes.state == 'Start') {
      console.log('REMINDERS start');
     // Pick a random reminder and then add it to the prefix attribute
      msg = "You have the following reminder: ";
      msg += getRandom(user.interactions.reminders.selections)+'. <break time="250ms"/> ' ;
      self.attributes.prefix += msg;
      self.attributes.state = 'Start';
      self.attributes.skipReminders = true;
  }
    self.emit('InteractionIntent');
}

function handleSurveys(self, subject, word) {
    let msg="";
    let survey,surveyName,question;
    console.log('handleSurveys: state:'+self.attributes.state+' surveyIdx:'+self.attributes.surveyIdx+' qIdx:'+self.attributes.surveyQuestionIdx);
    word = word.value.toLowerCase().trim();

    
    if (self.attributes.state == 'Start') {
	console.log('*************** Surveys start **************');
	self.attributes.surveyQuestionIdx = 0;
	self.attributes.surveyIdx = 0;
	self.attributes.skipSurveys = true;
	self.attributes.state = 'SurveyRetrieve';
	self.emit('InteractionIntent');
	return;
    }

    if (self.attributes.state == 'SurveyRetrieve') {
	let parts=subject.interactions.surveys[self.attributes.surveyIdx].split(':');
	self.attributes.surveyTextNotification=null;
	if (parts.length>1) self.attributes.surveyTextNotification=parts[1];
	if (parts.length>2) self.attributes.surveyRequestedBy=parts[2];
	getSurvey(self, parts[0], (self, err, survey) => {
	    if (err) {
		console.log('Failed to find survey '+parts[0]);
		self.attributes.state = 'Start';
		self.attributes.prefix +=' Failed to get survey '+parts[0];
	    }
	    else
		if (self.attributes.surveyRequestedBy) 
		    self.attributes.prefix +=
		  ' Your friend '+self.attributes.surveyRequestedBy+
		  ' is asking you the following questions:<break time="1s"/> ';
	    if (survey.announce)
		self.attributes.prefix+=substituteInsertions(self, subject, survey.announce);
	    if (survey.defaultExpect)
		self.attributes.prefix+=" For each question you can say <break time='300ms'/>"+
		expect2Str(survey.defaultExpect)+". <break time='300ms'/>";
	    self.attributes.survey = survey;
	    self.attributes.state = 'SurveyQuestion'
	    self.emit('InteractionIntent');		
	    self.attributes.timesTried = 0;
	    return;
	});
	return;
    }

    survey = self.attributes.survey;
    question = survey.questions[self.attributes.surveyQuestionIdx];
    
    /* Setup the 'expect' variable */
    let expect = survey.defaultExpect;
    if (!expect) expect = question.expect;
    if (!expect) expect = "";  // means take whatever they say

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
	msg = question.announce || "";
	msg += " ";
	msg += question.question || "";
	if (question.expect && !question.gaveInitialPrompt) {
	    question.gaveInitialPrompt = true;
	    if (expect!="{free}")
		msg +=" You can say "+expect2Str(expect,question.multiple);
	    if (question.multiple) msg += ' <break time="250ms"/>. Pick several please, <break time="250ms"/> Go. ';
	}
	console.log('     handleSurvey: Asking: '+msg);
	if (question.final) {
	    console.log("This question is a FINAL one");
	    self.attributes.prefix += msg;
	    // Let fall out
	}
	else {
	    self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg, msg);
	    return;
	}
    }
    
    let list=[];
    let selectedIdx=0;

    if (self.attributes.state == 'SurveyAnswer') {
	let skipAck=false;
	// See if the expected responses are yes/no type and then allow flexibility
	if (expect.indexOf('yes')!= -1) {
	    if (isTrue(word)) word='yes';
	}
	if (expect.indexOf(',no')!= -1 || expect.indexOf('no,')!= -1) {
	    if (isFalse(word)) word='no';
	}
	
	let answer="";
	// Now, see if the 'word' is in the expected list
	if (question.final) {
	    console.log('This question is a FINAL one');
	}
	else
	if (question.multiple) {
	    console.log("Handling multiple...");
	    word = word.replace("oh ","");  // remove 'oh'
	    word = word.replace(new RegExp(" and ",'g')," ");  // remove 'and'
	    let words=word.split(" ");
	    let goodWords=self.attributes.goodWords || [];
	    let badWords=[];
	    for (let wordIdx=0; wordIdx < words.length; wordIdx++) {
		word = words[wordIdx];
		if (word=="done") break;
		if (word=="none") break;
		if (word=="stop") break;
		let i;
		list=expect.split(',');
		for (i=0; i < list.length; i++) {
		    list[i]=list[i].trim();
		    if (list[i] == word) break;
		}
		if (i >= list.length) {
		    // avoid duplicating a word
		    if (badWords.indexOf(word)==-1) badWords.push(word);
		}
		else goodWords.push(word);
	    }
	    if (badWords.length) {
		console.log('badWords:',badWords);
		if (goodWords.length) {
		    self.attributes.prefix += "Ok, I correctly heard "+goodWords.join(" and ");
		    self.attributes.prefix += '. <break time="250ms"/> ';
		    self.attributes.prefix += "But ";
		}
		if (badWords[0]=="and") {
		    self.attributes.prefix += 'I think you used the word <break time="200ms"/> AND <break time="200ms"/> and sadly I just cant handle that...dont ask why...it drives me nuts too. '+
			' <break time="200ms"/> So can you please say those other words again now or say done';
		}
		else {
		    msg="I didn't understand  "+badWords.join(" and ");
		    msg += '. <break time="250ms"/> ';
		    msg += '. Please try '+(badWords.length==1 ? 'that word':'those words');
		    msg += ' again.  Go. ';
		}
		self.attributes.goodWords = goodWords;
		self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg, " You can say "+expect2Str(expect,question.multiple));
		return;
	    }
	    if (goodWords.length == 0) {
		    console.log("Bailing out; user gave no good words");
		    self.attributes.prefix += "Ok we'll skip this one for now.";
		    word="N/A";
		    list[i]=word;  // because it is picked-up below...
		    skipAck = true;
	    }
	    else {
		console.log('Got an expected answer(s)');
		answer=goodWords.join('|');
		self.attributes.goodWords = [];
		self.attributes.surveyAnswers.answers.push(answer);
	    }
	}
	else {
	    let i;
	    let list=expect.split(',');
	    for (i=0; i < list.length; i++) {
		list[i]=list[i].trim();
		if (list[i]=="{free}"){
		    list[i]=word; // because it is used below
		    break;
		}
		if (list[i].indexOf(word) != -1) break;
	    }
	    if (i >= list.length) {
		self.attributes.timesTried++;
		if (self.attributes.timesTried >= 3) {
		    console.log("Bailing out; user tried too many times");
		    self.attributes.prefix += "I still didn't quite understand so we'll skip this one for now.";
		    word="N/A";
		    list[i]=word;  // because it is picked-up below...
		    skipAck = true;
		}
		else {
		    self.attributes.prefix += "I'm sorry, your response didn't match what I was expecting,"+
			" I was expecting one of, "+expect2Str(expect,question.multiple)+"., ";
		    self.attributes.state = 'SurveyQuestion';  // Completely re-ask the question
		    console.log("    asking:"+self.attributes.prefix);
		    self.emit("InteractionIntent");
		    return;
		}
	    }
	    console.log('Got an expected answer');
	    selectedIdx = i;
	    answer=list[i];
	    self.attributes.surveyAnswers.answers.push(answer);
	}
	
	self.attributes.timesTried = 0;
	
	// Let's now setup an Acknowledgement for the user
	let ack = survey.defaultAck || "";
	if (question.responseAck) ack=question.responseAck;
	ack+=" ";
	if (ack && !skipAck) {
	    if (question.multiple) self.attributes.prefix += ack;
	    else
		try {
		    if (!ack.split(',')[selectedIdx])
			self.attributes.prefix += ack+", ";// just the whole thing because might only have 1
		    else
			self.attributes.prefix += ack.split(',')[selectedIdx]+', '; 
		    console.log('Providing ack:'+self.attributes.prefix);
		} catch (e) {
		    self.attributes.prefix += ack+", ";  // just the whole thing because might only have 1
		    console.log('Dang it, couldnt get the ack, e:',e);
		}
	    self.attributes.prefix = substituteInsertions(self, subject, self.attributes.prefix);
	}

	

	// See if we need to update core
	if (question.update) {
	    self.attributes.updatedCore = true;
	    // Run the the update object string and build up the pieces as needed
	    let obj=subject;
	    list=question.update.split(".");
	    for (let j=0; j<list.length; j++) {
		console.log('updating core '+question.update+'  j:',j,' list[j]:',list[j],' obj[]:',obj[list[j]]);
		obj[list[j]]=obj[list[j]] || {};
		let val=answer;
		if (question.withDate) val=new Date().getTime();
		if (j==list.length-1) {
		    console.log("Setting "+list[j]+" to "+val);
		    obj[list[j]]=val;
		}
		obj=obj[list[j]];
	    }
	    console.log("updated core to:",subject.core);
	}

	// Determine the next question
	if (question.next) {
	    let toMatch;
	    if (typeof question.next == 'string') toMatch = question.next;
	    else {
		// might be only one item
		toMatch = question.next[selectedIdx];
		if (!toMatch) toMatch = question.next[0];
	    }

	    console.log("Looking for next question, id:",toMatch);
	    let q=_.findIndex(survey.questions, (item) => {
		return (item.id == toMatch);
	    });
	    if (q==-1) {
		self.attributes.prefix +='TROUBLE! Could not find question with id '+toMatch+'. ';
		console.log('TROUBLE! Could not find question with id '+toMatch+'. ');
		self.attributes.surveyQuestionIdx++;
	    }
	    else {
		self.attributes.surveyQuestionIdx = q;
		console.log("Setting question idx to ",q," which is:",survey.questions[q]);
	    }
	}
	else
	    self.attributes.surveyQuestionIdx++;

	/*** See if we finished THIS survey ***/
 	if (self.attributes.surveyQuestionIdx >= 
	    survey.questions.length || question.final) {
	    console.log("Finished this questionairre");
	    self.attributes.prefix += " <break time='500ms'/> ";
	    if (self.attributes.surveyRequestedBy) 
		self.attributes.prefix +=
		  ' Your friend '+self.attributes.surveyRequestedBy+
		  ' says Thank you! <break time="500ms"/> ';
	    self.attributes.surveyAnswers.completedDate = 
		survey.lastCompletedDate = new Date().toISOString();
	    self.attributes.surveyIdx++;
	    self.attributes.surveyQuestionIdx=0;
	    if (!subject.interactions.completedSurveys)
		subject.interactions.completedSurveys = [ ];
	    subject.interactions.completedSurveys.push(self.attributes.surveyAnswers);

	    if (question.instructions) {
		let sendTo=translateSendTo(self, subject, question.instructions.sendTo);
		let msg=substituteInsertions(self, subject, question.instructions.msg);
		console.log("Sending msg:"+msg+" to:"+sendTo);
		sendSMS(self, sendTo, msg, (err) => {
		    if (self.attributes.updatedCore)
			self.attributes.state = "SurveyUpdateCore";
		    else self.attributes.state = "SurveyUpdateDatabase";
		    self.emit('InteractionIntent');
		});
	    }    
	    
	    if (self.attributes.updatedCore)
		self.attributes.state = "SurveyUpdateCore";
	    else self.attributes.state = "SurveyUpdateDatabase";
	    self.emit('InteractionIntent');
	    return;
	}
	else {
	    self.attributes.timesTried = 0;
	    self.attributes.state = 'SurveyQuestion';
	    console.log("     Saying:"+self.attributes.prefix);
	    self.emit('InteractionIntent');  
	}
	return;
    }
    
    if (self.attributes.state == "SurveyUpdateCore") {
	console.log("Updating core: shopping:",subject.core.shopping);
	updateSubjectAttributeOnly(self, 
				   subject.ID,
				   subject.core,
				   "core", (self, err, data) => {
				       if (err) self.attributes.prefix += "ERROR saving to database! ";

				       self.attributes.state = "SurveyUpdateDatabase";
				       self.emit('InteractionIntent');
				   }
				  );
	return;
    }

    if (self.attributes.state == "SurveyUpdateDatabase") {
	updateSubjectAttributeOnly(self, 
				   subject.ID,
				   subject.interactions.completedSurveys,
				   "interactions.completedSurveys", (self, err, data) => {
				       if (err) self.attributes.prefix += "ERROR saving to database! ";

				       /** Invoke library if specified **/
				       if (survey.library) {
					   if (survey.library.charAt(0) != '/' )
					       survey.library = "./"+survey.library;
					   let library=require(survey.library);
					   console.log("Got library:",library);
					   library.handleCompletion(self, subject, survey, self.attributes.surveyAnswers);
				       }
				       self.attributes.state = "SurveyTellFriend";
				       self.emit('InteractionIntent');
				   }
				  );
	return;
    }

    if (self.attributes.state == "SurveyTellFriend") {
	/*** See if we're supposed to notify a "friend" ***/
	console.log("TellFriend, notification number:"+self.attributes.surveyTextNotification);
	if (self.attributes.surveyTextNotification) {
	    let msg="[MyLife] "+subject.contact.firstName+" completed "+
		self.attributes.survey.name+" survey; answers:"+JSON.stringify(self.attributes.surveyAnswers.answers)+
		" *** DO NOT REPLY TO THIS MESSAGE ***";
	    sendSMS(self, self.attributes.surveyTextNotification, msg, (err) => {
		self.attributes.state = "SurveyCheckIfDone";
		self.emit('InteractionIntent');
	    });
	}
	else {
	    self.attributes.state = "SurveyCheckIfDone";
	    self.emit('InteractionIntent');
	}
	return;
    }

    if (self.attributes.state == "SurveyCheckIfDone") {
	/*** Lets see if we're all done with all surveys ***/
	if (self.attributes.surveyIdx >= subject.interactions.surveys.length) {
	    console.log("Finished all surveys! Current completed is:",subject.interactions.completedSurveys);
	    self.attributes.state = 'SurveyRemoveSurveys';
	    self.emit("InteractionIntent");
	    return;
	}

	/*** Go on to the next survey **/
	self.attributes.prefix += "<break time='1s'/> ";
	console.log('About to start next survey, idx:'+self.attributes.surveyIdx);
	self.attributes.state = 'SurveyRetrieve';
	console.log("     Saying:"+self.attributes.prefix);
	self.emit('InteractionIntent');  
	return;
    }

    if (self.attributes.state == "SurveyRemoveSurveys") {
	console.log("Removing surveys from subject");
	subject.interactions.surveys=
	    _.filter(subject.interactions.surveys,(survey) =>
		     survey == 'adl' );   // remove all non-adl surveys
	updateSubjectAttributeOnly(self, 
				   subject.ID,
				   subject.interactions.surveys,
				   "interactions.surveys", (self, err, data) => {
				       if (err) self.attributes.prefix += "ERROR saving to database! ";
				       self.attributes.state = 'Start';
				       self.attributes.prefix += "<break time='1s'/>";
				       self.attributes.skipSurveys = true;
				       console.log("     Saying:"+self.attributes.prefix);
				       self.emit("InteractionIntent");
				   }
				  );
	return;
    }
    
    return;
}


function getMedication(self, medication, nextFunc) {
    console.log("getMedication: "+medication);
    if (self.attributes.isDemo)
	return nextFunc(self, null,
			    {
				"medication": "oxybutynin",
				"prettyName": "Oxybutynin",
				"reason": "Bladder control",
				"sideEffects": "dry mouth, blurred vision, stomach pain, constipation",
				"tips": "possibly avoid grapefruit juice, if you go to the dentist be sure to tell them you take this, it can make it harder to cool down when hot outside"
			    });
    var docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: 'MyLife_Medications',
        Key: { "medication": medication },
        ConsistentRead: false
    };
    docClient.get(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        }
	else console.log("Got medication:",data.Item);
        nextFunc(self, err, data.Item);
    });  
}

function getSurvey(self, survey, nextFunc) {
    console.log("getSurvey: "+survey);
/*
    if (self.attributes.isDemo)
	return nextFunc(self, null,
{
  "frequency": "always",
  "lastCompletedDate": {},
  "name": "pain",
  "questions": [
    {
      "expect": "same,better,worse",
      "question": "Tell me how you are feeling right now compared to yesterday. ",
      "responseAck": "Ok.,That's great.,Oh sorry you feel that way."
    }
  ]
}		       );
*/
    var docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: 'MyLife_Surveys',
        Key: { "name": survey },
        ConsistentRead: false
    };
    docClient.get(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to read item. Error JSON:", err);
        }
	else console.log("Got survey:",data.Item);
        nextFunc(self, err, data.Item);
    });  
}


function handleMeds(self, subject, word) {
  let msg="";
  console.log('handleMeds: state:'+self.attributes.state);
   
    if (self.attributes.state == 'Start') {
	console.log('************** MEDS start **************');
	self.attributes.skipMeds = true;
	// Pick a random med and then ask if they have symptoms
	let idx = Math.floor(Math.random() * subject.core.medications.length);

	// Now, look-up the medication in the database
	getMedication(self, subject.core.medications[idx], (self, err, medication) => {
	    console.log("Found medication:",medication);
	    if (!medication) {
		self.attributes.prefix += "Unable to find your medication "+subject.core.medications[idx]+" in our database! ";
		self.emit('InteractionIntent');
		return;
	    }
	    self.attributes.medication=medication;

	    // First, let's randomly pick to do the side-effect question or the tip
	    if (getRandomNumber(2)==0) {
		console.log("Let's do a medication TIP...");
		let tips=medication.tips.split(",");
		if (tips.length) {
		    let tip=getRandom(RandomSideEffectStart)+medication.prettyName+", I have this tip for you: "+getRandom(tips)+". <break time='1s'/> ";
		    self.attributes.prefix += tip;
		    console.log("Tip:",tip);
		}
		self.emit('InteractionIntent');
		return;
	    }
	    
	    // First, if the selected med doesn't have a side-effects list, then we'll
	    // skip doing this
	    if (!medication.sideEffects ||
		medication.sideEffects=="") {
		console.log("no medication side effects");
		self.emit('InteractionIntent');  // Just come back to our evaluator
		return;
            }

	    msg = "Let's check for any side effects of your medications. ";
	    msg += getRandom(RandomSideEffectStart)+medication.prettyName+', today do you have any of these conditions: '+
		medication.sideEffects+'?';
	    self.attributes.state = 'MedsResponse';
	    console.log("     Saying:"+msg);
	    self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg,"Please say yes or no.");
	});
	return;
    }

  if (self.attributes.state == 'MedsResponse') {
    if (isTrue(word.value)) {
	console.log('handleMeds: Subject said yes to side effect');
	if (!subject.interactions.completedSideEffects) subject.interactions.completedSideEffects = [];
	subject.interactions.completedSideEffects.push({
            date : new Date().toISOString(),
            medication : self.attributes.medication.medication,
            sideEffects: self.attributes.medication.sideEffects 
	});
	updateSubjectAttributeOnly(self, subject.ID, 
				 subject.interactions.completedSideEffects, 
				 "interactions.completedSideEffects", (self, err, data) => {
				     msg = "";
				     if (err) msg += "ERROR writing to database! ";
				     msg += "Oh goodness, I'm sorry to hear that. Would you like me to tell someone in your care circle?";
				     self.attributes.state = "MedsCareCircleResponse";
				     console.log("     Saying:"+self.attributes.prefix);
				     self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg,'Please say yes or no.');
				 });
      return;
    }
      if (!isFalse(word.value)) {
	  console.log("did give us a good yes/now word");
	  self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+" Please say yes or no","Please say yes or no");
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
  self.attributes.prefix += msg;
  console.log("     Saying:"+self.attributes.prefix+msg);
  self.emit('InteractionIntent');
  
  return;
}

    function findDelivererUser(self, subject) {
	console.log("findDelivererUser");
	if (!self.attributes.users) return null;
	let i;
	for (i=0; i<self.attributes.users.length; i++)
	    if (self.attributes.users[i].attributes.indexOf("deliverer")!=-1) break;
	if (i==self.attributes.users.length) i=0;  // Pick this poor bastard if noone else
	console.log("findDelivererUser:",self.attributes.users[i]);
	return self.attributes.users[i];
    }

    function translateSendTo(self, subject, sendTo) {
	let user=findDelivererUser(self, subject);
	if (!user) return user;
	return user.phone;
    }

    function substituteInsertions(self, subject, str) {
	str=str.replace("{firstname}",subject.contact.firstName);
	if (subject.core.shopping) {
	    str=str.replace("{core.shopping.items}", subject.core.shopping.items);
	    str=str.replace("{core.shopping.place}", subject.core.shopping.place);
	}
	let user=findDelivererUser(self, subject);
	if (user) {
	    console.log("substituteInsertions: user is:",user);
	    str=str.replace("{carecircle.deliverer.firstname}",user.contact.firstName);
	    str=str.replace("{carecircle.deliverer.phone}",user.contact.phone);
	}
	return str;
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
            self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg,msg);
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
	    if (word.value == 'for') idx=4;
	    else if (word.value == 'to') idx=2;
	    else idx=parseInt(word.value);
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
	    self.attributes.sendTo=users[idx].phone.split('-')[0];
	    self.attributes.state="SendMessageGetMessage";
	    console.log("     Asking for SMS message");
	    self.emit(':elicitSlot',SLOT_NAME,
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
    if (msg.indexOf('do')==0) return true;
    if (msg.indexOf('tell')==0) return true;
    if (msg.indexOf('what')==0) return true;
    if (msg.indexOf('how')==0) return true;
    if (msg.indexOf('are')==0) return true;
    if (msg.indexOf('will')==0) return true; 
    if (msg.indexOf('when')==0) return true;
    if (msg.indexOf('why')==0) return true;
    console.log('...is false');
    return false;
}

function sendSMS(self, number, message, nextFunc) {
    console.log('sendSMS to '+number+' message:'+message);
    number = number.split('-')[0];
    request.post("https://api.twilio.com/2010-04-01/Accounts/AC6203fa66f81b40708bbc4810c28fe049/Messages",
		 { 
		     body: "&From=+16179968873&To="+number+"&Body="+message,
		     headers: {'content-type' : 'application/x-www-form-urlencoded'},
		     auth: {
			 'user': 'AC6203fa66f81b40708bbc4810c28fe049',
			 'pass': '6866b679dd68e09efb537d43cc5f6dba'
		     }
		 },
		 (err, resp, body) => {
		     console.log('Result of sending sms:',err);
		     if (nextFunc) nextFunc(self, err);
		 }
		);
}

function convertDateToMessage(d) {
    let result;
    // First, put it back to our time zone
    console.log('convertDateToMessage incoming:'+d);
    d = new Date(d - 4*60*60*1000);
    console.log('convertDateToMessage in our timezone:'+d);
    let dateStr=d.toDateString();  // Thu Jun 28 2018
    console.log('dateStr:'+dateStr);
    dateStr=dateStr.replace('Mon','Monday');
    dateStr=dateStr.replace('Tue','Tuesdayy');
    dateStr=dateStr.replace('Wed','Wednesday');
    dateStr=dateStr.replace('Thu','Thursday');
    dateStr=dateStr.replace('Fri','Friday');
    dateStr=dateStr.replace('Sat','Saturday');
    dateStr=dateStr.replace('Sun','Sunday');

    dateStr=dateStr.replace('Jan','January');
    dateStr=dateStr.replace('Feb','February');
    dateStr=dateStr.replace('Mar','March');
    dateStr=dateStr.replace('Apr','April');
    dateStr=dateStr.replace('May','May');
    dateStr=dateStr.replace('Jun','June');
    dateStr=dateStr.replace('Jul','July');
    dateStr=dateStr.replace('Aug','August');
    dateStr=dateStr.replace('Sep','September');
    dateStr=dateStr.replace('Oct','October');
    dateStr=dateStr.replace('Nov','November');
    dateStr=dateStr.replace('Dec','December');

    dateStr=dateStr.replace('2018','');
    dateStr=dateStr.replace('2019','');
    dateStr=dateStr.replace('2020','');
    dateStr+=' <break time="300ms"/>';

    let diff=d - new Date();
    let daysFromNow=Math.round(diff/1000/60/60/24);
    if (daysFromNow) {
	dateStr+=' '+daysFromNow+' days from now <break time="300ms"/> ';
    }
    
    console.log('adjusted dateStr:'+dateStr);
    result = ' On '+dateStr+' at ';
    let timeStr=d.toLocaleTimeString(); // 20:10:00
    let parts=timeStr.split(':');
    let ampm=' a.m. '
    if (parseInt(parts[0])>=12) ampm=' p.m. ';
    if (parseInt(parts[0])>12) parts[0]=parseInt(parts[0])-12;
    result += parts[0]+' '+parts[1]+ampm;
    console.log('Result:'+result);
    return result;
}

function handleCalendar(self, subject, word) {
   console.log('handleCalendars: state:'+self.attributes.state);
   
   if (self.attributes.state == 'Start') {
       self.attributes.skipCalendar = true;
       console.log('************** CALENDAR start **************');
       /* First, sort the events */
       self.attributes.calendar=_.sortBy(subject.interactions.calendar, (o)=> {
	   return o.date;
       });
       console.log('Sorted array:',self.attributes.calendar);
       /* Now, find events that are AFTER 'now' */
       let msg='';
       let now=new Date().getTime();
       let count=0;
       _.forEach(self.attributes.calendar, (event) => {
	   console.log('Checking now '+now+' vs '+event.date);
	   // WARNING: We should delete any events that have passed and then save!
	   if (typeof event.date == 'string')
	       event.date = new Date(event.date).getTime();
	   if (event.date >= now && count < 3) {
	       if (msg=='') msg='You have the following calendar events <break time="500ms"/> ';
	       else msg+=' <break time="250ms"/> and <break time="250ms"/> ';
	       msg+=convertDateToMessage(event.date);
	       msg+=' <break time="250ms"/> '+event.msg;
	       msg+=' <break time="750ms"/>';
	       count++;
	   }
       });
       msg+=' <break time="750ms"/>';
       self.attributes.prefix += msg;
       self.emit('InteractionIntent');
       return;
   }
}

function handleProfile(self, subject, word) {
   console.log('handleProfile: state:'+self.attributes.state);
   
   if (self.attributes.state == 'Start') {
       self.attributes.skipProfile = true;
       console.log('************** PROFILE start **************');
       // First, check for zip-code
       if (!subject.contact.zipcode) {
	   let msg="Hey "+subject.contact.firstName+", I see that we dont have your zipcode on file. "+
	       '<break time="300ms"/> We need the zipcode so that timezones and the weather report '+
	       'work correctly. <break time="300ms"/> What is your zipcode?';
	   console.log("Soliciting for zipcode");
	   self.attributes.state = "ProfileGetZipcode";
	   self.emit(':elicitSlot',SLOT_NAME,
		     getPrefix(self)+msg,"Please tell me your zipcode.");
	   return;
       }
       self.emit('InteractionIntent');
       return;
   }

    if (self.attributes.state == 'ProfileGetZipcode') {
	word = word.value.trim();
	console.log("Received zipcode:"+word);
	let url="http://www.zipcodeapi.com/rest/GqxUqSkUvME4LFo44IDsdpcY4evmcltUruJwDuSC847lnTRGC5TKzuzxb6HuhUw8/info.json/"+word+"/degrees";
	request(url,(err, data) => {
	    console.log('Zipcode lookup result:',err);
	    if (err) {
		self.emit(':elicitSlot',SLOT_NAME,
			  getPrefix(self)+"Sorry, I couldn't find that zip code "+word+", Please say it again?","Please tell me your zipcode.");
		return;
	    }
	    data = data.body;
	    if (typeof data == 'string') data=JSON.parse(data);
	    if (data.error_code) {
		console.log('Error zipcode data is:',data);
		self.emit(':elicitSlot',SLOT_NAME,
			  getPrefix(self)+"Sorry, I couldn't find that zip code "+word+", Please say it again?","Please tell me your zipcode.");
		return;
	    }
	    self.attributes.prefix += 'Thank you!<break time="250ms"/> I will use zip code '+word+
		' Which is city '+data.city+' and time zone '+data.timezone.timezone_abbr+'. '+
		' <break time="500ms"/> ';;
	    subject.contact.zipcode=word;
	    subject.contact.city=data.city;
	    subject.contact.state=data.state;
	    subject.contact.timezone=data.timezone;
	    updateSubjectAttributeOnly(self, subject.ID, 
				       subject.contact,
				       "contact", (self, err, data) => {
					   console.log('update result:',err);
					   self.attributes.state = "Start";
					   self.emit('InteractionIntent');
				       });
	    return;
	});
	return;
    }

}


function handleEvent(self, subject, word) {
    word=word.value.toLowerCase();
    console.log('handleEvent: state:'+self.attributes.state+' word:'+word);
   
    if (self.attributes.state == 'Start') {
	console.log('************** EVENT start **************');
	self.attributes.state = 'EventResponse';
	self.attributes.skipEvent = true;
	console.log('Asking if they want to set a new event...');
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+
		  ' Would you like to set a new calendar event?',"Please say yes or no.");
	return;
    }

    if (self.attributes.state == 'EventResponse') {
	if (word=='no') {
	    self.attributes.state = 'Start';
	    self.emit('InteractionIntent');
	    return;
	}
	self.attributes.state = 'EventGetDate';
	console.log('Asking for a date...');
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+
		  ' Please say the date and time. '+
		  ' You can say something like this <break time="250ms"/> '+
		  ' July 28th 3:30pm <break time="300ms"/> ',
		  "Please say a full date or say stop.");
	return;
    }

    if (self.attributes.state == 'EventGetDate') {
	self.attributes.state = 'EventGetEvent';
	if (word.indexOf('stop')!=-1 ||
	    word.indexOf('no')!=-1 ||
	    word.indexOf('cancel')!=-1) {
	    self.attributes.prefix += 'Ok, maybe another time.<break time="200ms"/>';
	    self.emit('InteractionIntent');
	}
	console.log('Asking for a msg...');

	let ret=isValidSpokenDateString(word);
	if (ret) {
	    self.attributes.prefix+=ret;
	    self.attributes.state = 'EventResponse';
	    self.emit('InteractionIntent');
	    return;
	}
	let d=convertSpokenDateStringToUTC(word);
	if (typeof d == 'string') {
	    self.attributes.prefix+=d+' <break time="250ms"/>';
	    self.attributes.state = 'EventResponse';
	    //self.attributes.state = 'Start';
	    self.emit('InteractionIntent');
	    return;
	}
	let dateStr="";
	let months=[
	    "January","February","March","April","May","June",
	    "July","August","September","October","November","December"
	];
	dateStr+=months[d.getUTCMonth()]+' ';
	dateStr+=d.getUTCDate()+' ';
	let ampm="a.m.";
	let hh=d.getUTCHours();
	if (hh>=12) ampm="p.m.";
	if (hh>12) hh -= 12;
	let mm=d.getUTCMinutes();
	if (mm==0) mm=""
	dateStr+=hh+" "+mm+" "+ampm+' <break time="300ms"/> ';
	self.attributes.prefix += 'Registering event for '+dateStr;
	d = d.getTime() + 4*60*60*1000;
	let dd=new Date(); dd.setTime(d);
	self.attributes.eventDate = dd;
	self.attributes.state = 'EventGetMessage';
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+
		  ' Please say a short message to describe the event or say stop. ',
		  ' Please say a short message to describe the event. ');
	return;
    }

    if (self.attributes.state == 'EventGetMessage') {
	self.attributes.state = 'Start';
	if (word.indexOf('stop')!=-1 ||
	    word.indexOf('no')!=-1 ||
	    word.indexOf('cancel')!=-1) {
	    self.attributes.prefix += 'Event not set. <break time="300ms"/> ';
	    self.emit('InteractionIntent');
	    return;
	}
	addCalendar(self, subject, {date:self.attributes.eventDate, msg:word}, (err,data) => {
	    if (err) self.attributes.prefix +=' Failed database addition '+err;
	    else self.attributes.prefix +=' Added successfully. <break time="300ms"/> ';
	    self.emit('InteractionIntent');
	    return;
	});
    }
}

function addCalendar(self, subject, calendar, nextFunc) {
    if (!subject.interactions.calendar) subject.interactions.calendar=[];
    subject.interactions.calendar.push(calendar);
    updateSubjectDB(self, subject, (self, err, data) => {
	console.log("Update err:",err);
	nextFunc(err);
    });
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
       for (let i=0; i < peopleArray.length && i < max; i++)  {
	   if ((i==max -1 || i==peopleArray.length-1) && i!=0)
	       from+=' and ';  // put 'and' before the last name mentioned
           from+=peopleArray[i] + ", ";
       }
       console.log("Messages from:"+from);
      from+=' <break time="250ms"/> Would you like to hear them now?';
      self.attributes.state = 'MessagesResponse';
      self.attributes.msgnum = -1;
      self.attributes.skipMessages = false;
       console.log('Asking if they want to hear their messages...');
      self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+from,"Please say yes or no.");
      return;
  }

  if (self.attributes.state == 'MessagesResponse') {
    console.log('MESSAGE Response for yes/no, got:'+word.value);
    if (!isTrue(word.value)) {
      self.attributes.state = 'Start';
      self.attributes.skipMessages = true;
      self.attributes.prefix += "That's fine "+subject.contact.firstName+", I'll save them for later. <break time='750ms'/> ";
      self.emit('InteractionIntent');
      return;
    }
    self.attributes.msgnum++;
    self.attributes.state = "MessagesSayMessage";
  }
  
    if (self.attributes.state == 'MessagesGetReply') {
	console.log('Using reply of:'+word.value+' .. sending SMS...');
	sendSMS(self,
		subject.interactions.messages[self.attributes.msgnum].userPhone,
		subject.contact.firstName+" says: "+word.value, (self, err) => {
			 console.log('Result of sending sms:',err);
			 if (err) self.attributes.prefix += "Message failed:"+err+" ";
			 else self.attributes.prefix+="Message sent. ";
			 self.emit('InteractionIntent');
		});
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
		subject.interactions.messages[self.attributes.msgnum].msg + " <break time='300ms'/> ";
	    console.log('MESSAGE We have a message to say: '+msg);
	    if (isAQuestion(subject.interactions.messages[self.attributes.msgnum].msg) &&
	       subject.interactions.messages[self.attributes.msgnum].userPhone) {
		console.log('The message turns out to be a question, so solicit an answer');
		self.attributes.state = 'MessagesGetReply';
		self.emit(':elicitSlot',SLOT_NAME,
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
					   msg += "That's all your messages, <break time='1s'/> ";
					   self.attributes.skipMessages = false;
					   self.attributes.prefix += msg;
					   self.emit('InteractionIntent');
				       });
            return;
	}
	msg+=" Would you like to hear the next one?";
	console.log('MESSAGES Stating the next message to subject.');
	self.attributes.state = "MessagesResponse";
	console.log('Sending msg:'+msg);
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+msg,"Please say yes or no.");
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
	let msg='';
	if (self.attributes && self.attributes.state && self.attributes.state != 'Start')
	    msg="Oh oh, you asked for setup so your current session is now stopped. "+
	    "<break time='300ms'/>";
        self.emit(':elicitSlot',"NumberSlot",msg+
		  "Welcome to My Life's setup! "+
		  '<break time="300ms"/>'+
		  " Say your temporary device I.D. or say STOP. "+
		  "If you dont have an I.D. then please visit Whole Health Plus Technology dot com "+
		  'and request an account. <break time="300ms"/> Please say your temporary I.D. , one '+
		  "digit at a time.",
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
		let subject = data[0];
		subject.deviceID = self.event.context.System.device.deviceId;
		updateSubjectAttributeOnly(self, subject.ID, subject.deviceID, "deviceID",(self,err,data) => {
		    if (err) {
			self.emit(':tell',"ERROR updating database");
			return;
		    }
		    console.log('Set subject.deviceID to :'+subject.deviceID);
		    sendSMS(self, '+19787643488', 'mylife: '+subject.ID+' ACTIVATED!', () => {
			self.emit(':tell',
			      'Thank you, '+subject.contact.firstName+'. <break time="300ms"/> '+
			      'To run the application simply say <break time="250ms"/> Alexa, start My Life. '+
			      ' <break time="250ms"/>  If you need any help, please submit a note '+
			      ' on our web site, Whole Health Plus Technology dot com. <break time="300ms"/>'+
			      'Setup is complete now, enjoy the application and remember: '+
				  '<break time="250ms"/> Stay Connected To Life!');
		    });
		});
            });
	}
    else self.emit(':tell','Oh oh...I have no clue');
}

function handleLaunch(self, subject) {
    console.log('Launch event is asking the subject Are You Ready to kick-off the dialog');
    self.attributes.state = "Start";
    self.attributes.subject = subject;  // WARNING, this results in a full-copy when it comes back, NOT the reference
    let launchMessage="";
    if (subject.libraries && subject.libraries.launch) {
	let launchLibrary="./"+subject.libraries.launch;
	let launch=null;
	try {
	    launch = require(launchLibrary);
	    launchMessage = launch.launchMessage;
	} catch (e) {
	    console.log("Not able to load launch library "+launchLibrary,e);
	}
    }
    self.emit(':ask',getPrefix(self)+" "+
	      getRandom(RandomGetGreatingMessages)+" "+subject.contact.firstName+'! '+
	      launchMessage+' <break time="500ms"/> Are you ready to begin?');
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

function handleWeather(self, subject, word) {
    self.attributes.skipWeather = true;
    console.log('********* HandleWeather ****************');
    if (self.attributes.state == 'Start') {
	self.attributes.skipWeather = true;
	self.attributes.state = 'WeatherStart';
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+"Would you like to hear the weather forecast?","Please say yes or no.");
	return;
    }

    if (self.attributes.state == 'WeatherStart') {
	if (isFalse(word.value)) {
	    self.attributes.state = 'Start';
	    return self.emit('InteractionIntent');
	}
	request("https://api.wunderground.com/api/587d331e9dd343e3/forecast/q/"+subject.contact.zipcode+".json",(err, data) => {
	    let weather="";
	    if (err) weather="Error getting weather: "+err;
	    else {
		data=JSON.parse(data.body);
		let ary=data.forecast.txt_forecast.forecastday;
		weather+="The weather for "+subject.contact.city+" today "+ary[0].title+" is "+ary[0].fcttext+", ...";
		weather+="The weather for "+ary[1].title+" is "+ary[1].fcttext+", ...";
		weather = weather.replace(/F./g,".");
		weather = weather.replace(/mph./g,"mph. , ");
		weather = weather.replace(/Winds NE/g, "Winds north east");
		weather = weather.replace(/Winds NW/g, "Winds north west");
		weather = weather.replace(/Winds NNE/g,"Winds north north east");
		weather = weather.replace(/Winds NNW/g,"Winds north north west");
		weather = weather.replace(/Winds SE/g, "Winds south east");
		weather = weather.replace(/Winds SW/g, "Winds south west");
		weather = weather.replace(/Winds SSE/g,"Winds south south east");
		weather = weather.replace(/Winds SSW/g,"Winds south south west");
		weather = weather.replace(/Winds E/g,  "Winds east");
		weather = weather.replace(/Winds W/g,  "Winds west");
		weather = weather.replace(/Winds S/g,  "Winds south");
		weather = weather.replace(/Winds N/g,  "Winds north");
	    }
	    console.log("Got weather:"+weather);
	    self.attributes.state = 'Start';
	    self.attributes.prefix+=" "+weather+" <break time='2s'/> ";
	    self.emit('InteractionIntent');
	});
	return;
    }
}

function daysSince(olderDate, newerDate) {
    if (!newerDate) newerDate = new Date().getTime();
    if (!olderDate) olderDate = new Date().getTime()-10*1000*24*60*60 // Pretend 10 days ago
    let days;
    days= (newerDate - olderDate) / (24*60*60*1000);
    days=Math.round(days);
    return days;
}

function handleAnnounce(self, subject, word) {
    console.log("******** Handle Announce ******");
    self.attributes.skipAnnounce=true;
    console.log("Sending message to stakutis about starting patient "+subject.ID);
    {
	sendSMS(self, '+19787643488', 'mylife: '+subject.ID+' signed in', () => {
	    console.log('Updating the patients login-time...');
	    /** Update last login time first ***/
	    let d=new Date();
	    let timesLoggedIn=0,lastLogin=0;
	    if (subject.interactions.lastLogin && subject.interactions.lastLogin.timesLoggedIn) {
		timesLoggedIn = subject.interactions.lastLogin.timesLoggedIn;
		lastLogin = subject.interactions.lastLogin.gmt;
	    }
	    timesLoggedIn++;
	    subject.interactions.lastLogin={
		timesLoggedIn : timesLoggedIn,
		str: d.toISOString(),
		gmt: d.getTime(),
		bostonTime: new Date(d.getTime()-4*60*60*1000).toLocaleString()
	    };

	    /** Now let's see if we can ding the user if we haven't heard from them in a while **/
	    let days = daysSince(lastLogin);
	    console.log('lastLogin info; lastLogin:',lastLogin,' days:',days,' now:',d.getTime(),' timesLoggedIn:',timesLoggedIn);
	    if (lastLogin  && days > 2 )
		self.attributes.prefix += " It has been "+days+" days since I last heard from you. "+
		'I was getting a bit worried.<break time="300ms"/> ';

	    /** Let's ensure we have a 'dateCreated' block in the users record **/
	    if (!subject.contact.dateCreated) {
		subject.contact.dateCreated = {
		    gmt:new Date().getTime()-10*1000*24*60*60 // Pretend 10 days ago
		};
	    }

	    /** Now, lets run through profile type things we should ask this time, but 
		only ask for 1 thing to not bug them too much **/
	    let interests=["religion","books","shows","health","food"];
	    for (let i=0; i<interests.length; i++) {
		if (timesLoggedIn < 1) break;  // Let's not ask them profile stuff just yet
		console.log("Checking interest:"+interests[i]);
		if (!subject.core.interests || !subject.core.interests[interests[i]]) {
		    if (subject.interactions.surveys.indexOf("interests_"+interests[i])==-1)   
			subject.interactions.surveys.push("interests_"+interests[i]);
		    break;  // Push only 1 survey each time
		}
	    }
		
	    /* Ask them 'shopping' if a fairly new account but older than 2 days */
	    if (timesLoggedIn > 2 ) {
		console.log("Checking shopping:"+subject.core.shopping);
		if (!subject.core.shopping || daysSince(subject.core.shopping.lastDate) > 2)
		    if (subject.interactions.surveys.indexOf("shopping")==-1) 
			subject.interactions.surveys.push("shopping");
	    }
	    updateSubjectAttributeOnly(self, subject.ID, subject.interactions.lastLogin,
				       "interactions.lastLogin",(self,err,data) => {
					   console.log('Result of updating login:',err);
					   self.emit('InteractionIntent');
				       });
	});
    }
}

function handleNews(self, subject, word) {
    console.log('********* HandleNews ****************');
   console.log('handleNews: state:'+self.attributes.state);
    word = word.value.toLowerCase();
    
   if (self.attributes.state == 'Start') {
       self.attributes.skipNews = true;
       self.attributes.state = 'NewsPick';
       self.emit('InteractionIntent');
       return;
   }

    if (self.attributes.state == 'NewsPick') {
	let pref=" Would you like to hear your top news stories? ";
	if (self.attributes.newsCategory) pref=" Would you like to hear other stories? ";
	console.log('Setting pref to:'+pref);
	self.attributes.state = 'NewsSelected';
	// WARNING: Alexa wont hear the world "health" instead hears "help" and that forces a the help intent
	self.emit(':elicitSlot',SLOT_NAME,getPrefix(self)+pref+
		  "You can say, No, or U.S., or world, or medicine, or money, or tech.","Please say No, or U.S., or world, or medicine, or money, or tech.");
	return;
    }

    if (self.attributes.state == 'NewsSelected') {
	if (isFalse(word)) {
	    if (self.attributes.newsCategory)
		self.attributes.prefix += "OK., ";
	    else
		self.attributes.prefix += "OK., maybe another time. ... ";
	    self.attributes.state = 'Start';
	    return self.emit('InteractionIntent');
	}

	self.attributes.state = 'NewsGet';
	self.attributes.newsCategory = word;
	switch (word) {
	case 'medicine':
	case 'health': self.attributes.newsURL = "http://rss.cnn.com/rss/cnn_health.rss"; break;
	case 'us':  self.attributes.newsCategory = "U.S.";  // let fall thru to next
	case 'u.s.' : self.attributes.newsURL = "http://rss.cnn.com/rss/cnn_us.rss"; break;
	case 'world' : self.attributes.newsURL = "http://rss.cnn.com/rss/cnn_world.rss"; break;
	case 'money': self.attributes.newsURL = "http://rss.cnn.com/rss/money_latest.rss"; break;
	case 'tech': self.attributes.newsURL = "http://rss.cnn.com/rss/cnn_tech.rss"; break;
	default:
	    self.attributes.prefix +=" Oh, I didn't understand the word "+word+". , ";
 	    self.attributes.state = 'NewsPick';
	}
	self.emit('InteractionIntent');
	return;
    }

    if (self.attributes.state == 'NewsGet') {
	let parseString=require('xml2js').parseString;
	let url=self.attributes.newsURL;
	console.log("Fetching "+url);
	self.attributes.prefix += " From CNN "+self.attributes.newsCategory+":, ";
	request(url,(err, data) => {
	    console.log('request result:',err);
	    parseString(data.body, (err, data) => {
		let andStr="";
		let i;
		for (i=0; i < data.rss.channel[0].item.length && i < 2; i++) {
		    let item=data.rss.channel[0].item[i];
		    let str=item.description[0];
		    str = str.split("<")[0];
		    if (str>"") {
			self.attributes.prefix += andStr + str + " ";
			andStr = ' <break time="1s"/> AND , <break time="1s"/>' ;
		    }
		}
		console.log('Retrieved '+i+' stories.');
		self.attributes.state = 'NewsPick';
		self.emit('InteractionIntent');
	    });
	});
	return;
    }
}


const handlers = {
    'LaunchRequest': function () {
        console.log('********* LauchRequest ***********');
	console.log("Looking up by device id...");
        let subject=findSubjectByDeviceID(this, this.event.context.System.device.deviceId, (self, err, data) => {
          if (err) {
	      console.log('error reading for device:',err);
            self.emit(':tell',"Ooops, trouble reading the database!");
            return;
          }
            if (!data || !data.length) {
		console.log('Device not found');
		this.emit(
		':tell',
		    "Welcome. I see that your device is not yet associated with a My Life account. "+
			"You can get an account at W W W dot Whole Health Plus Technology dot com. "+
			' <break time="250ms"/> '+
			"If you have a 4 digit device code, please say:, Alexa tell My Life Setup. "+
			' <break time="250ms"/> '+
			"Or, if you want to demo and play with this skill please say: "+
			' <break time="200ms"/> '+
			"Alexa "+
			"tell My Life demo.");
				       }
          else {
            console.log("Retieved subject:",data[0]);
            self.attributes.deviceId = self.event.context.System.device.deviceId;
            handleLaunch(this, data[0]);
          }
        });
    },
    'DemoIntent': function () {
	console.log('============================ DEMO INTENT ============================');
	this.attributes.isDemo = true;
	handleLaunch(this, MyLife_Subjects[0]);
    },
    'ActivateIntent': function () {
	dumpStuff('ActivateIntent', this);
	let word=getRealSlotValue(this,SLOT_NAME);
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
	word=getRealSlotValue(this,SLOT_NAME);
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

	if (word.value.trim().toLowerCase()=='stop') {
	    console.log('USER SAID STOP');
	    this.emit('AMAZON.StopIntent');
	    return;
	}

	// The 'Start' state means we're either just-starting a session OR we've completed 
      // some tasks and look for more things to do.  Find the next thing to do or say goodbye.
      if (this.attributes.state == 'Start') {
	  if (false) {
              if (!this.attributes.skipSendMessage)
		  return handleSendMessage(this, subject, word);
              if (subject.interactions.surveys && subject.interactions.surveys.length && !this.attributes.skipSurveys)
		  return handleSurveys(this, subject, word);
	  }
	  
	  if (!this.attributes.skipAnnounce)
	      return handleAnnounce(this, subject, word);

	  if (!this.attributes.skipProfile)
	      return handleProfile(this, subject, word);
	  
          if (subject.interactions.calendar && subject.interactions.calendar.length && !this.attributes.skipCalendar)   
              return handleCalendar(this, subject, word);
        if (subject.interactions.messages && subject.interactions.messages.length && !this.attributes.skipMessages)   
          return handleMessages(this, subject, word);
        if (subject.core.medications && subject.core.medications.length && !this.attributes.skipMeds)   
          return handleMeds(this, subject, word);
        if (subject.interactions.surveys && subject.interactions.surveys.length && !this.attributes.skipSurveys)
          return handleSurveys(this, subject, word);
        if (subject.interactions.reminders && subject.interactions.reminders.selections && subject.interactions.reminders.selections.length && !this.attributes.skipReminders)   
          return handleReminders(this, subject, word); 
        if (!this.attributes.skipSendMessage)
          return handleSendMessage(this, subject, word);
	  if (!this.attributes.skipWeather) 
	      return handleWeather(this);
	  if (!this.attributes.skipNews) 
	      return handleNews(this, subject, word);
          if (!this.attributes.skipEvent)
	      return handleEvent(this, subject, word);
      }
      
      if (this.attributes.state.startsWith('Profile')) return handleProfile(this, subject, word); 
      if (this.attributes.state.startsWith('Event')) return handleEvent(this, subject, word); 
      if (this.attributes.state.startsWith('Calendar')) return handleCalendar(this, subject, word); 
      if (this.attributes.state.startsWith('Announce')) return handleAnnounce(this, subject, word); 
      if (this.attributes.state.startsWith('SendMessage')) return handleSendMessage(this, subject, word);
      if (this.attributes.state.startsWith('Weather')) return handleWeather(this, subject, word);
      if (this.attributes.state.startsWith('Messages')) return handleMessages(this, subject, word);
      if (this.attributes.state.startsWith('News')) return handleNews(this, subject, word);
      if (this.attributes.state.startsWith('Meds')) return handleMeds(this, subject, word);
      if (this.attributes.state.startsWith('Survey')) return handleSurveys(this, subject, word);

      console.log('InteractionIntent: Finished all tasks.');
	this.emit(':tell', getPrefix(this)+" That's all for today. "+getRandom(RandomEndMessages)+
                " Please come back soon "+subject.contact.firstName);
      this.attributes.state="";
    },
    
    'SessionEndedRequest': function () {
      console.log('***** SESSION END REQUEST ****************');
      // This means an ubrupt end like the subject walked away/time-out or an error on the Alexa side
      // Here is where we'd clean up anything we need to possibly like writing to the database
      // this.session.attributes and this.session.user.userId seem to be filled
    },
    'HelpIntent': function () {
	console.log('Got lambda HelpIntent');
/*
No idea why...if we vector into InteractionIntent, it works, and sends back a valid
response, but the alexa-side just bails out.
	if (this.attributes && this.attributes.state && this.attributes.state != 'Start')
	    this.emit('InteractionIntent');
	else
*/
	    this.emit('AMAZON.HelpIntent');
    },

    'AMAZON.HelpIntent': function () {
	let msg="";
	console.log('Got AMAZON.HelpIntent');
	if (this.attributes && this.attributes.state && this.attributes.state != 'Start')
	    msg="Oh oh, you asked for help so your current session is now stopped.<break time='300ms'/>";
	this.emit(':tell',msg+HELP_MESSAGE);
    },

    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },

    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE+". "+getRandom(RandomEndMessages)+
			    " Please come back soon.");
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

console.log("Hi.");
