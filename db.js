const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

const connectToDB = () => {
  mongoose.connect(MONGO_URI);

  mongoose.connection.on("connected", () => {
    console.log("sucessfully connected to the db");
  });
  mongoose.connection.on("error", () => {
    console.log("an error ocurred while connecting to the db");
    
  });
};

module.exports = connectToDB;
