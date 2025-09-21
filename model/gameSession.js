const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GameSessionSchema = new Schema({
  game_master_id: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  players: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ], // userIds
  question: String,
  answer: String,
  status: {
    type: String,
    enum: ["waiting", "active"],
    default: "waiting",
  },
  winner_id: {
    type: mongoose.Schema.ObjectId,
    ref: "user",
  },
  created_at: Date,
  game_code: {
    type: String,
    ref: "hosted",
  },
});

GameSessionSchema.index({ game_code: 1, game_master_id: 1 });
GameSessionSchema.post("save", async function (doc, next) {
  await doc.populate({ path: "game_master_id", select: "username" });
  next();
});

const Session = mongoose.model("Session", GameSessionSchema);

module.exports = Session;
