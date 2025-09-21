const User = require("./model/user");
const Hosted = require("./model/hostedGame");
const Session = require("./model/gameSession");
const Guess = require("./model/guess");
const CatchAsync = require("./utils/CatchAsync");
const CustomError = require("./utils/CustomError");

const handleGame = CatchAsync(async (req, res, next) => {
  const { username, code } = req.body;

  if (code) {
    const hosted = await Hosted.findOne({ code });

    if (!hosted) {
      return next(new CustomError("invald game code", 404));
    }

    const session = await Session.findOne({ game_code: code });

    if (!session) {
      return next(new CustomError("no session with the code ", 404));
    }
    if (session.status === "active") {
      return next(new CustomError("the game has started.", 400));
    }
    if (session.status === "ended") {
      return next(new CustomError("the game has ended.", 400));
    }

    const user = await User.create({ username: username });


    if (hosted.players_id.some((id) => id === user._id.toString())) {
      hosted.players_id.push(user._id);
      await hosted.save();
    }

    return res.status(201).json({
      status: "success",
      data: {
        user,
        hosted,
      },
    });
  }

  const user = await User.create({
    username: username,
    host: true,
  });

  let gameCode;
  let existing;
  do {
    gameCode = Math.floor(100000 + Math.random() * 900000).toString();
    existing = await Hosted.findOne({ code: gameCode });
  } while (existing);

  const hosted = await Hosted.create({
    host_id: user._id,
    players_id: [user._id],
    code: gameCode,
  });
   await Guess.create({
    player_id: user._id,
    session_code: gameCode,
  });
  res.status(201).json({
    status: "success",
    data: {
      user,
      hosted,
    },
  });
});

module.exports = { handleGame };
