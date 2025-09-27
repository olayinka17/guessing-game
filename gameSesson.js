const GameSessionService = require("./gameSessionService");
const Timer = require("./utils/Timer");
const CustomError = require("./utils/CustomError");

const service = new GameSessionService();

class GameSession {
  static timers = new Map();
  constructor({ io, socket }) {
    this.io = io;
    this.socket = socket;
    this.answer = null;
  }

  async createsession(event, playerId) {
    if (
      event.data.data.user._id === event.data.data.hosted.host_id.toString()
    ) {
      try {
        const result = await service.createSession(event.data.data, playerId);
        const gameMaster = result.data.session;

        this.io
          .to(gameMaster.game_code)
          .emit("assignGameMaster", gameMaster.game_master_id._id);

        this.socket.emit("session_created", event.data.data.user.username);

        this.emitScores(gameMaster.game_code);
        this.io.to(gameMaster.game_code).emit("code", gameMaster.game_code);
      } catch (err) {
        console.log(err);
        throw new CustomError("failed to create the game", 400);
      }
    } else {
      this.join(event, event.data.data.hosted.code);
    }
  }
  async createQuestion(data, sessionId) {
    const result = await service.createQuestion(data, sessionId);
    if (result.status === "success") {
      const session = result.data.session;
      this.answer = session.answer;
      const question = session.question;

      this.io.to(sessionId).emit("question_created", question);
      console.log(sessionId);
      this.startTimer(String(sessionId));
    } else {
      this.socket.emit("question_error", result.message);
    }
  }

  async guessAnswer(data, sessionId, playerId) {
    const result = await service.guessAnswer(data, sessionId, playerId);

    if (result.status === "success") {
      const answer = result.data.answer;
      const playerName = data.username;
      this.datetime = data.datetime;
      const message = `${playerName} got the answer which is ${answer}`;
      this.io.to(sessionId).emit("correct_answer", message);
      this.endRound(sessionId);
    } else if (result.status === "fail" && result.message) {
      this.socket.emit("guess_error", result.message);
    } else {
      this.socket.emit("attempted", result.data.attempts);
    }
  }

  async emitScores(sessionId) {
    const result = await service.emitScores(sessionId);

    if (result.status === "fail") {
      this.io.to(sessionId).emit("guess_error", result.message);
    } else {
      const player = result.data.session.players;
      this.io.to(sessionId).emit("players_scores", player);
    }
  }

  async endRound(sessionId) {
    const key = String(sessionId);

    this.stopTimer(key);

    const result = await service.endRound(sessionId);
    if (result.status === "fail") {
      this.io.to(key).emit("guess_error", result.message);
    } else {
      const playerName = result.data.session.game_master_id.username;

      const gameMaster = result.data.session.game_master_id._id;
      console.log(
        `Round ended for session ${key}. New Game Master: ${playerName}`
      );
      this.emitScores(key);
      this.io.to(key).emit("assignGameMaster", gameMaster);

      this.io.to(key).emit("session_restarted", {
        message: `New round has started, ${playerName} is the new Game Master`,
      });
    }
  }

  async join(event, sessionId) {
    const result = await service.join(sessionId, event.data.data.user._id);
    if (result.status === "fail") {
      this.socket.emit("guess_error", result.message);
    } else {
      this.socket
        .to(sessionId)
        .emit("player_joined", event.data.data.user.username);
      this.socket.emit("session_joined", event.data.data.user.username);
      this.io.emit("code", sessionId);
      this.emitScores(sessionId);
    }
  }

  startTimer(sessionId) {
    const key = String(sessionId);

    if (GameSession.timers.has(key)) {
      this.stopTimer(key);
    }

    const timer = new Timer(
      (timeLeft) => {
        this.io.to(key).emit("timer_update", timeLeft);
      },
      () => {
        this.io
          .to(key)
          .emit(
            "time_expired",
            `the time has expired the answer to the question is ${this.answer} `
          );
        this.endRound(key);

        GameSession.timers.delete(key);
      }
    );

    timer.start();
    GameSession.timers.set(key, timer);
  }

  stopTimer(sessionId) {
    const key = String(sessionId);

    const timer = GameSession.timers.get(key);

    if (timer) {
      timer.stop();
      GameSession.timers.delete(key);
    }
    this.io.to(key).emit(
      "timer_reset",

      { timeLeft: 60 }
    );
  }

  async exit(sessionId, playerId, username) {
    const result = await service.exit(sessionId, playerId);
    console.log(result);
    if (result.status === "success" && result.isGameMaster === true) {
      this.endRound(sessionId);
      this.socket.to(sessionId).emit("player_left", username);
    } else if (result.status === "fail") {
      this.socket.emit("guess_error", result.message);
    } else {
      if (!result.data.session_deleted) {
        this.emitScores(sessionId)
        this.socket.to(sessionId).emit("player_left", username);
      }
    }
  }
}

module.exports = GameSession;
