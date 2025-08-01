// controllers/orderController.js
const handler = require("express-async-handler");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");

const createOrder = handler(async (req, res) => {
  const { products, total_amount, shipping_address } = req.body;
  const user_id = req.user._id;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400);
    throw new Error("No products provided for order");
  }

  if (!shipping_address) {
    res.status(400);
    throw new Error("Shipping address is required");
  }

  const order = await orderModel.create({
    user_id,
    products,
    total_amount,
    shipping_address,
  });

  res.status(201).json(order);
});

const getOrders = handler(async (req, res) => {
  const orders = await orderModel
    .find()
    .populate("user_id", "name email")
    .populate("products.product_id");
  res.status(200).json(orders);
});

const getOrderById = handler(async (req, res) => {
  const order = await orderModel
    .findById(req.params.id)
    .populate("user_id", "name email")
    .populate("products.product_id");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.status(200).json(order);
});

const updateOrderStatus = handler(async (req, res) => {
  const { status } = req.body;
  const order = await orderModel.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (
    !["pending", "processing", "shipped", "delivered", "cancelled"].includes(
      status
    )
  ) {
    res.status(400);
    throw new Error("Invalid status");
  }

  order.status = status;
  await order.save();
  res.status(200).json(order);
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
