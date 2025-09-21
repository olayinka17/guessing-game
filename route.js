const express = require("express");
const userController = require("./userController");

const Router = express.Router();

Router.post("/", userController.handleGame);

module.exports = Router;
