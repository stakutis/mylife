var AWS = require('aws-sdk');
let region=    {
            region: 'us-east-1',
            accessKeyId: 'AKIAJGWD2X3CMS3BKLRQ',
            secretAccessKey: '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'};

  let docClient = new AWS.DynamoDB.DocumentClient(region);
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

app.post('/sms', (req, res) => {
    console.log('Hey, we got some message! req:',req.body);
  const twiml = new MessagingResponse();

  twiml.message('The Robots are coming chris! Head for the hills!');

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

app.get('/', (req, res) => {
    console.log('Hey, we got a GET! req:',req);

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end("happy happy");
});

const port=80;
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port {port}`);
});
