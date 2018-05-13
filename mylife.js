var AWS = require('aws-sdk');
const fs = require('fs');
var request = require('request');
let region=    {
            region: 'us-east-1',
            accessKeyId: 'AKIAJGWD2X3CMS3BKLRQ',
            secretAccessKey: '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'};


/*
  let params = {
    TableName : "MyLife_Subjects",
      Key: {ID:"Richard"},
      UpdateExpression: "set interactions.messages[0] = :r",
      ExpressionAttributeValues: {
	  ":r" : "life is good"
},
    Item : {
	ID : "Richard",
	contact : "Fish"
    }
  };
  console.log("**************************** Updating Subject Database VIA PUT ******************************");
  docClient.update(params, (err,data) => {
    if (err) {
      console.log("Error updating subject table:",err);
    } else console.log("Finished write, data:",data);
  });
*/

/*
  let params = {
    TableName : "MyLife_Subjects",
      Key: {"ID":"Richard"},
//      AttributesToGet: ["contact","core","interactions"]
//      ProjectionExpression: "contact,core,interactions.reminders.selections[1],caregiverID"
  };
  console.log("**************************** Updating Subject Database VIA PUT ******************************");
  docClient.get(params, (err,data) => {
   if (err) {
      console.log("Error getting subject table:",err);
    } else console.log("Finished get, data:",data);
  });
*/
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
        Key: {"phone":phone},
        ConsistentRead: false,
        ReturnConsumedCapacity: "TOTAL"
  };
  console.log('scanning with params:',params);
  docClient.get(params, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", err);
        } else {
//            console.log("scan succeeded: data:");
//            console.log(data);
        }
        nextFunction(err, data.Item);
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
  console.log('findSubjectAttributeOnly: ',ID);

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
  console.log('findSubjectAttributeOnly: ',ID);

  const params = {
        TableName: 'MyLife_Subjects',
        Key: {"ID":ID},
        UpdateExpression: "set "+attribute+" = :r",
        ExpressionAttributeValues: { ":r":data},
        ReturnConsumedCapacity: "TOTAL"
  };
  console.log('scanning with params:',params);
  docClient.update(params, (err, data) => {
        if (err) {
            console.error("Unable to update item. Error JSON:", err);
        } 
        nextFunction(err, data.Item);
    });  

  return null;
}

function sendSMS(toNumber, msg, nextFunc) {
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

function handleMyLifeCommand(req, user, subjectID) {
    // Let's first see if this is a "command" to mylife instead of just a msg to a subject
    let words=req.body.Body.split(" ");
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
	sendSMS(req.body.From,"Hi. I didn't understand. After 'mylife' you can say one-of: friend, reminder, survey, likes.");
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
	findUserByPhone(req.body.From, function (err, user) {
	    if (err) console.log('Error reading Users table:',err);
	    else 
		if (!user) console.log('No users matching the incoming phone number '+req.body.From);
	    else {
		console.log('Will search for subject: '+user.subjectID);
		if (!handleMyLifeCommand(req, user, user.subjectID))  {
		    findSubjectAttributeOnly(user.subjectID,"interactions.messages",(err,subject)=>{
			if (err) console.log("ERROR finding subject!");
			subject.interactions.messages.push(
			    {
				from: user.contact.firstName,
				userPhone: user.phone,
				msg: req.body.Body
			    });
			updateSubjectAttributeOnly(user.subjectID, 
						   subject.interactions.messages, 
						   "interactions.messages", (err,data) => {
						       console.log('result of put err:',err,' data:',data);
						   });
		    });
		}
	    }
	});

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end();
});

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


try {
    activeUsers = JSON.parse(fs.readFileSync('activeUsers.json','utf-8'));
} catch (e) {console.log("could not read active SMS user file");}
const port=80;
console.log("Starting the web server...");
http.createServer(app).listen(port, () => {
    console.log('Express server listening on port '+port);
});

