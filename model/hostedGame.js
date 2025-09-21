const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const HostedSchema = new Schema({
  host_id: {
    type: String,
  },
  players_id: [String],
  code: String,
});

HostedSchema.index({code: 1})

const Hosted = mongoose.model("Hosted", HostedSchema);
module.exports = Hosted;
