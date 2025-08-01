// routes/orderRoutes.js
const express = require("express");
const authHandler = require("../middlewares/authMiddleware");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/orderController");

const orderRouter = express.Router();

orderRouter.post("/create-order", authHandler, createOrder);
orderRouter.get("/orders", authHandler, getOrders);
orderRouter.get("/order/:id", authHandler, getOrderById);
orderRouter.put("/order/:id", authHandler, updateOrderStatus);

module.exports = orderRouter;
