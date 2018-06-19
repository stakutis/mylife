var AWS = require('aws-sdk');
const fs = require('fs');
var request = require('request');
let region=    {
            region: 'us-east-1',
            accessKeyId: 'AKIAJGWD2X3CMS3BKLRQ',
            secretAccessKey: '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'};


let awaitChoice = { };

const  surveys=[
      {
        "defaultAck": "That's great,OK,,Yick,Oh I'm sorry",
        "defaultExpect": "none|no|no no|no not|not, mild|mile, moderate, severe, extreme",
        "frequency": "always",
        "lastCompletedDate": {},
        "library": "LibraryQuestionnaireHip",
        "name": "KOOS",
        "questions": [
          {
            "question": "Tell me about Going up and down stairs?"
          },
          {
            "question": "How about walking on an uneven surface?"
          },
          {
            "question": "Rising from sitting?"
          },
          {
            "question": "Bending to the floor or pick up an object?"
          },
          {
            "question": "Lying in bed, turning over, maintaining hip position?"
          },
          {
            "question": "Sitting?"
          }
        ],
        "startingMessage": "Tell me about your hip pain. For each question, please say one of the following:, none, mild, moderate, severe, extreme"
      }
];

let activeUsers = { };

const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


      


function findUserByPhone(phone, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log('findUserByPhone: ',phone);

  console.log('reading items from Users DynamoDB table');
  const params = {
      TableName: 'MyLife_Users',
      FilterExpression:
      "begins_with(phone, :phone)",
      ExpressionAttributeValues: {
	  ":phone":phone}
  };
  console.log('scanning with params:',params);
//  docClient.get(params, (err, data) => {
  docClient.scan(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", err);
        } else {
//            console.log("scan succeeded: data:");
//            console.log(data.Items);
        }
        nextFunction(err, data.Items);
    });  

  return null;
}

function findSubjectAttributeOnly(ID, attribute, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log('findSubjectAttributeOnly: ',ID);

  const params = {
        TableName: 'MyLife_Subjects',
        Key: {"ID":ID},
//        AttributesToGet: [attribute.split('.')[0]],
        ProjectionExpression: attribute,
        ConsistentRead: false,
        ReturnConsumedCapacity: "TOTAL"
  };
  console.log('scanning with params:',params);
  docClient.get(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", err);
        }
        nextFunction(err, data.Item);
    });  

  return null;
}

function messageFriends(respondTo, subjectID, msg) {
    let docClient = new AWS.DynamoDB.DocumentClient(region);
    console.log("****MessageFriends subject:"+subjectID+" msg:"+msg);
    let sentTo="";

    const params = {
        TableName: 'MyLife_Users',
        FilterExpression: '#subjectIDName = :subjectID ',
        ExpressionAttributeNames: {
            '#subjectIDName': 'subjectID'
        },
        ExpressionAttributeValues : {
            ':subjectID': subjectID
        },
    };
    console.log('scanning with params:',params);
    docClient.scan(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", err);
        }
	else {
	    msg = "[MyLife] "+msg+" ; *** NOTE: Do not respond to this message; messages sent to this number go to your patient. ***";
	    for (let i=0; i<data.Items.length; i++) {
		let user=data.Items[i];
		sentTo+=" "+user.contact.firstName;
		sendSMS(user.phone, msg);
	    }
	    sendSMS(respondTo, "Messsages sent to:"+sentTo);
	}
    });  
}

function findSubject(ID, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log('findSubject: ',ID);

  console.log('reading items from Subjects DynamoDB table');
  const params = {
        TableName: 'MyLife_Subjects',
        Key: {"ID":ID},
        ConsistentRead: false
  };
  console.log('scanning with params:',params);
  docClient.get(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", err);
        }
        nextFunction(err, data.Item);
    });  

  return null;
}

function updateSubject(ID, data, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log('updateSubject: ',ID);

  const params = {
      TableName: 'MyLife_Subjects',
      Item : data
  };
  console.log('scanning with params:',params);
  docClient.put(params, (err, data) => {
        if (err) {
            console.error("Unable to update item. Error JSON:", err);
        } else {
            console.log("scan succeeded: data:");
            console.log(data);
        }
        nextFunction(err, data.Item);
    });  

  return null;
}

function updateSubjectAttributeOnly(ID, data, attribute, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log('updateSubjectAttributeOnly: ',ID);

  const params = {
        TableName: 'MyLife_Subjects',
        Key: {"ID":ID},
        UpdateExpression: "set "+attribute+" = :r",
        ExpressionAttributeValues: { ":r":data}
  };
  console.log('scanning with params:',params);
  docClient.update(params, (err, data) => {
        if (err) {
            console.error("Unable to update item. Error JSON:", err);
        } 
      nextFunction(err, data ? data.Item: null);
    });  

  return null;
}

function sendSMS(toNumber, msg, nextFunc) {
    toNumber = toNumber.split('-')[0];
    console.log("will send ["+msg+"] to number:",toNumber);
    request.post("https://api.twilio.com/2010-04-01/Accounts/AC6203fa66f81b40708bbc4810c28fe049/Messages",
		 { 
		     body: "&From=+16179968873&To="+toNumber+",&Body="+msg,
		     headers: {'content-type' : 'application/x-www-form-urlencoded'},
		     auth: {
			 'user': 'AC6203fa66f81b40708bbc4810c28fe049',
			 'pass': '6866b679dd68e09efb537d43cc5f6dba'
		     }
		 },
		 (err, resp, body) => {
		     if (err) console.log('FAILED to send message:',err);
		     nextFunc && nextFunc(err, body);
		 }
		);
    return;
}

function addActiveUser(phone, name, doctor) {
    activeUsers[phone]={
	name : name,
	phone: phone,
	state: "prestart",
	survey: surveys[0],
	doctor : doctor,
	questionNumber : 0,
	answers: {answers:[]},
	timeStarted : new Date()
    };
    let result=fs.writeFileSync('activeUsers.json', JSON.stringify(activeUsers));
    console.log("resul of file-writet:",result);
    return activeUsers[phone];
}


function valueOf(num) {
    if (typeof(num)=='number') return num;
}

function getSurveyPercentile(answers) {
    let total=0,interval=0;
    let msg="";
    for (let i=0; i<answers.answers.length; i++) total+= valueOf(answers.answers[i]);
    msg=" Totaling your survey, ... the raw total is "+total+". ";
    switch (total) {
    case 0: interval=100.000; break;
    case 1: interval=92.340; break;
    case 2: interval=85.257; break;
    case 3: interval=80.550; break;
    case 4: interval=76.776; break;
    case 5: interval=73.472; break;
    case 6: interval=70.426; break;
    case 7: interval=67.516; break;
    case 8: interval=64.664; break;
    case 9: interval=61.815; break;
    case 10: interval=58.930; break;
    case 11: interval=55.985; break;
    case 12: interval=52.965; break;
    case 13: interval=49.858; break;
    case 14: interval=46.652; break;
    case 15: interval=43.335; break;
    case 16: interval=39.902; break;
    case 17: interval=36.363; break;
    case 18: interval=32.735; break;
    case 19: interval=29.009; break;
    case 20: interval=25.103; break;
    case 21: interval=20.805; break;
    case 22: interval=15.633; break;
    case 23: interval=8.104; break;
    case 24: interval=0.0; break;
    }
    msg += " Your interval percent is "+interval+". ";
    if (interval > 70) msg+= " Good for you! Have a nice day and remember the people that love you.";
    if (interval < 50) msg+= " Hmmm, seems like you need to work on your exercises more! ";
    return msg;
}    

function handleSMSSurvey(user, msg) {
    msg = msg.toLowerCase().trim();
    console.log('handleSMSSurvey: user:'+user,' state:'+user.state+' msg:'+msg);
    let val = -1;
    switch (user.state) {
    case 'prestart':
// \uD83D\uDE00");   emoji
	sendSMS(user.phone, "Greetings "+user.name+". "+user.doctor+" would like you to start your HIP survey now. Please respond 'OK'. ");
	user.state = 'start';
	user.questionNumber = 0;
	break;
    case 'start':
	if (msg.indexOf('ok')==0 || msg.indexOf('yes')==0) {
	    msg = "****\rAnswer by-number with 0=No pain, 1=Mild, 2=Moderate, 3=Severe, 4=Extreme\r****\r";
	    msg += user.survey.questions[user.questionNumber].question;
	    sendSMS(user.phone, msg);
	    user.state = "answering";
	}
	else
	    sendSMS(user.phone, "You're not being nice. I politely said to answer OK.  Try again. Say OK.");
	break;
    case 'answering':
	if (msg.length == 1) val=msg.charAt(0)-'0';
	if (val < 0 || val > 4)
	    sendSMS(user.phone,"Oh man, you're being silly!  I said to answer between 0 and 4.  Go, your turn, get it right please...this is very important to "+user.doctor);
	else {
	    user.answers.answers.push(val);
	    switch (val) {
	    case 0: msg="EXCELLENT!"; break;
	    case 1: msg="That's good."; break;
	    case 2: msg="Ok, fine."; break;
	    case 3: msg="Oh, yuck."; break;
	    case 4: msg="Uhg, that's horrible, sorry!"; break;
	    default: msg="We had an ERROR";
	    }
	    msg+=" ";
	    user.questionNumber++;
	    if (user.questionNumber >= user.survey.questions.length) {
		msg+="Thank you! All done for now. ";
		msg+=getSurveyPercentile(user.answers);
		user.state='prestart';
	    }
	    else msg+=user.survey.questions[user.questionNumber].question;
	    sendSMS(user.phone, msg);
	}
	break;
    default:
	console.log('UHG! Unknown state!');
    }
}


function makeValidPhone(phone) {
    phone=phone.replace(/-/g,'');
    phone=phone.replace('(','');
    phone=phone.replace(')','');
    if (phone.charAt(0)!='+')
	if (phone.charAt(0)!='1') phone='+1'+phone;
    else
	phone='+'+phone;
    return phone;
}

function addReminder(subjectID, reminder, nextFunc) {
    findSubject(subjectID, (err, subject) => {
	console.log('err:',err,' subject:',subject);
	subject.interactions.reminders.selections.push(reminder);
	updateSubject(subjectID, subject, (err, data) => {
	    console.log("Update err:",err);
	    nextFunc(err);
	});
    });
}

function addSurvey(subjectID, survey, nextFunc) {
    findSubject(subjectID, (err, subject) => {
	console.log('err:',err,' subject:',subject);
	subject.interactions.surveys.push(survey);
	updateSubject(subjectID, subject, (err, data) => {
	    console.log("Update err:",err);
	    nextFunc(err);
	});
    });
}

function addCalendar(subjectID, calendar, nextFunc) {
    findSubject(subjectID, (err, subject) => {
	console.log('err:',err,' subject:',subject);
	if (!subject.interactions.calendar) subject.interactions.calendar=[];
	subject.interactions.calendar.push(calendar);
	updateSubject(subjectID, subject, (err, data) => {
	    console.log("Update err:",err);
	    nextFunc(err);
	});
    });
}

function handleMyLifeCommand(req, user, subjectID) {
    // Let's first see if this is a "command" to mylife instead of just a msg to a subject
    let words=req.body.Body.split(" ");
    console.log('handleMyLifeCommand: words[0]:'+words[0]);
    if (!words.length || words[0].toLowerCase()!='mylife') return false;
    // Its a command for us
    console.log("Got a 'mylife' command");
    if (words.length == 1) {
	sendSMS(req.body.From,"Hi. After 'mylife' you can say one-of: friend, reminder, survey, likes.");
	return true;
    }
    switch (words[1].toLowerCase()) {
    case 'reminder':
	if (words.length == 2)
	    sendSMS(req.body.From,"Hi. After 'mylife reminder' please write the reminder sentence");
	else {
	    let reminder="";
	    for (let i=2; i<words.length; i++) reminder+=words[i]+" ";
	    addReminder(subjectID, reminder, (err) => {
		if (!err) sendSMS(req.body.From,"Reminder added; thank-you!");
		else sendSMS(req.body.From,"Failed, database error:"+err);
	    });
	}
	break;	
    case 'survey':
	console.log("Adding a survey");
	const surveys="pain, happiness, social, adl";
	if (words.length != 3)
	    sendSMS(req.body.From,"Hi. After 'mylife survey' please write the survey name. Current survey names are: "+surveys+".");
	else {
	    if (surveys.indexOf(words[2])==-1) {
		sendSMS(req.body.From,"Sorry, that survey name '"+words[2]+"' is not one I recognize.");
		break;
	    }
	    addSurvey(subjectID, words[2].toLowerCase().trim()+":"+req.body.From+":"+user.contact.firstName, (err) => {
		if (!err) sendSMS(req.body.From,"Survey added; thank-you!");
		else sendSMS(req.body.From,"Failed, database error:"+err);
	    });
	}
	break;
    case 'appointment':
    case 'appt':
    case 'calendar':
	console.log("Adding a calendar event");
	if (words.length < 3)
	    sendSMS(req.body.From,"Hi. After 'mylife "+words[1]+"' please write date&time and then the message for the calendar entry.");
	else {
	    let str="";
	    for (let i=2; i<words.length; i++) str+=words[i]+' ';
	    let result=decodeCalendarEvent(str);
	    console.log('Result:',result);
	    if (typeof result == 'string')
		sendSMS(req.body.From,result);
	    else {
		addCalendar(subjectID, result, (err) => {
		    if (!err) sendSMS(req.body.From,"Calendar added; thank-you!");
		    else sendSMS(req.body.From,"Failed, database error:"+err);
		});
	    }
	}
	break;
    case 'friend':
	console.log("Adding a friend");
	if (words.length != 4)
	    sendSMS(req.body.From,"Hi. After 'mylife friend' please write the friend's first name and phone#");
	else {
	    let firstName=words[2];
	    let phone=makeValidPhone(words[3]);
	    updateUser(phone, firstName, subjectID, (err, data) => {
		if (!err) {
		    sendSMS(req.body.From,"Added friend, firstName="+firstName+" phone="+phone+" tied to subject:"+subjectID);
		    sendSMS(phone,"Greetings. You've been added as a MyLife Friend to "+subjectID+". Save this phone number. Use it to send messages to your friend.");
		}
		else
		    sendSMS(req.body.From,"Error adding friend, err:"+err);
	    });
	}
	break;
    default:
	sendSMS(req.body.From,"Hi. I didn't understand. After 'mylife' you can say one-of: friend, reminder, survey, appointment.");
    }
    
    return true;
}

function createSubject(subjectID, notifyNumber) {
    console.log("Creating subject "+subjectID);
    // First copy 'ChrisDemo1'
    findSubject('ChrisDemo1', (err, subject) => {
	console.log('err:',err,' subject:',subject);
	subject.ID = subjectID;
	subject.contact.firstName = subjectID;
	subject.deviceID = '1234'
	updateSubject(subjectID, subject, (err, data) => {
	    console.log("Update err:",err);
	    sendSMS(notifyNumber,'Result of add:'+err+' device temporary ID is '+subject.deviceID);
	});
    });
}

function updateSubjectAttributes(req, words) {
    let subjectID = words[2];
    console.log("UpdateSubjectAttributes");
    for (let i=3; i<words.length; i++) {
	let keyvalue=words[i].split("=");
	console.log("updating key ["+keyvalue[0]+"] to value ["+keyvalue[1]+"]");
	updateSubjectAttributeOnly(subjectID, 
				   keyvalue[1],
				   keyvalue[0], (err,data) => {
				       console.log('result of put err:',err,' data:',data);
				       sendSMS(req.body.From,"Result of key "+keyvalue[0]+" is:"+err);
			       });
    }
}

function handleMyLifeSystemCommand(req) {
    let words=req.body.Body.split(" ");
    let subjectID=words[2];
    console.log('handleMyLifeSystemCommand: words[0]='+words[0]);
    if (!words.length || words[0].toLowerCase()!='cjs') return false;
    // Its a command for us
    console.log("Got a 'mylife' SYSTEM command");
    if (words.length == 1) {
	sendSMS(req.body.From,"Hi. After 'cjs' you can say 'subject' plus subjectID plus 'create' or attribute=value --OR-- "+
	   "You can say 'friend' plus subjectID firstName phone --OR-- 'blast' plus subjectID message-to-friends .");
	return true;
    }
    switch (words[1].toLowerCase()) {
    case 'friend':
	if (words.length != 5) {
	    sendSMS(req.body.From,"Missing values(s). Expected either 'cjs friend subjectID firstName phone");
	    break;
	}
	let firstName=words[3];
	let phone=makeValidPhone(words[4]);
	updateUser(phone, firstName, subjectID, (err, data) => {
	    if (!err) {
		sendSMS(req.body.From,"Added friend, firstName="+firstName+" phone="+phone+" tied to subject:"+subjectID);
		sendSMS(phone,"Greetings. You've been added as a MyLife Friend to "+subjectID+". Save this phone number. Use it to send messages to your friend.");
	    }
	    else
		sendSMS(req.body.From,"Error adding friend, err:"+err);
	});
	break;
    case 'subject':
	if (words.length < 4) {
	    sendSMS(req.body.From,"Missing values(s). Expected either 'subjectID create' or 'subjectID key=value'");
	    break;
	}
	if (words[3].toLowerCase()=='create')
	    createSubject(subjectID,req.body.From);
	else
	    updateSubjectAttributes(req, words);
	break;
    case 'blast':
	if (words.length < 4) {
	    sendSMS(req.body.From,"Missing values(s). Expected either 'subjectID msg-to-friends'");
	    break;
	}
	msg=words.slice(2);
	messageFriends(req.body.From,subjectID, msg.join(" "));
	break;
    default:
	sendSMS(req.body.From,"Sorry, unknown key word:"+words[1]);
    }
    return true;
}






app.post('/sms', (req, res) => {
    console.log('Hey, we got some message! From:',req.body.From);

    // First, let's see if the in-coming phone is stakutis or batulis AND is a command
    if (req.body.From == '+19787643488' || req.body.From == '+16128023116') {
	let done=true;
	console.log('Got a message from Stakutis or Batulis');
	let parts=req.body.Body.split(" ");
	parts[0]=parts[0].toLowerCase();
	if (parts[0]=='?') {
	    sendSMS(req.body.From, 'Try these:\r***\r  add phoneNum patientFirstName doctorName\r       OR\r  start phoneNum\r***');
	}
	else
	    if (parts[0]=="add") {
		var phone=parts[1], name=parts[2], doctor=parts[3];
		phone=makeValidPhone(phone);
		if (parts.length==4) doctor="Dr. "+doctor;
		if (parts.length>4) doctor=doctor + " " + parts[4];
		console.log('Adding: phone:'+phone+' name:'+name+' doctor:'+doctor);
		addActiveUser(phone, name, doctor);
		sendSMS(req.body.From,"User "+name+" at phone "+phone+" with doctor "+doctor+" has been added; do a START when ready.");
	    }
	else
	    if (parts[0]=="start") {
		let user=activeUsers[makeValidPhone(parts[1])];
		if (!user) sendSMS(req.body.From,"User is not known; I'm wicked sorry for ya pal. Take a lesson in typing or get a better job.");
		else {
		    user.state = 'prestart';
		    handleSMSSurvey(user,'');
		    sendSMS(req.body.From,"User has been sent activation");
		}
	    }
	else
	    done = false;
	if (done) {
	    res.writeHead(200, {'Content-Type': 'text/xml'});
	    res.end();
	    return;
	}
    }

    // Next, see if the in-coming phone is an SMS user; if so process, else process as MyLife
    const user=activeUsers[req.body.From];
    if (user)
	handleSMSSurvey(user, req.body.Body);
    else
	if (!handleMyLifeSystemCommand(req)) {
	    if (awaitChoice[req.body.From]) {
		// First make sure not timed-out
		console.log("We are in awaitChoice...");
		if (new Date() - awaitChoice[req.body.From] > 15*1000) {
		    console.log('awaitChoice timed out, removing')
		    awaitChoice[req.body.From]=null;
		}
		else {
		    req.body.Body=req.body.Body.trim().toLowerCase();
		    console.log("Looking for patient:"+req.body.Body);
		    for (let i=0; i<awaitChoice[req.body.From].users.length; i++) {
			console.log('comparing ['+awaitChoice[req.body.From].users[i].subjectID.toLowerCase()+'] to ['+
				    req.body.Body+']');
			if (awaitChoice[req.body.From].users[i].subjectID.toLowerCase() ==
			    req.body.Body) {
			    let user=awaitChoice[req.body.From].users[i];
			    console.log('Found patient! '+awaitChoice[req.body.From].users[i].subjectID);
			    req.body.Body = awaitChoice[req.body.From].msg; // hack; so handleMyLifeCommand has the original
			    if (!handleMyLifeCommand(req, user, user.subjectID))  {
				sendMessageToPatient(
				    user.subjectID,
				    user.contact.firstName,
				    req.body.From,
				    awaitChoice[req.body.From].msg);
				sendSMS(req.body.From,"Message sent to "+awaitChoice[req.body.From].users[i].subjectID);
			    }
			    awaitChoice[req.body.From]=null;
			    return;
			}
		    }
		    console.log('Cound not find the patient!');
		    sendSMS(req.body.From,"Patient "+req.body.Body+" not found; try again.");
		    return;
		}
	    }
	    console.log('non system command, lookingup patients for this user');
	    findUserByPhone(req.body.From, function (err, users) {
		if (err) console.log('Error reading Users table:',err);
		else 
		    if (!users || users.length==0)
			console.log('No users matching the incoming phone number '+req.body.From);
		if (users.length>1) {
		    console.log("Multiple users detected for incoming phone number");
		    let msg="Pick which patient: ";
		    for (let i=0; i<users.length; i++) {
			msg+=users[i].subjectID+" ";
		    }
		    awaitChoice[req.body.From] = {
			users: users,
			msg: req.body.Body,
			time: new Date()};
		    sendSMS(req.body.From, msg);
		}
		else {
		    let user=users[0];
		    console.log('Will search for subject: '+user.subjectID);
		    if (!handleMyLifeCommand(req, user, user.subjectID))  {
			sendMessageToPatient(user.subjectID,
					     user.contact.firstName,
					     user.phone.split('-')[0],
					     req.body.Body);
		    }
		}
	    });
	}

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end();
});


function sendMessageToPatient(subjectID, fromFirstName, fromPhone, msg) {
    findSubjectAttributeOnly(subjectID,"interactions.messages",(err,subject)=>{
	if (err) {
	    console.log("ERROR finding subject!");
	    return;
	}
	if (!subject) {
	    console.log("ERROR sendMessageToPatient: Could not find subject "+subjectID);
	    return;
	}
	subject.interactions.messages.push(
	    {
		from: fromFirstName,
		userPhone: fromPhone,
		msg: msg
	    });
	updateSubjectAttributeOnly(subjectID, 
				   subject.interactions.messages, 
				   "interactions.messages", (err,data) => {
				       console.log('result of put err:',err,' data:',data);
				   });
    });
}

app.get('/', (req, res) => {
    console.log('Hey, we got a GET! of / ');

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end("happy happy");
});



function updateUser(phone, firstName, subjectID, nextFunc) {
 let docClient = new AWS.DynamoDB.DocumentClient(region);
  const params = {
      TableName: 'MyLife_Users',
      Key: {"phone":phone},
      UpdateExpression: "set #s = :s, #c = :f",
      ExpressionAttributeNames: {"#s":"subjectID", "#c":"contact"},
      ExpressionAttributeValues: { ":s":subjectID, ":f":{ firstName: firstName}}
  };
  console.log('...params:',params);
  docClient.update(params, (err, data) => {
        if (err) {
            console.error("!!!! Unable to update item. Error JSON:", err);
        }
        nextFunc(err, data.Item);
    });  
}


function getMonth(str) {
    str=str.toLowerCase(str);
    switch (str) {
    case 'jan':
    case 'january': return '01';
    case 'feb':
    case 'february': return '02';
    case 'mar':
    case 'march': return '03';
    case 'apr':
    case 'april': return '04';
    case 'may': return '05';
    case 'jun':
    case 'june': return '06';
    case 'jul':
    case 'july': return '07';
    case 'aug':
    case 'august': return '08';
    case 'sep':
    case 'september': return '09';
    case 'oct':
    case 'october': return '10';
    case 'nov':
    case 'november': return '11';
    case 'dec':
    case 'december': return '12';
    default: return null;
    }
}

function convertMiscDateStringToUTC(incoming) {
    /*
      Handle these various formats
      Jun[e] XX[th,st,nd,rd,,] [YYYY] 3:00[ ]{am/pm}
      Jun 5th 3:00  (no year)
      6-4[-2018] 3:15[ ]{am/pm}
      6/4[/2018]

      if no am/pm:
      if 7..HH..11 assume am
      if 12..HH..6 assume pm
    */
    //console.log('convert from:'+str);
    let str=incoming;
    try {
	str = str.replace(',','');  // Strip out commas
	str = str.replace('@','');  // Strip out at
	str = str.replace('at','');  // Strip out at
	let parts=str.split(' ');
	let month, day, year;
	let mmddyyy, timeStr;
	parts[0]=parts[0].replace('-','/');  // Coerce to use slash if at all
	mmddyyyy = parts[0].split('/');
	//console.log('mmddyyyy:'+mmddyyyy);

	/*
	 * First, see if it is a numeric format like:
	 *   6/4/2018
	 *   6/4/2018 3:00
	 *   6/4/2018 3:00pm
	 *   6/4/2018 3:00 pm
	 *   6/4 3:00pm
	 */
	if (mmddyyyy.length > 1) {
	    //console.log('It is a digit-date');
	    month=mmddyyyy[0];
	    day=mmddyyyy[1];
	    /** See if year is present **/
	    if (mmddyyyy.length > 2) {
		year=mmddyyyy[2];
	    }
	    else {
		/** No year present **/
		year=''+(new Date().getFullYear());
	    }
	    /** Now, accumulate all the time string fields for the bottom part of processing **/
	    if (parts.length < 2)   // Missing time stamp entirely
		timeStr = "12:00pm";
	    else {
		/* Recall, could be: "3:00" "3:00am" "3:00 am" */
		timeStr = parts[1];
		if (parts.length == 3) timeStr+=parts[2];  // Force '3:00 pm' to '3:00pm'
	    }
	}
	else {
	    /* Format is one of:
	       Jun 4th 2018 timeStr
	       Jun 3 timeStr
	    */
	    month=getMonth(parts[0]);
	    //console.log('Parse month:',month);
	    if (parts.length==1) return null;  // User didn't specify DD or rest
	    parts[1]=parts[1].toLowerCase();
	    /* Rip-off any decorators */
	    parts[1]=parts[1].replace('th','');
	    parts[1]=parts[1].replace('st','');
	    parts[1]=parts[1].replace('dn','');
	    parts[1]=parts[1].replace('rd','');
	    day=parts[1];
	    //console.log('day is:'+day);
	    if (parts.length==2) {
		// User only specified: June 12 ; so assume current year and noon
		year=''+(new Date().getFullYear());
		timeStr="12:00pm";
	    } 
	    else {
		year=parts[2];
		// They might not have specified the year!
		let intYear=parseInt(year);
		if (intYear<2018 || intYear>2025) {
		    // E.g. Jun 15 3:00 pm
		    timeStr=year;
		    year=''+new Date().getFullYear();
		    if (parts.length==4) timeStr+=parts[3];
		}
		else  {
		    if (parts.length==3) { // User gave no time so assume noon
			timeStr ="12:00pm";
		    } else {
			timeStr=parts[3];
			if (parts.length==5) timeStr+=parts[4]; // Force '3:00 pm' to '3:00pm'
		    }
		}
	    }
	}

	/* Ok, timeStr might be: '3:00' or '3:00a.m.' or '3:00am' or '3pm' */
	timeStr=timeStr.toLowerCase();
	timeStr.replace('a.m.','am');
	timeStr.replace('p.m.','pm');
	if (timeStr.indexOf('am') == -1 && timeStr.indexOf('pm') == -1) {
	    /*
              if 7..HH..11 assume am
	      if 12..HH..6 assume pm
	    */
	    let hh_int = parseInt(timeStr.split(':')[0]);
	    if (hh_int >=7 && hh_int <=11) timeStr+="am";
	    else
		if (hh_int >=12 && hh_int <=6) timeStr+="pm";
	    else return null;  // Can't happen
	}
	timeStr=timeStr.replace('am',' am');
	timeStr=timeStr.replace('pm',' pm');

	/* Let's see if they didn't use a colon in the time */
	if (timeStr.indexOf(':')==-1) {
	    timeStr=timeStr.split(' ')[0]+':00 '+timeStr.split(' ')[1];
	}

	/* Let's see if they are asking for a month into next year */
	let curMonth=new Date().getMonth()+1;
	let intMonth=parseInt(month);
	if (intMonth < curMonth)
	    year=''+(parseInt(year)+1);

	let dateStr=month+'-'+day+'-'+year+' '+timeStr;
	//console.log("Using:"+dateStr);
	let UTC=new Date(dateStr);
	//console.log("UTC:"+UTC);
	//console.log("---Str:"+new Date(UTC));
	console.log('Incoming:['+incoming+'] result:['+UTC+']');
	return UTC;
    } catch (e) {
	console.log('Failed:'+e);
	return null;
    }
}

function convertMiscDateStringInLocaleToUTC(str) {
    console.log('convertMiscDateStringInLocaleToUTC:'+str);
    let d=convertMiscDateStringToUTC(str);
    if (!d) return null; // Failed to convert dateStr
    console.log('  as New Date():'+new Date(d));
    d = d.getTime() + 4*60*60*1000;
    let dd=new Date(); dd.setTime(d);
    console.log('  as      shift:'+dd);
    console.log('Minutes from now:'+(d - new Date().getTime())/1000/60);
    return d;
}

convertMiscDateStringToUTC('Jun 4, 2018');
convertMiscDateStringToUTC('JULY 14, 2018 11:00');
convertMiscDateStringToUTC('6/4/2018');
convertMiscDateStringToUTC('6/4/2018 3 pm');
convertMiscDateStringToUTC('6/4/2018 3pm');
convertMiscDateStringToUTC('6/4/2018 3:00');
convertMiscDateStringToUTC('6/4/2018 3:00pm');
convertMiscDateStringToUTC('6/4/2018 3:00 pm');
convertMiscDateStringToUTC('6/4 3:00pm');
convertMiscDateStringToUTC('1/4 3:00pm');

let d=convertMiscDateStringInLocaleToUTC('jun 19 8:10am');

function decodeCalendarEvent(str) {
    console.log('Decoding the calendar event:'+str);
    /* Find the am or pm or colon and split in 1/2 */
    let i;
    i=str.indexOf('am');
    if (i == -1) i=str.indexOf('AM');
    if (i == -1) i=str.indexOf('pm');
    if (i == -1) i=str.indexOf('PM');
    if (i == -1) {
	i = str.indexOf(':');  // time stamp part
	if (i==-1) return "Failed to find the calendar message text";  // failure
    }
    i=i+3;
    let dateStr=str.substr(0,i);
    let msg=str.substr(i);
    console.log('dateStr['+dateStr+'] msg:'+msg);
    let dd=convertMiscDateStringInLocaleToUTC(dateStr);
    if (!dd) return "Could not understand the date and time";
    return {date:dd, msg:msg};
}

decodeCalendarEvent('6/4/2018 3 pm Wish me luck');

try {
    activeUsers = JSON.parse(fs.readFileSync('activeUsers.json','utf-8'));
} catch (e) {console.log("could not read active SMS user file");}
const port=80;
console.log("Starting the web server...");
http.createServer(app).listen(port, () => {
    console.log('Express server listening on port '+port);
});



