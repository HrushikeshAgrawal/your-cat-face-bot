app.post("/fetchh", async (req, res) => {
  const { imageUrl } = req.body;
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
    return res.json(filteredExpressions);
  } catch (err) {
    return res.status(404).send(err.toString());
  }
});
