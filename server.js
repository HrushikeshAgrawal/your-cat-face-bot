const express = require("express");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");
const faceapi = require("./face-api.min");
const Blob = require("cross-blob");
global.Blob = Blob;
const canvas = require("canvas");
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const accountSid = "TWILIO_ACCOUNT_SID";
const authToken = "TWILIO_AUTH_TOKEN";
const client = require("twilio")(accountSid, authToken);

const app = express();
// app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const expressionList = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
];

app.get("/", (req, res) => {
  res.send("Works :D");
});

const getExpressionsss = async (imageUrl, fromNo, randNo, fromWA) => {
  try {
    await faceapi.nets.faceRecognitionNet.loadFromDisk(
      path.join(__dirname, "/models")
    );
    await faceapi.nets.faceLandmark68Net.loadFromDisk(
      path.join(__dirname, "/models")
    );
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(
      path.join(__dirname, "/models")
    );
    await faceapi.nets.faceExpressionNet.loadFromDisk(
      path.join(__dirname, "/models")
    );
    const image = await canvas.loadImage(imageUrl);
    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceExpressions();
    const expressions = detections.map((face) => {
      return face.expressions;
    });
    let filteredExpressions = []; // keep only Expressions with score > 0.1
    expressions.forEach((expression, index) => {
      let temp1 = [];
      let temp2 = [];
      expressionList.forEach((exp) => {
        if (expression[exp] > 0.1) {
          temp1.push(exp);
          temp2.push(expression[exp]);
        }
      });
      // Sorting
      var len, i, j, stop;
      len = temp2.length;
      for (i = 0; i < len; i++) {
        for (j = 0, stop = len - i; j < stop; j++) {
          if (temp2[j] < temp2[j + 1]) {
            var temp = temp2[j];
            temp2[j] = temp2[j + 1];
            temp2[j + 1] = temp;
            temp = temp1[j];
            temp1[j] = temp1[j + 1];
            temp1[j + 1] = temp;
          }
        }
      }
      filteredExpressions.push({
        faceNo: "Face " + index,
        expressions: temp1,
        score: temp2,
      });
    });
    const finalExp = filteredExpressions[0];
    let { str, imgUrl } = getCatImg(
      finalExp,
      filteredExpressions.length,
      fromNo,
      randNo
    );
    await client.messages.create({
      body: str,
      mediaUrl: imgUrl,
      from: "whatsapp:+14155238886",
      to: fromWA,
    });
  } catch (err) {
    return { err };
  }
};

const getCatImg = (face, len, fromNo, randNo) => {
  let output = `Cat for request ID: ${fromNo} - ${randNo}`;
  let imgExp, imgScore;
  let flag = true;
  face.expressions.forEach((exp, i) => {
    let score = face.score[i];
    score *= 100;
    score = Math.floor(score);
    faceScore = 0;
    if (score > 80) faceScore = 100;
    else if (score > 60) faceScore = 80;
    else if (score > 40) faceScore = 60;
    else if (score > 20) faceScore = 40;
    else faceScore = 20;
    if (flag) {
      imgExp = exp;
      imgScore = faceScore;
      flag = false;
    }
    expstr = exp.toString();
    output +=
      "\n" +
      expstr.charAt(0).toUpperCase() +
      expstr.slice(1) +
      " " +
      faceScore.toString() +
      "%";
  });
  if (face.expressions.length > 1)
    output += `\nNote: Cat is for the highest percentage expression`;
  if (len > 1)
    output += `\nNote: Bot found ${len} faces, cat is for the 1st face detected. Use *web* command for multiple faces input :)`;
  return {
    str: output,
    imgUrl: `https://goruto.000webhostapp.com/catFaceThingy/botcats/${imgExp}${imgScore}.jpg`,
  };
};

app.post("/sms", async (req, res) => {
  const twiml = new MessagingResponse();

  const message = twiml.message();
  // console.log(req.body);

  const webUrl = "https://your-cat-face.herokuapp.com/";

  if (req.body.Body.toLowerCase() == "cat") {
    if (!req.body.MediaUrl0) {
      message.body("Please provide an image for the cat command to work :)");
    } else {
      let min = 10,
        max = 99;
      const fromNo = req.body.From.substr(-10);
      const randNo = Math.floor(Math.random() * (max - min)) + min;
      getExpressionsss(req.body.MediaUrl0, fromNo, randNo, req.body.From);
      let bodyStr = "You will get it soon, please wait :D";
      bodyStr += `\nRequest ID: ${fromNo} - ${randNo}`;
      message.body(bodyStr);
    }
  } else if (req.body.Body.toLowerCase() == "help") {
    let bodyStr =
      "The bot detects your facial expression and returns a cat with similar expression! :D 🐱";

    bodyStr += "\n\nValid Commands:";
    bodyStr +=
      "\n*cat*: Send a pic with the cat command for the bot to detect expression!";
    bodyStr +=
      "\n*randomcat*: Find a random cat with random expression from our catbase!";
    bodyStr += "\n*web*: Get the web version link!";
    bodyStr += "\n*help*: Umm.. Displays what you are seeing right now? :)";
    bodyStr +=
      "\n\nNote: The web version allows multiple faces at the same time! The bot just uses the first face it detects, its lazy :')";
    bodyStr += `\nTry it: ${webUrl}`;

    bodyStr += "\n\nFor suggestions/feedback contact the developer:";
    bodyStr += "\nHrushikesh Agrawal (+91 98193 22602)";
    message.body(bodyStr);
  } else if (req.body.Body.toLowerCase() == "randomcat") {
    let set = [20, 40, 60, 80, 100];
    let rndm = Math.floor(Math.random() * set.length);
    const score = set[rndm];
    let set2 = [
      "angry",
      "disgusted",
      "fearful",
      "happy",
      "neutral",
      "sad",
      "surprised",
    ];
    let rndm2 = Math.floor(Math.random() * set2.length);
    const exp = set2[rndm2];
    message.body(`You found a ${exp} cat!`);
    message.media(
      `https://goruto.000webhostapp.com/catFaceThingy/botcats/${exp}${score}.jpg`
    );
  } else if (req.body.Body.toLowerCase() == "web") {
    let bodyStr = `The web version allows multiple expression detection and multiple faces at the same time! :D\n${webUrl}`;
    message.body(bodyStr);
  } else {
    let bodyStr = "Not a valid command :(";
    bodyStr += "\nType *help* for command list";
    message.body(bodyStr);
  }
  //   message.body("The Robots are coming! Head for the hills!");
  //   message.media(
  //     "https://farm8.staticflickr.com/7090/6941316406_80b4d6d50e_z_d.jpg"
  //   );

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
