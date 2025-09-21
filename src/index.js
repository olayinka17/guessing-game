import { showAlert } from "./alert";

if (!window.socket) {
  window.socket = io();
}
const socket = window.socket;

const username = document.getElementById("name-input");
const messageContainer = document.getElementById("message-container");
const topFeedback = document.getElementById("message-feedback-top");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const setQuestionBtn = document.getElementById("setQuestionBtn");
const answerInput = document.getElementById("answerInput");
const questionInput = document.getElementById("questionInput");
const submitQA = document.getElementById("submitQA");
const closePopover = document.getElementById("closePopover");
const leave = document.getElementById("leave");
const timer = document.getElementById("timeLeft");
const scores = document.getElementById("playerScores");
const code = document.getElementById("code");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const messageTone = new Audio("/message.wav");



if (messageContainer && messageForm) {
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  socket.on("session_created", (data) => {
    console.log(data);
    username.innerText = `${data}`;
  });

  socket.on("player_joined", (data) => {
    console.log(data);
    feedbackTop(false, data);
    players(data);
  });

  socket.on("session_joined", (data) => {
    username.innerText = `${data}`;
  });


  socket.on("timer_update", (data) => {
    if (timer) {
      timer.textContent = data;
    }
  });
  socket.on("timer_reset", (data) => {
    if (timer) {
      timer.textContent = data.timeLeft;
    }
  });

  socket.on("guess_error", (data) => {
    showAlert("error", data);
    console.log(data);
  });

  socket.on("code", (data) => {
    code.textContent = `Game code: ${data}`;
  });

  socket.on("time_expired", (data) => {
    messageTone.play();
    addMessageToUI(false, data);
  });

  socket.on("correct_answer", (data) => {
    messageTone.play();
    console.log(data);
    addMessageToUI(false, data);
  });

  socket.on("attempted", (data) => {
    showAlert("success", `you've just ${data} retry left`);
  });

  socket.on("question_created", (question) => {
    messageTone.play();
    addMessageToUI(false, question);
  });

  socket.on("session_restarted", (data) => {
    feedback(true, data.message);
  });

  socket.on("player_left", (data) => {
    feedback(false, data);
  });



  const sendMessage = () => {
    if (messageInput.value === "") return;
    const data = { guess: messageInput.value, datetime: Date.now() };

    socket.emit("guess_answer", data);
    console.log(data);
    addMessageToUI(true, data);
    messageInput.value = "";
  };

  const addMessageToUI = (isOwnedMessage, data) => {
    const element = `
      <li class="${isOwnedMessage ? "message-right" : "message-left"}">
        <p class="message">
          ${isOwnedMessage ? data.guess : data}
          <span> • ${moment(data.datetime).fromNow()}</span>
        </p>
      </li>`;
    messageContainer.innerHTML += element;
    messageContainer.scrollTo(0, messageContainer.scrollHeight);
  };

  socket.on("players_scores", (data) => {
    scores.innerHTML = "";
    data.forEach((player) => {
      let playerItem = document.getElementById(`score-${player._id}`);
      if (!playerItem) {
        playerItem = document.createElement("li");
        playerItem.id = `score-${player._id}`;
        scores.appendChild(playerItem);
      }
      playerItem.textContent = `${player.username}: ${player.score}`;
    });
  });

  const players = (data) => {
    const element = `
     <li class="playerscores" id="playerScores">
      <p>${data}: 10 </p>
     </li>
    `;
    scores += element;
  };

  const feedbackTop = (is_host, data) => {
    const element = `
      <li class="message-feedback-top">
        <p class="feedback-top">${data} ${
      is_host ? "is the host" : "joined"
    }</p>
      </li>`;
    topFeedback.innerHTML += element;
  };

  const feedback = (is_restarted, data) => {
    const element = `
      <li class="message-feedback">
        <p class="feedback">${data} ${is_restarted ? "" : "left"}</p>
      </li>`;
    messageContainer.innerHTML += element;
  };
}


if (setQuestionBtn) {
  setQuestionBtn.addEventListener("click", () => {
    document.getElementById("popover").classList.remove("hidden");
  });

  socket.on("assignGameMaster", (gm) => {
    const myUserId = window.currentUserId;

    if (gm === myUserId) {
      setQuestionBtn.style.display = "block"; 
    } else {
      setQuestionBtn.style.display = "none"; 
    }

  });
}

if (submitQA) {
  submitQA.addEventListener("click", () => {
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (!question || !answer) return alert("Please enter both!");

    socket.emit("set_question", { question, answer });

    questionInput.value = "";
    answerInput.value = "";
    popover.classList.add("hidden");
    setQuestionBtn.style.display = "none";
  });
}

if (closePopover) {
  closePopover.addEventListener("click", () => {
    popover.classList.add("hidden");
  });
}

if (leave) {
  leave.addEventListener("click", () => {
    console.log("okay");
    lobbyScreen.style.display = "block";
    gameScreen.style.display = "none";

    socket.emit("leave-game", (res) => {
      console.log("Server response:", res);
      if (res.status === "success") {
        socket.disconnect();
      }
    });
  });
}
