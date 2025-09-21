const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  host: {
    type: Boolean,
    default: false,
  },
  game_session_code: {
    type: String,
  },
});

UserSchema.index({username: 1, game_session_code: 1})

const User = mongoose.model("User", UserSchema);

module.exports = User;
