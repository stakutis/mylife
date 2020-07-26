var AWS = require("aws-sdk");
const fs = require("fs");
var request = require("request");
// Todo: Read the  ".env" file and use dotenv
let region = {
  region: "us-east-1",
  accessKeyId: processs.env.accessKeyId,
  secretAccessKey: processs.env.secretAccessKey,
};
let mytime = require("./mytime");

let awaitChoice = {};

const surveys = [
  {
    defaultAck: "That's great,OK,,Yick,Oh I'm sorry",
    defaultExpect:
      "none|no|no no|no not|not, mild|mile, moderate, severe, extreme",
    frequency: "always",
    lastCompletedDate: {},
    library: "LibraryQuestionnaireHip",
    name: "KOOS",
    questions: [
      {
        question: "Tell me about Going up and down stairs?",
      },
      {
        question: "How about walking on an uneven surface?",
      },
      {
        question: "Rising from sitting?",
      },
      {
        question: "Bending to the floor or pick up an object?",
      },
      {
        question: "Lying in bed, turning over, maintaining hip position?",
      },
      {
        question: "Sitting?",
      },
    ],
    startingMessage:
      "Tell me about your hip pain. For each question, please say one of the following:, none, mild, moderate, severe, extreme",
  },
];

let activeUsers = {};

const http = require("http");
const express = require("express");
const MessagingResponse = require("twilio").twiml.MessagingResponse;

const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function findUserByPhone(phone, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log("findUserByPhone: ", phone);

  console.log("reading items from Users DynamoDB table");
  const params = {
    TableName: "MyLife_Users",
    FilterExpression: "begins_with(phone, :phone)",
    ExpressionAttributeValues: {
      ":phone": phone,
    },
  };
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
  console.log("findSubjectAttributeOnly: ", ID);

  const params = {
    TableName: "MyLife_Subjects",
    Key: { ID: ID },
    //        AttributesToGet: [attribute.split('.')[0]],
    ProjectionExpression: attribute,
    ConsistentRead: false,
    ReturnConsumedCapacity: "TOTAL",
  };
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
  console.log("****MessageFriends subject:" + subjectID + " msg:" + msg);
  let sentTo = "";

  const params = {
    TableName: "MyLife_Users",
    FilterExpression: "#subjectIDName = :subjectID ",
    ExpressionAttributeNames: {
      "#subjectIDName": "subjectID",
    },
    ExpressionAttributeValues: {
      ":subjectID": subjectID,
    },
  };
  docClient.scan(params, (err, data) => {
    if (err) {
      console.error("Unable to read item. Error JSON:", err);
    } else {
      msg =
        "[MyLife] " +
        msg +
        " ; *** NOTE: Do not respond to this message; messages sent to this number go to your patient. ***";
      for (let i = 0; i < data.Items.length; i++) {
        let user = data.Items[i];
        sentTo += " " + user.contact.firstName;
        sendSMS(user.phone, msg);
      }
      sendSMS(respondTo, "Messsages sent to:" + sentTo);
    }
  });
}

function findSubject(ID, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log("findSubject: ", ID);

  console.log("reading items from Subjects DynamoDB table");
  const params = {
    TableName: "MyLife_Subjects",
    Key: { ID: ID },
    ConsistentRead: false,
  };
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
  console.log("updateSubject: ", ID);
  const params = {
    TableName: "MyLife_Subjects",
    Item: data,
  };
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
  console.log("updateSubjectAttributeOnly: ", ID);

  const params = {
    TableName: "MyLife_Subjects",
    Key: { ID: ID },
    UpdateExpression: "set " + attribute + " = :r",
    ExpressionAttributeValues: { ":r": data },
  };
  docClient.update(params, (err, data) => {
    if (err) {
      console.error("Unable to update item. Error JSON:", err);
    }
    nextFunction(err, data ? data.Item : null);
  });

  return null;
}

function sendSMS(toNumber, msg, nextFunc) {
  toNumber = toNumber.split("-")[0];
  console.log("will send [" + msg + "] to number:", toNumber);
  //ToDo: use dotenv and .env to fix the below  code
  request.post(
    "https://api.twilio.com/2010-04-01/Accounts/AC6203fa66f81b40708bbc4810c28fe049/Messages",
    {
      body: "&From=+16179968873&To=" + toNumber + ",&Body=" + msg,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      auth: {
        user: "AC6203fa66f81b40708bbc4810c28fe049",
        pass: process.env.twilio,
      },
    },
    (err, resp, body) => {
      if (err) console.log("FAILED to send message:", err);
      nextFunc && nextFunc(err, body);
    }
  );
  return;
}

function addActiveUser(phone, name, doctor) {
  activeUsers[phone] = {
    name: name,
    phone: phone,
    state: "prestart",
    survey: surveys[0],
    doctor: doctor,
    questionNumber: 0,
    answers: { answers: [] },
    timeStarted: new Date(),
  };
  let result = fs.writeFileSync(
    "activeUsers.json",
    JSON.stringify(activeUsers)
  );
  console.log("resul of file-writet:", result);
  return activeUsers[phone];
}

function valueOf(num) {
  if (typeof num == "number") return num;
}

function getSurveyPercentile(answers) {
  let total = 0,
    interval = 0;
  let msg = "";
  for (let i = 0; i < answers.answers.length; i++)
    total += valueOf(answers.answers[i]);
  msg = " Totaling your survey, ... the raw total is " + total + ". ";
  switch (total) {
    case 0:
      interval = 100.0;
      break;
    case 1:
      interval = 92.34;
      break;
    case 2:
      interval = 85.257;
      break;
    case 3:
      interval = 80.55;
      break;
    case 4:
      interval = 76.776;
      break;
    case 5:
      interval = 73.472;
      break;
    case 6:
      interval = 70.426;
      break;
    case 7:
      interval = 67.516;
      break;
    case 8:
      interval = 64.664;
      break;
    case 9:
      interval = 61.815;
      break;
    case 10:
      interval = 58.93;
      break;
    case 11:
      interval = 55.985;
      break;
    case 12:
      interval = 52.965;
      break;
    case 13:
      interval = 49.858;
      break;
    case 14:
      interval = 46.652;
      break;
    case 15:
      interval = 43.335;
      break;
    case 16:
      interval = 39.902;
      break;
    case 17:
      interval = 36.363;
      break;
    case 18:
      interval = 32.735;
      break;
    case 19:
      interval = 29.009;
      break;
    case 20:
      interval = 25.103;
      break;
    case 21:
      interval = 20.805;
      break;
    case 22:
      interval = 15.633;
      break;
    case 23:
      interval = 8.104;
      break;
    case 24:
      interval = 0.0;
      break;
  }
  msg += " Your interval percent is " + interval + ". ";
  if (interval > 70)
    msg +=
      " Good for you! Have a nice day and remember the people that love you.";
  if (interval < 50)
    msg += " Hmmm, seems like you need to work on your exercises more! ";
  return msg;
}

function handleSMSSurvey(user, msg) {
  msg = msg.toLowerCase().trim();
  console.log(
    "handleSMSSurvey: user:" + user,
    " state:" + user.state + " msg:" + msg
  );
  let val = -1;
  switch (user.state) {
    case "prestart":
      // \uD83D\uDE00");   emoji
      sendSMS(
        user.phone,
        "Greetings " +
          user.name +
          ". " +
          user.doctor +
          " would like you to start your HIP survey now. Please respond 'OK'. "
      );
      user.state = "start";
      user.questionNumber = 0;
      break;
    case "start":
      if (msg.indexOf("ok") == 0 || msg.indexOf("yes") == 0) {
        msg =
          "****\rAnswer by-number with 0=No pain, 1=Mild, 2=Moderate, 3=Severe, 4=Extreme\r****\r";
        msg += user.survey.questions[user.questionNumber].question;
        sendSMS(user.phone, msg);
        user.state = "answering";
      } else
        sendSMS(
          user.phone,
          "You're not being nice. I politely said to answer OK.  Try again. Say OK."
        );
      break;
    case "answering":
      if (msg.length == 1) val = msg.charAt(0) - "0";
      if (val < 0 || val > 4)
        sendSMS(
          user.phone,
          "Oh man, you're being silly!  I said to answer between 0 and 4.  Go, your turn, get it right please...this is very important to " +
            user.doctor
        );
      else {
        user.answers.answers.push(val);
        switch (val) {
          case 0:
            msg = "EXCELLENT!";
            break;
          case 1:
            msg = "That's good.";
            break;
          case 2:
            msg = "Ok, fine.";
            break;
          case 3:
            msg = "Oh, yuck.";
            break;
          case 4:
            msg = "Uhg, that's horrible, sorry!";
            break;
          default:
            msg = "We had an ERROR";
        }
        msg += " ";
        user.questionNumber++;
        if (user.questionNumber >= user.survey.questions.length) {
          msg += "Thank you! All done for now. ";
          msg += getSurveyPercentile(user.answers);
          user.state = "prestart";
        } else msg += user.survey.questions[user.questionNumber].question;
        sendSMS(user.phone, msg);
      }
      break;
    default:
      console.log("UHG! Unknown state!");
  }
}

function makeValidPhone(phone) {
  phone = phone.replace(/-/g, "");
  phone = phone.replace("(", "");
  phone = phone.replace(")", "");
  if (phone.charAt(0) != "+")
    if (phone.charAt(0) != "1") phone = "+1" + phone;
    else phone = "+" + phone;
  return phone;
}

function addReminder(subjectID, reminder, nextFunc) {
  findSubject(subjectID, (err, subject) => {
    subject.interactions.reminders.selections.push(reminder);
    updateSubject(subjectID, subject, (err, data) => {
      console.log("addreminder-updateSubject err:", err);
      nextFunc(err);
    });
  });
}

function addSurvey(subjectID, survey, nextFunc) {
  findSubject(subjectID, (err, subject) => {
    subject.interactions.surveys.push(survey);
    updateSubject(subjectID, subject, (err, data) => {
      console.log("Update err:", err);
      nextFunc(err);
    });
  });
}

function addCalendar(subjectID, calendar, nextFunc) {
  console.log("addCalendar: subject:", subjectID, " Calendar event:", calendar);
  findSubject(subjectID, (err, subject) => {
    if (!subject.interactions.calendar) subject.interactions.calendar = [];
    subject.interactions.calendar.push(calendar);
    updateSubject(subjectID, subject, (err, data) => {
      console.log("Update err:", err);
      nextFunc(err);
    });
  });
}

function decodeCalendarEvent(str) {
  console.log("Decoding the ALL NEW calendar event:" + str);
  let result = mytime.mytimeConvertStringToPieces(str, console.log);
  if (result.result) return result.result;
  console.log(
    "decodeCalendarEvent: " + result.dd + " msg:" + result.customerMessage
  );
  return {
    date: mytime.mytimeConvertLocaleToUTC(result.dd),
    msg: result.customerMessage,
  };
}

function handleMyLifeCommand(req, res, user, subjectID) {
  // Let's first see if this is a "command" to mylife instead of just a msg to a subject
  let words = req.body.Body.split(" ");
  console.log("handleMyLifeCommand: words[0]:" + words[0]);
  if (!words.length || words[0].toLowerCase() != "mylife") return false;

  // Its a command for us
  console.log("Got a 'mylife' command");
  if (words.length == 1) {
    sendSMS(
      req.body.From,
      "Hi. After 'mylife' you can say one-of: reminder, survey, event, or add (to add you as a care-circle member to another patient/user)."
    );
    return true;
  }
  switch (words[1].toLowerCase()) {
    case "reminder":
      if (words.length == 2)
        sendSMS(
          req.body.From,
          "Hi. After 'mylife reminder' please write the reminder sentence"
        );
      else {
        let reminder = "";
        for (let i = 2; i < words.length; i++) reminder += words[i] + " ";
        addReminder(subjectID, reminder, (err) => {
          console.log("addReminder result:" + err);
          if (!err) sendSMS(req.body.From, "Reminder added; thank-you!");
          else sendSMS(req.body.From, "Failed, database error:" + err);
        });
      }
      break;
    case "survey":
      console.log("Adding a survey");
      const surveys = "pain, happiness, social, adl";
      if (words.length != 3)
        sendSMS(
          req.body.From,
          "Hi. After 'mylife survey' please write the survey name. Current survey names are: " +
            surveys +
            "."
        );
      else {
        if (surveys.indexOf(words[2]) == -1) {
          sendSMS(
            req.body.From,
            "Sorry, that survey name '" + words[2] + "' is not one I recognize."
          );
          break;
        }
        addSurvey(
          subjectID,
          words[2].toLowerCase().trim() +
            ":" +
            req.body.From +
            ":" +
            user.contact.firstName,
          (err) => {
            if (!err) sendSMS(req.body.From, "Survey added; thank-you!");
            else sendSMS(req.body.From, "Failed, database error:" + err);
          }
        );
      }
      break;
    case "event":
    case "appointment":
    case "appt":
    case "calendar":
      console.log("Adding a calendar event");
      if (words.length < 3)
        sendSMS(
          req.body.From,
          "Hi. After 'mylife " +
            words[1] +
            "' please write date&time and then the message for the calendar entry."
        );
      else {
        let str = "";
        for (let i = 2; i < words.length; i++) str += words[i] + " ";
        let result = decodeCalendarEvent(str);
        console.log("Result from decodeCalendarEvent:", result);
        if (typeof result == "string") sendSMS(req.body.From, result);
        else {
          addCalendar(subjectID, result, (err) => {
            if (!err) sendSMS(req.body.From, "Calendar added; thank-you!");
            else sendSMS(req.body.From, "Failed, database error:" + err);
          });
        }
      }
      break;
    case "add":
      console.log("Adding me to another patient");
      if (words.length != 3)
        sendSMS(
          req.body.From,
          "Hi. After 'mylife add' please write the patient/user's acct name."
        );
      else {
        let subjectID = words[2].toLowerCase();
        console.log("Target subject is:", subjectID);
        findSubject(subjectID, (err, subject) => {
          console.log("err:", err, " valid? ", subject != null);
          if (err || !subject)
            sendSMS(
              req.body.From,
              "Sorry, I was unable to find that patient/user by that account name " +
                subjectID +
                "."
            );
          else {
            let phone = req.body.From + "-" + subjectID;
            console.log("Creating a new user with this phone-code:", phone);
            updateUser(
              phone,
              user.contact.firstName,
              subjectID,
              (err, data) => {
                if (err) {
                  console.log(
                    "Error adding/creating a new user to an existing patient:",
                    err
                  );
                  sendSMS(
                    req.body.From,
                    "Sorry, I was unable assign you to that user, error is:" +
                      err
                  );
                } else
                  sendSMS(
                    req.body.From,
                    "All set! BUT, now you have more than one My Life " +
                      "user that you are managing. SO, each time you send a message " +
                      "MyLife will ask you which user you desire. Try it out, it's " +
                      "not too bad, and good-for-you helping more than just one person!" +
                      err
                  );
              }
            );
          }
        });
      }
      break;
    case "friend":
      console.log("Adding a friend");
      if (words.length != 4)
        sendSMS(
          req.body.From,
          "Hi. After 'mylife friend' please write the friend's first name and phone#"
        );
      else {
        let firstName = words[2];
        let phone = makeValidPhone(words[3]);
        updateUser(phone, firstName, subjectID, (err, data) => {
          if (!err) {
            sendSMS(
              req.body.From,
              "Added friend, firstName=" +
                firstName +
                " phone=" +
                phone +
                " tied to subject:" +
                subjectID
            );
            sendSMS(
              phone,
              "Greetings. You've been added as a MyLife Friend to " +
                subjectID +
                ". Save this phone number. Use it to send messages to your friend."
            );
          } else sendSMS(req.body.From, "Error adding friend, err:" + err);
        });
      }
      break;
    default:
      sendSMS(
        req.body.From,
        "Hi. I didn't understand. After 'mylife' you can say one-of: friend, reminder, survey, appointment/event."
      );
  }
  return true;
}

function getRandomNumber(range) {
  return Math.floor(Math.random() * range);
}

function createSubject(req, accountName, firstName) {
  let r = getRandomNumber(9900) + 100; /* 100...9,9999 */
  let subjectID = accountName;

  // If there are any digits in the name, use the whole name (basically a re-set) vs create-new
  let char = subjectID.charAt(subjectID.length - 1);
  console.log("createSubject and char is:" + char);
  if (char >= "0" && char <= "9") console.log("Re-using subject id");
  else subjectID += r;
  console.log("Creating subject " + subjectID);
  // First copy 'NewUser'
  findSubject("NewUser", (err, subject) => {
    console.log("err:", err, subject);
    if (err) {
      sendSMS(
        req.body.From,
        "Failed to find the base NewUser object! Err:" + err
      );
    }
    subject.ID = subjectID;
    subject.contact.firstName = firstName;
    let d = new Date();
    subject.contact.dateCreated = {
      str: d.toISOString(),
      gmt: d.getTime(),
      bostonTime: new Date(d.getTime() - 4 * 60 * 60 * 1000).toLocaleString(),
    };
    subject.deviceID = "" + r;
    updateSubject(subjectID, subject, (err, data) => {
      console.log("Update err:", err);
      if (err) {
        sendSMS(req.body.From, "FAILED! Result of add:" + err);
      }
      sendSMS(
        req.body.From,
        "SUCCESS. New SubjectID:" +
          subjectID +
          " temporary device ID is " +
          subject.deviceID
      );
    });
  });
}

function updateSubjectAttributes(req, words) {
  let subjectID = words[2];
  console.log("UpdateSubjectAttributes");
  for (let i = 3; i < words.length; i++) {
    let keyvalue = words[i].split("=");
    console.log(
      "updating key [" + keyvalue[0] + "] to value [" + keyvalue[1] + "]"
    );
    updateSubjectAttributeOnly(
      subjectID,
      keyvalue[1],
      keyvalue[0],
      (err, data) => {
        console.log("result of put err:", err, " data:", data);
        sendSMS(req.body.From, "Result of key " + keyvalue[0] + " is:" + err);
      }
    );
  }
}

function handleMyLifeSystemCommand(req, res) {
  console.log("handleMyLifeSystemCommand: Body:" + req.body.Body);
  // MyLife system commands start with 'cjs' or 'system'
  let words = req.body.Body.split(" ");
  let subjectID = words[2];
  console.log("!!handleMyLifeSystemCommand: words[0]=" + words[0]);

  if (
    !words.length ||
    (words[0].toLowerCase() != "cjs" && words[0].toLowerCase() != "system")
  )
    return false;
  // Its a command for us
  console.log("Got a 'mylife' SYSTEM command");
  if (words.length == 1) {
    sendSMS(
      req.body.From,
      "Hi. After '" +
        words[0] +
        "' you can say 'create' plus the new users acct nanme and first name. (More commands forthcoming)"
    );
  } else
    switch (words[1].toLowerCase()) {
      case "create":
        if (words.length != 4) {
          sendSMS(
            req.body.From,
            "Missing values(s). Expected the new user's acct name and first name."
          );
          break;
        }
        let acctName = words[2].toLowerCase();
        let firstName = words[3].toLowerCase();
        createSubject(req, acctName, firstName);
        break;
      default:
        sendSMS(req.body.From, "Sorry, unknown key word:" + words[1]);
    }
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end();
  return true;
}

function isBatulisTest(req, res) {
  let done = false;
  if (req.body.From == "+19787643488" || req.body.From == "+16128023116") {
    done = true;
    console.log("Got a message from Stakutis or Batulis");
    let parts = req.body.Body.split(" ");
    parts[0] = parts[0].toLowerCase();
    if (parts[0] == "?") {
      sendSMS(
        req.body.From,
        "Try these:\r***\r  add phoneNum patientFirstName doctorName\r       OR\r  start phoneNum\r***"
      );
    } else if (parts[0] == "add") {
      var phone = parts[1],
        name = parts[2],
        doctor = parts[3];
      phone = makeValidPhone(phone);
      if (parts.length == 4) doctor = "Dr. " + doctor;
      if (parts.length > 4) doctor = doctor + " " + parts[4];
      console.log(
        "Adding: phone:" + phone + " name:" + name + " doctor:" + doctor
      );
      addActiveUser(phone, name, doctor);
      sendSMS(
        req.body.From,
        "User " +
          name +
          " at phone " +
          phone +
          " with doctor " +
          doctor +
          " has been added; do a START when ready."
      );
    } else if (parts[0] == "start") {
      let user = activeUsers[makeValidPhone(parts[1])];
      if (!user)
        sendSMS(
          req.body.From,
          "User is not known; I'm wicked sorry for ya pal. Take a lesson in typing or get a better job."
        );
      else {
        user.state = "prestart";
        handleSMSSurvey(user, "");
        sendSMS(req.body.From, "User has been sent activation");
      }
    } else done = false;
    if (done) {
      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end();
      return;
    }
    console.log("Continuing...");
  }
  return done;
}

function handleAddMemberFinish(req, res, dialog, firstName) {
  console.log(
    "handleAddMemberFinish: dialog:",
    dialog,
    " firstName:",
    firstName
  );
  dialog.time = new Date().getTime();
  awaitChoice[req.body.From] = null;
  let phone = req.body.From;
  updateUser(phone, firstName, dialog.subjectID, (err, result) => {
    console.log("Result of updateUser:", err);
    if (err)
      sendSMS(req.body.From, "Failed to update our account; call support.");
    else {
      let msg =
        "Congratulations! You are now a care-circle member for " +
        dialog.subjectID +
        ". " +
        "At any time, write a message to this phone number and it will be voiced " +
        "to your user/patient and they can respond later. It would be great if you can write " +
        "to them a few times a week and sometimes ask simple questions. Save this " +
        "phone number please. " +
        "Please review our documentation http://www.wholehealthplustechnology.com/guide Together, we " +
        "can help keep your patient connected to Life! ";
      sendSMS(req.body.From, msg);
      sendSMS(
        "+19787643488",
        "New MyLife Member added " +
          dialog.subjectID +
          " Member:" +
          firstName +
          " phone:" +
          req.body.From
      );
    }
  });
}

function handleAddMemberStart(req, res, dialog, subjectID) {
  subjectID = subjectID.toLowerCase(); // Force all subjectID's to be lower case
  console.log("handleAddMember: dialog:", dialog, " subjectID:", subjectID);
  dialog.time = new Date().getTime();
  // See if subject exists
  findSubject(subjectID, (err, subject) => {
    if (err || !subject) {
      sendSMS(req.body.From, "Sorry, we were not able to find that patient.");
      awaitChoice[req.body.From] = null;
      return;
    }
    sendSMS(
      req.body.From,
      "Excellent, now, offer us a first name to refer to you by. Go."
    );
    dialog.subjectID = subjectID;
    dialog.state = "AddMemberFinish";
  });
}

function isDialog(req, res) {
  let dialog = awaitChoice[req.body.From];
  if (!dialog) return false;

  // First make sure not timed-out
  console.log(
    "We are in awaitChoice...checking if timed out; Now=" +
      new Date().getTime() +
      " vs " +
      awaitChoice[req.body.From].time
  );
  if (new Date().getTime() - awaitChoice[req.body.From].time > 60 * 1000) {
    console.log("awaitChoice timed out, removing");
    awaitChoice[req.body.From] = null;
    return false;
  }

  // The dialog.state can be either 'PickPatient' or 'ActivateMember'
  // In both cases, the 'body' is the subject ID
  let subjectID = req.body.Body.trim().toLowerCase();
  console.log("Looking for patient:" + req.body.Body);
  if (dialog.state == "AddMember") {
    handleAddMemberStart(req, res, dialog, subjectID);
    return true;
  }
  if (dialog.state == "AddMemberFinish") {
    handleAddMemberFinish(req, res, dialog, req.body.Body.trim().toLowerCase());
    return true;
  }

  console.log("comparing to user array:", awaitChoice[req.body.From].users);
  for (let i = 0; i < awaitChoice[req.body.From].users.length; i++) {
    console.log(
      "comparing [" +
        dialog.users[i].subjectID.toLowerCase() +
        "] to [" +
        req.body.Body +
        "]"
    );
    if (dialog.users[i].subjectID.toLowerCase() == subjectID) {
      let user = dialog.users[i];
      console.log("Found patient! " + dialog.users[i].subjectID);

      req.body.Body = dialog.msg; // Put back in the original message
      if (!handleMyLifeCommand(req, res, user, user.subjectID)) {
        sendMessageToPatient(user, dialog.msg);
        sendSMS(
          req.body.From,
          "Message sent to " + awaitChoice[req.body.From].users[i].subjectID
        );
      }
      awaitChoice[req.body.From] = null;
      return true;
    }
  }
  console.log("Cound not find the patient!");
  sendSMS(req.body.From, "Patient " + req.body.Body + " not found; Sorry.");
  return true;
}

app.post("/sms", (req, res) => {
  console.log("");
  console.log(
    "Hey, we got some message! From:",
    req.body.From + " msg:" + req.body.Body
  );

  req.body.Body = req.body.Body.trim(); // Remove leading/trailing spaces
  // First, let's see if the in-coming phone is stakutis or batulis AND is a command
  /*
    if (isBatulisTest(req, res)) return;

    // Next, see if the in-coming phone a Batulis SMS user; if so process, else process as MyLife
    const user=activeUsers[req.body.From];
    if (user) {
	handleSMSSurvey(user, req.body.Body);
	res.writeHead(200, {'Content-Type': 'text/xml'});
	res.end();
	return;
    }
*/
  // Ok, it's for us, MyLife.  It could be a keyword-instruction message like 'cjs xxxx'
  if (handleMyLifeSystemCommand(req, res)) return;

  // Ok, it is possible that this incoming message is a 'response' to a dialog we've stared.
  // Check that next.
  if (isDialog(req, res)) return true;

  // Ok, at this point we suspect the message is from a real 'member'. We dont know yet if there
  // is an associated patient (or its a new member).  We have to look up the associated patient.

  findUserByPhone(req.body.From, function (err, users) {
    if (err) {
      console.log("Error reading Users table:", err);
      return;
    } else if (!users || users.length == 0) {
      console.log(
        "No users matching the incoming phone number " + req.body.From
      );
      let msg =
        "Welcome to My Life! We don't recognize your phone number. Maybe you are a " +
        "new member wanting to reach your My Life user/patient. If so, respond now with that " +
        "My Life user's account name/number. Go.";
      awaitChoice[req.body.From] = {
        users: users,
        state: "AddMember",
        msg: req.body.Body,
        time: new Date().getTime(),
      };
      sendSMS(req.body.From, msg);
      return;
    }

    if (users.length > 1) {
      console.log("Multiple users detected for incoming phone number");
      let msg = "Pick which patient: ";
      for (let i = 0; i < users.length; i++) {
        msg += users[i].subjectID + " ";
      }
      console.log("Adding user array:", users);
      awaitChoice[req.body.From] = {
        users: users,
        state: "PickPatient",
        msg: req.body.Body,
        time: new Date().getTime(),
      };
      console.log("Added user array:", awaitChoice[req.body.From].users);
      sendSMS(req.body.From, msg);
    } else {
      let user = users[0];
      console.log("Will search for subject: " + user.subjectID);
      // Now see if it is a MyLife member instruction, like 'mylife xxx'
      if (handleMyLifeCommand(req, res, user, user.subjectID)) return;
      sendMessageToPatient(user, req.body.Body);
      sendSMS(
        req.body.From,
        "Message sent to " +
          user.subjectID +
          ". Thank you for using My Life; keeping " +
          user.subjectID +
          " connected is important to us!"
      );
    }
  });

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end();
});

function sendMessageToPatient(user, msg) {
  console.log("sendMessageToPatient: user:", user);
  sendMessageToPatientInternal(
    user.subjectID,
    user.contact.firstName || "noname",
    user.phone.split("-")[0],
    msg
  );
  user.lastSent = new Date().toISOString();
  updateUserDB(user);
}

function sendMessageToPatientInternal(
  subjectID,
  fromFirstName,
  fromPhone,
  msg
) {
  findSubjectAttributeOnly(
    subjectID,
    "interactions.messages",
    (err, subject) => {
      if (err) {
        console.log("ERROR finding subject!");
        return;
      }
      if (!subject) {
        console.log(
          "ERROR sendMessageToPatient: Could not find subject " + subjectID
        );
        return;
      }
      subject.interactions.messages.push({
        from: fromFirstName,
        userPhone: fromPhone,
        msg: msg,
      });
      updateSubjectAttributeOnly(
        subjectID,
        subject.interactions.messages,
        "interactions.messages",
        (err, data) => {
          console.log("result of put err:", err, " data:", data);
        }
      );
    }
  );
}

app.get("/", (req, res) => {
  console.log("Hey, we got a GET! of / ");

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end("happy happy");
});

function updateUser(phone, firstName, subjectID, nextFunc) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  const params = {
    TableName: "MyLife_Users",
    Key: { phone: phone },
    UpdateExpression: "set #s = :s, #c = :f",
    ExpressionAttributeNames: { "#s": "subjectID", "#c": "contact" },
    ExpressionAttributeValues: {
      ":s": subjectID,
      ":f": { firstName: firstName },
    },
  };
  console.log("...params:", params);
  docClient.update(params, (err, data) => {
    if (err) {
      console.error("!!!! Unable to update item. Error JSON:", err);
    }
    nextFunc(err, data.Item);
  });
}

function updateUserDB(user, nextFunction) {
  let docClient = new AWS.DynamoDB.DocumentClient(region);
  console.log("updateUsertDB: ", user);
  let params = {
    TableName: "MyLife_Users",
    Item: user,
  };
  docClient.put(params, (err, data) => {
    console.log("Result of updating user table:", err);
    if (err) {
      console.log("!!!! Error updating user table:", err);
    }
    if (nextFunction) nextFunction(err, data);
  });
}

/*
try {
    activeUsers = JSON.parse(fs.readFileSync('activeUsers.json','utf-8'));
} catch (e) {console.log("could not read active SMS user file");}
*/
const port = 80;
console.log("Starting the web server...");
http.createServer(app).listen(port, () => {
  console.log("Express server listening on port " + port);
});
