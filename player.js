const questionElem = document.getElementById("question-container");
const answerElem = document.getElementById("answer-container");
const auswertungElem = document.getElementById("auswertung-container");
const infoElem = document.getElementById("info-container");
const nameInputElem = document.getElementById("nameInput-container");
const wordInputElem = document.getElementById("zuschauerEingabe-container");
const votesContainer = document.getElementById("myvotes-container");
const clearCanvasContainer = document.getElementById("clearCanvas-container");
const spielerAnzahlEl = document.getElementById("spieleranzahl");

const camera = document.getElementById("camera");

const webRoomsWebSocketServerAddr = "https://nosch.uber.space/web-rooms/";

// window.addEventListener(
//   "click",
//   () => {
//     const bgMusic = document.getElementById("lofi");
//     lofi.play().catch(() => {});
//     lofi.pause(); // direkt wieder pausieren
//   },
//   { once: true }
// );

const container = document.getElementById("timer-container");
const bar = document.getElementById("timer-bar");

const canvasContainerElem = document.getElementById("canvas-container");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");
const canvas4 = document.getElementById("canvas4");
const allCanvas = [canvas1, canvas2, canvas3, canvas4];

const optionIds = ["a", "b", "c", "d"];

const drawingWords = [
  "Haus",
  "Baum",
  "Auto",
  "Hund",
  "Katze",
  "Fisch",
  "Vogel",
  "Ball",
  "Sonne",
  "Mond",
  "Stern",
  "Blume",
  "Apfel",
  "Banane",
  "Buch",
  "Stuhl",
  "Tisch",
  "Bett",
  "Tür",
  "Fenster",
  "Berg",
  "Wolke",
  "Regenschirm",
  "Herz",
  "Schmetterling",
  "Schuh",
  "Hut",
  "Zug",
  "Flugzeug",
  "Boot",
  "Straße",
  "Brille",
  "Gabel",
  "Löffel",
  "Tasse",
  "Uhr",
  "Lampe",
  "Tasche",
  "Schlüssel",
  "Pinsel",
  "Kuchen",
  "Ei",
  "Kerze",
  "Ente",
  "Maus",
  "Zahn",
  "Nase",
  "Hand",
  "Fuß",
  "Fahrrad",
];
let words = [
  drawingWords[0],
  drawingWords[1],
  drawingWords[2],
  drawingWords[3],
];
let clientId = null;
let zuschauerNames = {};
let registeredPlayers = new Map();
let registeredZuschauers = new Map();
let selectedOptionId = null;
let gameState = null;
let isZuschauer = false;
let isPlayer = false;
let remainingTime = null;
let winnerWord = null;
let drawing = false;
let activeCanvas = null;
let activeCtx = null;
let playerNumber = null;
let registrationRequested = false;
let hasVoted = false;
let allVotes = {};
let myVote = null;
let playerName = null;
let playerSpots = {};
let isMouseDown = false;
let newDraw = false;
const auswahlTimeout = 20;
const zeichnenTimeout = 40;

let playersRandomized = false;

// let canvasContents = [null, null, null, null];
// for (let i = 0; i < allCanvas.length; i++) {
//   canvasContents[i] = allCanvas[i].toDataURL();
// }

let lastX = null;
let lastY = null;

let lastPosition = new THREE.Vector3();
let isMoving = false;
let moveTimeout = null;

// let infoElemA = null;
let infoString = "";

const welcomeText = {
  text: `Wähle ein Wort aus das gezeichnet werden soll`,
};

AFRAME.registerComponent("snow-generator", {
  init: function () {
    for (let i = 0; i < 500; i++) {
      const flake = document.createElement("a-image");
      flake.setAttribute("src", "assets/snowflake.png");

      const startX = (Math.random() - 0.5) * 100;
      const startZ = (Math.random() - 0.5) * 100;
      const startY = 10 + Math.random() * 30;
      const scale = 0.05 + (1 - startY / 40) * 0.3;

      flake.setAttribute("position", { x: startX, y: startY, z: startZ });
      flake.setAttribute("width", scale);
      flake.setAttribute("height", scale);
      flake.setAttribute("look-at", "#camera");
      flake.setAttribute("animation", {
        property: "position",
        to: `${startX} -5 ${startZ}`,
        dur: 8000 + Math.random() * 4000,
        loop: true,
        easing: "linear",
      });

      this.el.appendChild(flake);
    }
  },
});

// AFRAME Movement registrieren
AFRAME.registerComponent("movement-detector", {
  tick: function () {
    const currentPosition = camera.object3D.position;

    // Bewegung prüfen
    if (!lastPosition.equals(currentPosition)) {
      if (!isMoving) {
        isMoving = true;
        console.log("Bewegung gestartet");
        camera.emit("movementstart");
      }

      // Reset des Stop-Timers
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        isMoving = false;
        console.log("Bewegung gestoppt");
        camera.emit("movementend");
      }, 300); // 300ms ohne Bewegung = gestoppt

      // Position aktualisieren
      lastPosition.copy(currentPosition);
    }
  },
});

// document.addEventListener("DOMContentLoaded", () => {

// });

// Komponente an Kamera anhängen
camera.setAttribute("movement-detector", "");

camera.addEventListener("movementstart", () => {
  console.log("Benutzer hat sich bewegt.");
  isMoving = true;
});

camera.addEventListener("movementend", () => {
  console.log("Benutzer ist stehen geblieben.");
  isMoving = false;
});

// #############################################################################
// Register functions
// -----------------------------------------------------------------------------

document.getElementById("submitButton").addEventListener("click", () => {
  const inputValue = document.getElementById("userInput").value;

  if (clientId && !registrationRequested) {
    registrationRequested = true;

    if (playerNumber == null) {
      let playerSpotFound = false;
      for (let i = 0; i < 4; i++) {
        if (playerSpots[i + 1] === clientId) {
          playerNumber = i + 1;
          isPlayer = true;
          isZuschauer = false;
          console.log("Ich bin Spieler:", playerNumber);
          assignCanvas();
          playerSpotFound = true;
          registeredPlayers.set(clientId, inputValue || "");
          sendRequest("*set-data*", "registeredPlayers", [
            ...registeredPlayers,
          ]);

          infoElem.innerHTML = `${
            playerName ? playerName + ", " : ""
          }du bist Spieler ${playerNumber}.<br> Warte bis das Spiel gestartet wird.`;
          infoElem.style.display = "block";
          break;
        }
      }

      if (!playerSpotFound) {
        isPlayer = false;
        isZuschauer = true;
        console.log("Ich bin Zuschauer");
        zuschauerNames[clientId] = inputValue || "";
        sendRequest("*set-data*", "zuschauerNames", zuschauerNames);

        registeredZuschauers.set(clientId, inputValue || "");
        sendRequest("*set-data*", "registeredZuschauers", [
          ...registeredZuschauers,
        ]);

        allVotes[inputValue] = "";
        sendRequest("*set-data*", "vote", allVotes);
        infoElem.innerHTML = `${
          playerName ? playerName + ", " : ""
        }du bist Zuschauer.<br> Warte bis das Spiel gestartet wird.`;
        infoElem.style.display = "block";
      }

      playerName = inputValue;

      // Eingabefeld verstecken
      document.getElementById("userInput").value = "";
      nameInputElem.style.display = "none";

      // AFrame Movement registrieren
      const cameraEl = document.getElementById("camera");
      cameraEl.setAttribute("look-controls", "enabled: true");

      spielerAnzahlEl.innerHTML =
        "Warte auf Spieler (" + registeredPlayers.size + "/4)";

      console.log(gameState);
      updateContent(gameState, clientId);
    }
  }
});

// #############################################################################
// Voting functions
// -----------------------------------------------------------------------------

// 1. Variablen für Input und Button erstellen
const inputElem = document.getElementById("zuschauerInput");
const buttonElem = document.getElementById("zuschauerButton");

// 2. Funktion, die den Vote abwickelt
function handleVote() {
  const inputValue = inputElem.value;

  if (!hasVoted) {
    myVote = inputValue;
    allVotes[clientId] = myVote;
    sendRequest("*set-data*", "vote", allVotes);
    hasVoted = true;

    inputElem.value = "";
    wordInputElem.style.display = "none";
  }
}

// 3. Event Listener für den Button-Klick
buttonElem.addEventListener("click", handleVote);

// 4. Event Listener für das Drücken der Enter-Taste im Inputfeld
inputElem.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault(); // Verhindert, dass z.B. ein Formular abgeschickt wird
    handleVote();
  }
});

function displayVotes() {
  votesContainer.innerHTML = "";

  if (Object.keys(zuschauerNames).length === 0) {
    votesContainer.innerHTML = "Keiner hat geraten.";
  } else {
    const ul = document.createElement("ul");
    for (const [key, value] of Object.entries(allVotes)) {
      if (key in zuschauerNames) {
        const li = document.createElement("li");
        li.textContent = `${zuschauerNames[key]}: ${value}`;
        ul.appendChild(li);
      }
    }
    votesContainer.appendChild(ul);
  }
}

// #############################################################################
// Canvas functions
// -----------------------------------------------------------------------------

setInterval(() => {
  if (drawing || newDraw) {
    drawOnCanvas();
    newDraw = false;
  }
}, 250);

document.getElementById("clearCanvasButton").addEventListener("click", () => {
  clearActiveCanvas();
  sendCanvasToOthers();
});
function handleEnterPress(e) {
  if (e.key === "Enter" && !registrationRequested) {
    e.preventDefault();
    document.removeEventListener("keydown", handleEnterPress);
    document.getElementById("submitButton").click();
  }
}
// Enter überall im Dokument abfangen
document.addEventListener("keydown", handleEnterPress);

// document.getElementById("userInput").addEventListener("keydown", (event) => {
//   if (event.key === "Enter") {
//     event.preventDefault();
//     document.getElementById("submitButton").click();
//   }
// });

function resizeCanvasToCSSSize() {
  for (let i = 0; i < allCanvas.length; i++) {
    const rect = allCanvas[i].getBoundingClientRect();
    allCanvas[i].width = rect.width;
    allCanvas[i].height = rect.height;
  }
}

function assignCanvas() {
  activeCanvas = allCanvas[playerNumber - 1];
  activeCtx = activeCanvas.getContext("2d");

  const rect = activeCanvas.getBoundingClientRect();
  activeCanvas.width = rect.width;
  activeCanvas.height = rect.height;
  console.log(activeCanvas.width);
}

function drawOnCanvas() {
  if (!isPlayer || gameState !== 2) return;
  // drawing = false;
  sendCanvasToOthers();
}

function handleMouseOut() {
  drawing = false;
  [lastX, lastY] = [null, null];
}

function handleMouseDown(e) {
  isMouseDown = true;
  if (!isMoving && e) {
    drawing = true;
    const rect = activeCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    [lastX, lastY] = [x, y];
  }
}
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function handleMouseUp() {
  isMouseDown = false;
  drawing = false;
  [lastX, lastY] = [null, null];
}

function handleMouseOver() {
  if (isMouseDown && !isMoving) {
    drawing = true;
  }
}

function registerCanvasListeners() {
  activeCanvas.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mouseup", handleMouseUp);
  activeCanvas.addEventListener("mouseout", handleMouseOut);
  activeCanvas.addEventListener("mouseover", handleMouseOver);

  activeCanvas.addEventListener("mousemove", draw);
}

function unregisterCanvasListeners() {
  activeCanvas.removeEventListener("mousedown", handleMouseDown);
  document.removeEventListener("mouseup", handleMouseUp);
  activeCanvas.removeEventListener("mouseout", handleMouseOut);
  activeCanvas.removeEventListener("mouseover", handleMouseOver);

  activeCanvas.removeEventListener("mousemove", draw);
}

// function draw(e) {
//   if (!isPlayer) return;

//   if (!drawing) return;

//   const rect = activeCanvas.getBoundingClientRect();
//   const x = e.clientX - rect.left;
//   const y = e.clientY - rect.top;

//   if (lastX == null) {
//     lastX = e.offsetX;
//   }
//   if (lastY == null) {
//     lastY = e.offsetY;
//   }

//   activeCtx.strokeStyle = "white";
//   activeCtx.lineWidth = 2;
//   activeCtx.fillStyle = "white";
//   activeCtx.beginPath();

//   activeCtx.moveTo(lastX, lastY);
//   activeCtx.lineTo(x, y);
//   activeCtx.stroke();
//   console.log(x, y);
//   console.log(rect);
//   console.log(activeCanvas.width);
//   [lastX, lastY] = [e.offsetX, e.offsetY];

//   newDraw = true;
// }
function draw(e) {
  if (!isPlayer || !drawing) return;

  const rect = activeCanvas.getBoundingClientRect();
  const scaleX = activeCanvas.width / rect.width;
  const scaleY = activeCanvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if (lastX == null || lastY == null) {
    lastX = x;
    lastY = y;
  }

  activeCtx.strokeStyle = "white";
  activeCtx.lineWidth = 3.5;
  activeCtx.beginPath();
  activeCtx.moveTo(lastX, lastY);
  activeCtx.lineTo(x, y);
  activeCtx.stroke();

  lastX = x;
  lastY = y;
  newDraw = true;
  console.log(x, y);
  console.log(rect);
}

function drawCanvasBorders() {
  for (let can of allCanvas) {
    if (can == activeCanvas) {
      can.style.border = "4px solid #f896d8";
    } else {
      can.style = "border:2px solid white;";
    }
  }
}

function resetAllCanvas() {
  for (let can of allCanvas) {
    const canCtx = can.getContext("2d");
    canCtx.clearRect(0, 0, can.width, can.height);
  }
}

function clearActiveCanvas() {
  activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
}

function setCanvasContent(currentCanvas, msgData) {
  if (gameState === 2 || gameState === 3) {
    const base64 = msgData;
    const img = new Image();
    const currentCanvasCtx = currentCanvas.getContext("2d");
    img.onload = () => {
      currentCanvasCtx.clearRect(
        0,
        0,
        currentCanvas.width,
        currentCanvas.height
      );
      currentCanvasCtx.drawImage(img, 0, 0);
    };
    img.src = base64;
  }
}

function sendCanvasToOthers() {
  const dataUrl = activeCanvas.toDataURL();
  const message = ["canvas" + playerNumber.toString() + "-update", dataUrl];
  // canvasContents[playerNumber - 1] = dataUrl;
  sendRequest(
    "*set-data*",
    "canvas" + playerNumber.toString() + "-update",
    dataUrl
  );
  // sendRequest("*broadcast-message*", message);
}

// #############################################################################
// Timer Bar
// -----------------------------------------------------------------------------

function updateTimer(seconds) {
  container.style.display = "block";

  bar.style.transition = "none";

  let max_time = auswahlTimeout;
  if (gameState === 2) {
    max_time = zeichnenTimeout;
  }

  bar.style.width = ((seconds / max_time) * 100).toString() + "%";
  void bar.offsetWidth;

  bar.style.transition = `width ${seconds}s linear`;
  bar.style.width = "0%";
}

// #############################################################################
// General Cintent Update functions
// -----------------------------------------------------------------------------

function updateContent(currentGameState, senderClientId) {
  if (isPlayer) {
    infoElem.style.display = "block";

    nameInputElem.style.display = "none";

    if (currentGameState === 0) {
      questionElem.style.display = "none";
      answerElem.style.display = "none";
      auswertungElem.style.display = "none";
      canvasContainerElem.style.display = "none";
      votesContainer.style.display = "none";
      clearCanvasContainer.style.display = "none";

      document.getElementById("loading-screen").style.display = "block";

      infoElem.innerHTML = infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Spieler ${playerNumber}.<br> Warte bis das Spiel gestartet wird.`;

      activeCanvas.style.border = "2px solid green";
      activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      sendCanvasToOthers();
    } else if (currentGameState === 1) {
      infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Spieler ${playerNumber}.<br> Wähle ein Wort zum Zeichnen aus.`;

      questionElem.style.display = "block";
      auswertungElem.style.display = "none";
      clearCanvasContainer.style.display = "none";
      startPlaying();

      document.getElementById("loading-screen").style.display = "none";
    } else if (currentGameState === 2) {
      if (senderClientId == clientId) {
        registerCanvasListeners();
      }

      infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Spieler ${playerNumber}.<br> Zeichne das angezeigte Wort.`;

      questionElem.innerHTML = winnerWord;
      questionElem.style.display = "block";

      for (let optionId of optionIds) {
        const textElem = document.querySelector(
          `div.answer[data-option=${optionId}] div.text`
        );
        textElem.innerHTML = "";
      }
      answerElem.style.display = "none";

      canvasContainerElem.style.display = "block";
      drawCanvasBorders();
      resizeCanvasToCSSSize();

      clearCanvasContainer.style.display = "block";

      document.getElementById("loading-screen").style.display = "none";
    } else if (currentGameState === 3) {
      if (senderClientId == clientId) {
        unregisterCanvasListeners();
      }

      infoElem.innerHTML = infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Spieler ${playerNumber}.<br> Warte bis das Spiel gestartet wird.`;

      canvasContainerElem.style.display = "block";
      drawCanvasBorders();

      questionElem.innerHTML = "";
      questionElem.style.display = "none";

      auswertungElem.innerHTML = "Das richtige Wort war:" + winnerWord;
      displayVotes();
      auswertungElem.style.display = "block";
      votesContainer.style.display = "block";

      clearCanvasContainer.style.display = "none";

      document.getElementById("loading-screen").style.display = "none";
    } else {
      activeCanvas.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      sendCanvasToOthers();

      questionElem.innerHTML = "";

      for (let optionId of optionIds) {
        const textElem = document.querySelector(
          `div.answer[data-option=${optionId}] div.text`
        );
        textElem.innerHTML = "";
      }

      votesContainer.style.display = "none";
      clearCanvasContainer.style.display = "none";
    }
  } else if (isZuschauer) {
    if (currentGameState === 2) {
      infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Zuschauer.<br> Rate was gezeichnet wird.`;

      wordInputElem.style.display = "block";

      canvasContainerElem.style.display = "block";
      resizeCanvasToCSSSize();
      for (let can of allCanvas) {
        can.style = "border:1px solid #ccc;";
      }
      auswertungElem.style.display = "none";

      votesContainer.style.display = "none";

      document.getElementById("loading-screen").style.display = "none";
    } else if (currentGameState === 3) {
      wordInputElem.style.display = "none";

      canvasContainerElem.style.display = "block";
      for (let can of allCanvas) {
        can.style = "border:1px solid #ccc;";
      }

      auswertungElem.innerHTML = "Das richtige Wort war:" + winnerWord;
      displayVotes();
      auswertungElem.style.display = "block";
      votesContainer.style.display = "block";

      document.getElementById("loading-screen").style.display = "none";
    } else {
      document.getElementById("loading-screen").style.display = "block";

      infoElem.innerHTML = `${
        playerName ? playerName + ", " : ""
      }du bist Zuschauer.<br> Warte bis das Spiel gestartet wird.`;
      infoElem.style.display = "block";
      canvasContainerElem.style.display = "block";
      for (let can of allCanvas) {
        can.style = "border:1px solid #ccc;";
      }

      auswertungElem.style.display = "none";
      votesContainer.style.display = "none";

      canvasContainerElem.style.display = "none";
    }
  }
}

function startPlaying() {
  answerElem.style.display = "block";
  registerOptionClicks();
  setQuestion(welcomeText);
}

function setQuestion(question) {
  resetAnswer();

  questionElem.innerHTML = question.text;
  for (let i = 0; i < optionIds.length; i++) {
    const textElem = document.querySelector(
      `div.answer[data-option=${optionIds[i]}] div.text`
    );
    textElem.innerHTML = words[i];
  }
}

function resetAnswer() {
  setAnswer(null);
}

// #############################################################################
// Auswahlverfahren functions
// -----------------------------------------------------------------------------

function registerOptionClicks() {
  for (let optionId of optionIds) {
    const textElem = document.querySelector(
      `div.answer[data-option=${optionId}]`
    );
    textElem.addEventListener("click", onClick);
  }
}

function onClick(e) {
  let target = e.target;
  let option = target.dataset.option;

  if (!option) {
    option = target.parentElement.dataset.option;
  }

  setAnswer(option);
}

function setAnswer(optionId) {
  if (optionId !== selectedOptionId) {
    if (optionId !== null) {
      const textElem = document.querySelector(
        `div.answer[data-option=${optionId}]`
      );
      textElem.classList.add("selected");
    }

    if (selectedOptionId !== null) {
      const textElem = document.querySelector(
        `div.answer[data-option=${selectedOptionId}]`
      );
      textElem.classList.remove("selected");
    }

    selectedOptionId = optionId;

    sendRequest("*set-data*", "answer", "answer " + optionId + " " + clientId);
  }
}

// #############################################################################
/****************************************************************
 * websocket communication
 */
const socket = new WebSocket(webRoomsWebSocketServerAddr);

// listen to opening websocket connections
socket.addEventListener("open", (event) => {
  sendRequest("*enter-room*", "SplitDraw");
  sendRequest("*get-data*", "winnerWord");
  sendRequest("*subscribe-data*", "playerSpots");
  sendRequest("*subscribe-data*", "gameState");
  sendRequest("*subscribe-data*", "remainingTime");
  sendRequest("*subscribe-data*", "vote");
  sendRequest("*subscribe-data*", "zuschauerNames");
  sendRequest("*subscribe-data*", "registeredPlayers");
  sendRequest("*subscribe-data*", "registeredZuschauers");
  sendRequest("*subscribe-data*", "winnerWord");
  sendRequest("*subscribe-data*", "newRole");
  sendRequest("*subscribe-data*", "canvas1-update");
  sendRequest("*subscribe-data*", "canvas2-update");
  sendRequest("*subscribe-data*", "canvas3-update");
  sendRequest("*subscribe-data*", "canvas4-update");

  // ping the server regularly with an empty message to prevent the socket from closing
  setInterval(() => socket.send(""), 30000);
});

socket.addEventListener("close", (event) => {
  clientId = null;
  document.body.classList.add("disconnected");
});

// listen to messages from server
socket.addEventListener("message", (event) => {
  const data = event.data;

  if (data.length > 0) {
    const incoming = JSON.parse(data);
    const selector = incoming[0];

    // dispatch incomming messages
    switch (selector) {
      case "*client-id*":
        clientId = incoming[1];
        if (clientId === 0) {
          console.log("Waiting for Master to join ...");
          socket.close();
        }

        spielerAnzahlEl.innerHTML =
          "Warte auf Spieler (" + registeredPlayers.size + "/4)";
        break;

      case "playerSpots":
        playerSpots = incoming[1];

        break;

      case "canvas1-update": {
        if (playerNumber === 1) {
          break;
        }
        setCanvasContent(canvas1, incoming[1]);
        break;
      }
      case "canvas2-update": {
        if (playerNumber === 2) {
          break;
        }
        setCanvasContent(canvas2, incoming[1]);
        break;
      }
      case "canvas3-update": {
        if (playerNumber === 3) {
          break;
        }
        setCanvasContent(canvas3, incoming[1]);
        break;
      }
      case "canvas4-update": {
        if (playerNumber === 4) {
          break;
        }
        setCanvasContent(canvas4, incoming[1]);
        break;
      }

      case "vote":
        allVotes = incoming[1] || {};
        break;

      case "registeredPlayers":
        console.log(registeredPlayers);
        let receivedPlayers = incoming[1];
        console.log(receivedPlayers);
        if (Object.keys(receivedPlayers).length === 0) {
          registeredPlayers = new Map();
        } else {
          registeredPlayers = new Map(receivedPlayers);
        }

        spielerAnzahlEl.innerHTML =
          "Warte auf Spieler (" + registeredPlayers.size + "/4)";
        break;

      case "registeredZuschauers":
        console.log(registeredZuschauers);
        let receivedZuschauers = incoming[1];
        console.log(receivedZuschauers);
        if (Object.keys(receivedZuschauers).length === 0) {
          registeredZuschauers = new Map();
        } else {
          registeredZuschauers = new Map(receivedZuschauers);
        }

        break;

      case "zuschauerNames":
        zuschauerNames = incoming[1] || {};
        break;

      case "newRole":
        if (clientId === null) {
          break;
        }

        let newPlayers = incoming[1][0] || [];
        let newZuschauers = incoming[1][1] || [];

        console.log("new Players: ", newPlayers);
        console.log(newZuschauers);

        if (Object.keys(newPlayers).length === 0) {
          registeredPlayers = new Map();
        } else {
          registeredPlayers = new Map(newPlayers);
        }
        if (Object.keys(newZuschauers).length === 0) {
          registeredZuschauers = new Map();
        } else {
          registeredZuschauers = new Map(newZuschauers);
        }

        console.log(clientId);
        console.log(registeredPlayers.keys());
        console.log(registeredZuschauers.keys());

        if (registeredPlayers.has(clientId)) {
          playerNumber =
            Array.from(registeredPlayers.keys()).indexOf(clientId) + 1;
          isPlayer = true;
          isZuschauer = false;
          assignCanvas();
          infoElem.innerHTML = `${
            playerName ? playerName + ", " : ""
          }du bist Spieler ${playerNumber}.<br> Warte bis das Spiel gestartet wird.`;
          console.log("Bin jetzt Spieler.");
        } else if (registeredZuschauers.has(clientId)) {
          isPlayer = false;
          isZuschauer = true;
          zuschauerNames[clientId] = registeredZuschauers.get(clientId);
          infoElem.innerHTML = `${
            playerName ? playerName + ", " : ""
          }du bist Zuschauer.<br> Warte bis das Spiel gestartet wird.`;
          console.log("Bin jetzt Zuschauer.");
        }

        updateContent(gameState, clientId);

        break;

      case "gameState": {
        gameState = incoming[1];

        // update content
        if (gameState === 0) {
          hasVoted = false;
          resetAllCanvas();

          allVotes = {};

          console.log("Spiel noch nicht gestartet");
        } else if (gameState === 1) {
          console.log("Spiel ist in Auswahlphase");
          const lofi = document.getElementById("lofi");

          // Musik nur starten, wenn noch nicht läuft
          if (lofi.paused) {
            lofi.currentTime = 0;
            lofi.volume = 0.3; // Optional: leiser
            lofi.loop = true;
            lofi.play().catch((err) => {
              console.warn("Autoplay blockiert:", err);
            });
          }
        } else if (gameState === 2) {
          console.log("Spiel ist in Zeichenphase");
        } else if (gameState === 3) {
          container.style.display = "none";
          remainingTime = null;
          console.log("Spiel ist in Auswertungsphase");
          const lofi = document.getElementById("lofi");
          if (!lofi.paused) {
            lofi.pause();
            lofi.currentTime = 0;
          }
        }

        if (clientId !== null) {
          updateContent(gameState, clientId);
        }
        break;
      }

      case "remainingTime": {
        remainingTime = incoming[1];

        if (gameState === 1 || gameState === 2) {
          if (remainingTime <= 0) {
            updateContent(gameState, clientId);
          } else {
            updateTimer(remainingTime);
          }
        }
        break;
      }

      case "winnerWord": {
        winnerWord = incoming[1];
        updateContent(gameState, clientId);
        break;
      }

      case "nextDrawWords": {
        words = incoming[1];
        break;
      }

      case "*error*": {
        const message = incoming[1];
        console.warn("server error:", ...message);
        break;
      }

      default:
        break;
    }
  }
});

window.addEventListener("close", () => {});

function sendRequest(...message) {
  const str = JSON.stringify(message);
  socket.send(str);
}
