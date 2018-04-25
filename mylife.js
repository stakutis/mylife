var AWS = require('aws-sdk');
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

  console.log('reading items from Subjects DynamoDB table');
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

  console.log('reading items from Subjects DynamoDB table');
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
            console.error("Unable to read item. Error JSON:", err);
        } else {
            console.log("scan succeeded: data:");
            console.log(data);
        }
        nextFunction(err, data.Item);
    });  

  return null;
}

app.post('/sms', (req, res) => {
    console.log('Hey, we got some message! From:',req.body.From);
    findUserByPhone(req.body.From, function (err, user) {
	if (err) console.log('Error reading Users table:',err);
	else 
	if (!user) console.log('No users matching the incoming phone number '+req.body.From);
	else {
	    console.log('Will search for user: '+user.subjectID);
	    findSubjectAttributeOnly(user.subjectID,"interactions.messages",(err,subject)=>{
		console.log("find: got: data:",subject);
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
		})
	    });
	}
    });

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end();
/*
    const twiml = new MessagingResponse();

    twiml.message('The Robots are coming chris! Head for the hills!');

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());
*/
});

app.get('/', (req, res) => {
    console.log('Hey, we got a GET! req:',req);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end("happy happy");
});

const port=80;
console.log("Starting the web server...");
http.createServer(app).listen(port, () => {
  console.log('Express server listening on port '+port);
});
