const app = require("./app");
const connectToDB = require("./db");
const globalErrorHandler = require("./utils/Error");
const CustomError = require("./utils/CustomError");
require("dotenv").config();

const GameSession = require("./gameSesson");

const Port = process.env.PORT;

connectToDB();

app.use((req, res, next) => {
  next(new CustomError(`can't find ${req.originalUrl} on this server`, 404));
});

// global error handler
app.use(globalErrorHandler);
const server = app.listen(Port, () => {
  console.log(`Server start running http://127.0.0.1:${Port}`);
});

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  const gameSession = new GameSession({ io, socket });

  socket.on("join_game", (event) => {
    const sessionId = event.data.data.hosted.code;
    const playerId = event.data.data.user._id;
    const username = event.data.data.user.username;

    socket.sessionId = sessionId;
    socket.playerId = playerId;
    socket.username = username;

    socket.join(sessionId);

    gameSession.createsession(event, playerId);
  });

  socket.on("set_question", (data) => {
    const sessionId = socket.sessionId;
    if (!sessionId) return;
    gameSession.createQuestion(data, sessionId);
  });

  socket.on("guess_answer", (data) => {
    const sessionId = socket.sessionId;
    const playerId = socket.playerId;
    const username = socket.username;
    console.log(username);
    console.log(data);
    if (!sessionId || !playerId) return;
    gameSession.guessAnswer({ ...data, username }, sessionId, playerId);
  });

  const handleExit = (socket) => {
    const sessionId = socket.sessionId;
    const playerId = socket.playerId;
    const username = socket.username;

    if (!sessionId || !playerId) return;
    gameSession.exit(sessionId, playerId, username);

    socket.sessionId = null;
    socket.playerId = null;
  };
  socket.on("leave-game", (done) => {
    handleExit(socket);
    if (done) done({ status: "success", message: "Left game successfully" });
  });

  socket.on("disconnect", () => {
    handleExit(socket);
  });
});
