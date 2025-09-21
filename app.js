const path = require("path");
const express = require("express");
const userRouter = require("./route");

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/api/v1/user", userRouter);

app.use("api/v1/", (req, res) => {
  res.send("welcome to the home API");
});

module.exports = app;
