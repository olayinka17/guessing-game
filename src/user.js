import axios from "axios";
import { showAlert } from "./alert";

if (!window.socket) {
  window.socket = io();
}
const socket = window.socket;

const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");

const userForm = document.getElementById("gameForm");
const modeInputs = document.querySelectorAll("input[name='mode']");
const codeField = document.getElementById("codeField");

modeInputs.forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.value === "join" && radio.checked) {
      codeField.style.display = "block";
    } else {
      codeField.style.display = "none";
    }
  });
});

if (userForm) {
  userForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log(data);
    try {
      const res = await axios({
        method: "POST",
        url: "/api/v1/user",
        data,
      });

      console.log("User created:", res.data);

      if (res.data.status === "success") {
        const user = res.data.data.user;
        window.currentUserId = user._id;
        window.currentUsername = user.username;

        lobbyScreen.style.display = "none";
        gameScreen.style.display = "block";

        socket.emit("join_game", { event: "join", data: res.data });

        if (res.data.data.user.host === true) {
          const gameCode = res.data.data.hosted.code;
          showAlert("success", `Your hosted Game code is ${gameCode}`);
        }
      }
    } catch (err) {
      console.error("Error joining/hosting:", err);
      showAlert("error", err.response.data.message);
    }
  });
}
