const gameControlButton = document.getElementById("game-control");
const infoElem = document.getElementById("info-container");

const webRoomsWebSocketServerAddr = "https://nosch.uber.space/web-rooms/";

const optionIds = ["a", "b", "c", "d"];

const drawingWords = [
  "&nbsp;&nbsp;Haus",
  "&nbsp;&nbsp;Baum",
  "&nbsp;&nbsp;Auto",
  "&nbsp;&nbsp;Hund",
  "&nbsp;&nbsp;Katze",
  "&nbsp;&nbsp;Fisch",
  "&nbsp;&nbsp;Vogel",
  "&nbsp;&nbsp;Ball",
  "&nbsp;&nbsp;Sonne",
  "&nbsp;&nbsp;Mond",
  "&nbsp;&nbsp;Stern",
  "&nbsp;&nbsp;Blume",
  "&nbsp;&nbsp;Apfel",
  "&nbsp;&nbsp;Banane",
  "&nbsp;&nbsp;Buch",
  "&nbsp;&nbsp;Stuhl",
  "&nbsp;&nbsp;Tisch",
  "&nbsp;&nbsp;Bett",
  "&nbsp;&nbsp;Tür",
  "&nbsp;&nbsp;Fenster",
  "&nbsp;&nbsp;Berg",
  "&nbsp;&nbsp;Wolke",
  "&nbsp;&nbsp;Regenschirm",
  "&nbsp;&nbsp;Herz",
  "&nbsp;&nbsp;Schmetterling",
  "&nbsp;&nbsp;Schuh",
  "&nbsp;&nbsp;Hut",
  "&nbsp;&nbsp;Zug",
  "&nbsp;&nbsp;Flugzeug",
  "&nbsp;&nbsp;Boot",
  "&nbsp;&nbsp;Straße",
  "&nbsp;&nbsp;Brille",
  "&nbsp;&nbsp;Gabel",
  "&nbsp;&nbsp;Löffel",
  "&nbsp;&nbsp;Tasse",
  "&nbsp;&nbsp;Uhr",
  "&nbsp;&nbsp;Lampe",
  "&nbsp;&nbsp;Tasche",
  "&nbsp;&nbsp;Schlüssel",
  "&nbsp;&nbsp;Pinsel",
  "&nbsp;&nbsp;Kuchen",
  "&nbsp;&nbsp;Ei",
  "&nbsp;&nbsp;Kerze",
  "&nbsp;&nbsp;Ente",
  "&nbsp;&nbsp;Maus",
  "&nbsp;&nbsp;Zahn",
  "&nbsp;&nbsp;Nase",
  "&nbsp;&nbsp;Hand",
  "&nbsp;&nbsp;Fuß",
  "&nbsp;&nbsp;Fahrrad",
];
let words = [
  drawingWords[0],
  drawingWords[1],
  drawingWords[2],
  drawingWords[3],
];
const answers = {};

for (let optionId of optionIds) {
  const answer = (answers[optionId] = {});
  answer.clients = new Set();
  answer.elem = document.querySelector(`div.answer[data-option=${optionId}]`);
  answer.textElem = document.querySelector(
    `div.answer[data-option=${optionId}] div.text`
  );
  answer.sliderElem = document.querySelector(
    `div.answer[data-option=${optionId}] div.slider`
  );
}

let clientId = null;
let clientCount = 0;
// let minClientCount = 24;currentGameState === 2
let gameState = null;
let chosenAnswers = [0, 0, 0, 0];
let playerSpots = { 1: "", 2: "", 3: "", 4: "" };
let zuschauerNames = {};
let registeredPlayers = new Map();
let registeredZuschauers = new Map();
const auswahlTimeout = 20;
const zeichnenTimeout = 40;

/*************************************************************
 * start
 */
function startMaster() {
  gameControlButton.addEventListener("click", updateGameState);
}

function setAnswer(answerText) {
  let answerIndex = null;
  switch (answerText) {
    case "a": {
      answerIndex = 0;
      break;
    }
    case "b": {
      answerIndex = 1;
      break;
    }
    case "c": {
      answerIndex = 2;
      break;
    }
    case "d": {
      answerIndex = 3;
      break;
    }
    default: {
      console.log("Invalid answer!");
      return;
    }
  }

  chosenAnswers[answerIndex] += 1;
  console.log("new answer", chosenAnswers);
}

function checkWinnerWord() {
  const labels = ["a", "b", "c", "d"];

  const maxValue = Math.max(...chosenAnswers);

  // Get all labels with max value
  const maxLabels = chosenAnswers
    .map((v, i) => (v === maxValue ? labels[i] : null))
    .filter((l) => l !== null);

  // Pick one randomly
  const randomLabel = maxLabels[Math.floor(Math.random() * maxLabels.length)];

  console.log(
    "Winner:",
    randomLabel,
    "Verteilung: ",
    chosenAnswers,
    "Labels:",
    maxLabels
  );
  sendRequest("*set-data*", "winnerWord", words[labels.indexOf(randomLabel)]);
}

function updateInfo() {
  infoElem.innerText = `players connected: ${clientCount - 1}`;
}

function countdownFrom(
  startValue,
  step,
  intervalMs,
  neededGamestate,
  callback
) {
  let value = startValue;

  const intervalId = setInterval(() => {
    if (gameState != neededGamestate) {
      clearInterval(intervalId);
      return;
    }

    callback(value);
    value -= step;

    if (value < 0) {
      clearInterval(intervalId);
      updateGameState();
    }
  }, intervalMs);
}

function updateButtonText() {
  switch (gameState) {
    case 0: {
      gameControlButton.innerHTML = "Start Game";
      break;
    }
    case 1: {
      gameControlButton.innerHTML = "End Auswahl";
      break;
    }
    case 2: {
      gameControlButton.innerHTML = "End Zeichnen";
      break;
    }
    case 3: {
      gameControlButton.innerHTML = "End Auswertung";
      break;
    }

    default: {
      gameControlButton.innerHTML = "Start Game";
      break;
    }
  }
}

function getRandomUniqueWords(wordsArray, count) {
  const shuffled = [...wordsArray].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function updateGameState() {
  if (gameState === 0) {
    chosenAnswers = [0, 0, 0, 0];

    words = getRandomUniqueWords(drawingWords, 4);
    const message = ["nextDrawWords", words];
    sendRequest("*broadcast-message*", message);

    countdownFrom(auswahlTimeout, 1, 500, 1, (currentValue) => {
      if (gameState === 1) {
        sendRequest("*set-data*", "remainingTime", currentValue);
      }
    });
  } else if (gameState === 1) {
    countdownFrom(zeichnenTimeout, 1, 500, 2, (currentValue) => {
      if (gameState === 2) {
        // console.log("zeichnen noch " + currentValue + " Sekunden aktiv");
        sendRequest("*set-data*", "remainingTime", currentValue);
      }
    });

    checkWinnerWord();
  } else if (gameState === 2) {
  } else if (gameState === 3) {
  }

  gameState += 1;
  if (gameState > 3) {
    gameState = 0;
  }

  updateButtonText();

  console.log(gameControlButton.innerHTML, gameState);

  sendRequest("*set-data*", "gameState", gameState);
  console.log("sent gameState");
}

/****************************************************************
 * websocket communication
 */
const socket = new WebSocket(webRoomsWebSocketServerAddr);

// listen to opening websocket connections
socket.addEventListener("open", (event) => {
  sendRequest("*enter-room*", "SplitDraw");
  sendRequest("*subscribe-client-count*");
  sendRequest("*subscribe-client-enter-exit*");
  sendRequest("*subscribe-data*", "gameState");
  sendRequest("*subscribe-data*", "remainingTime");
  sendRequest("*subscribe-data*", "answer");
  sendRequest("*subscribe-data*", "zuschauerNames");
  sendRequest("*subscribe-data*", "registeredPlayers");
  sendRequest("*subscribe-data*", "registeredZuschauers");
  gameState = 0;
  sendRequest("*set-data*", "gameState", 0);

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
        startMaster();
        console.log("Du bist Master. ClientId: ", clientId);
        break;

      case "*client-count*":
        clientCount = incoming[1];
        updateInfo();
        break;

      case "*client-enter*": {
        const newClientId = incoming[1];
        for (let i = 0; i < 4; i++) {
          if (playerSpots[i + 1] === "") {
            playerSpots[i + 1] = newClientId;
            break;
          }
        }
        sendRequest("*set-data*", "playerSpots", playerSpots);
        break;
      }

      case "*client-exit*": {
        const exitClientId = incoming[1];

        // Delete clientId from playerSpots object (overwrite with empty string)
        for (let i = 0; i < 4; i++) {
          if (playerSpots[i + 1] === exitClientId) {
            playerSpots[i + 1] = "";
            break;
          }
        }
        sendRequest("*set-data*", "playerSpots", playerSpots);

        // Delete clientId from registeredPlayers or registeredZuschauers
        if (registeredPlayers.has(exitClientId)) {
          registeredPlayers.delete(exitClientId);
          sendRequest("*set-data*", "registeredPlayers", [
            ...registeredPlayers,
          ]);
        } else if (registeredZuschauers.has(exitClientId)) {
          registeredZuschauers.delete(exitClientId);
          sendRequest("*set-data*", "registeredZuschauers", [
            ...registeredZuschauers,
          ]);
        }

        // zuschauerNames.remove(exitClientId);
        delete zuschauerNames[exitClientId];
        console.log(incoming[1], "exit");
        break;
      }

      case "registeredPlayers":
        let receivedPlayers = incoming[1] || [];
        if (Object.keys(receivedPlayers).length === 0) {
          registeredPlayers = new Map();
        } else {
          registeredPlayers = new Map(receivedPlayers);
        }

        // Spiel direkt starten sobald 4 Spieler da sind
        if (registeredPlayers.size === 4 && gameState === 0) {
          updateGameState();
        }
        break;

      case "registeredZuschauers":
        let receivedZuschauers = incoming[1] || [];
        if (Object.keys(receivedZuschauers).length === 0) {
          registeredZuschauers = new Map();
        } else {
          registeredZuschauers = new Map(receivedZuschauers);
        }

        break;

      case "zuschauerNames":
        zuschauerNames = incoming[1] || {};
        break;

      case "answer": {
        const parts = incoming[1].split(" ");
        console.log(parts[1]);
        setAnswer(parts[1]);
        break;
      }

      case "gameState": {
        gameState = incoming[1];

        // update content
        if (gameState === 0) {
          // Spiel direkt starten wenn 4 Spieler da sind
          console.log(registeredPlayers.size);
          if (
            registeredPlayers.size + registeredZuschauers.size >= 4 &&
            gameState === 0
          ) {
            // get Ids and names of all registered clients
            // let allClientIds = [];
            // let allClientNames = [];

            console.log(registeredPlayers);
            console.log(registeredZuschauers);
            let allClientIds = [
              ...registeredPlayers.keys(),
              ...registeredZuschauers.keys(),
            ];
            let allClientNames = [
              ...registeredPlayers.values(),
              ...registeredZuschauers.values(),
            ];
            // for (let id in registeredPlayers.keys()) {
            //   allClientIds.push(id);
            //   allClientNames.push(registeredPlayers.get(id));
            // }
            // for (let id in registeredZuschauers.keys()) {
            //   allClientIds.push(id);
            //   allClientNames.push(registeredPlayers.get(id));
            // }

            console.log(allClientIds);

            // shuffle array of clientIds
            for (let i = allClientIds.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              // Swap elements in place
              [allClientIds[i], allClientIds[j]] = [
                allClientIds[j],
                allClientIds[i],
              ];
              [allClientNames[i], allClientNames[j]] = [
                allClientNames[j],
                allClientNames[i],
              ];
            }

            // assign the new roles to the shuffled clientIds
            registeredPlayers = new Map();
            registeredZuschauers = new Map();

            for (let i = 0; i < allClientIds.length; i++) {
              if (allClientIds[i] >= 1 && allClientIds[i] <= 4) {
                registeredPlayers.set(allClientIds[i], allClientNames[i]);
              } else {
                registeredZuschauers.set(allClientIds[i], allClientNames[i]);
              }
            }

            console.log(registeredPlayers);
            console.log(registeredZuschauers);
            //  set new  roles as room data
            sendRequest("*set-data*", "newRole", [
              [...registeredPlayers],
              [...registeredZuschauers],
            ]);

            updateGameState();
          }
          console.log("Spiel noch nicht gestartet");
        } else if (gameState === 1) {
          console.log("Spiel ist in Auswahlphase");
        } else if (gameState === 2) {
          console.log("Spiel ist in Zeichenphase");
        } else if (gameState === 3) {
          console.log("Spiel ist in Auswertungsphase");
        }

        updateButtonText();

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
