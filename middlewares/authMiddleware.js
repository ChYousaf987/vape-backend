const handler = require("express-async-handler");
const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");

const authHandler = handler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      let decode = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await userModel.findById(decode.id);
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Invalid token");
    }
  } else {
    res.status(401);
    throw new Error("Token not found");
  }
});

module.exports = authHandler;
