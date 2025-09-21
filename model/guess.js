const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const GuessSchema = new Schema({
  player_id: {
    type: mongoose.Schema.ObjectId,
    ref: "user",
  },
  session_code: {
    type: String
  },
  guessed_answer: String,
  is_correct: Boolean,
  createdAt: Date,
  retry: {
    type: Number,
    default: 3,
  },
});

GuessSchema.index({player_id: 1, session_code: 1})
const guess = mongoose.model("Guess", GuessSchema);

module.exports = guess;
