const express = require("express");
const {
  registerUser,
  loginUser,
  verifyOTP,
  getPendingUsers,
  approveUser,
} = require("../controllers/userController");
const authHandler = require("../middlewares/authMiddleware");
const userRouter = express.Router();

userRouter.post("/register-user", registerUser);
userRouter.post("/login-user", loginUser);
userRouter.post("/verify-otp", authHandler, verifyOTP);
userRouter.get("/pending-users", getPendingUsers); // No authHandler or adminHandler
userRouter.post("/approve-user", approveUser); // No authHandler or adminHandler

module.exports = userRouter;
