const express = require("express");
const authHandler = require("../middlewares/authMiddleware");
const {
  createProduct,
  getProducts,
  getProductById,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  addToCart,
  removeFromCart,
  getMyCart,
  submitReview,
  getReviews,
} = require("../controllers/productController");

const productRouter = express.Router();

productRouter.post("/create-product", createProduct);
productRouter.get("/products", getProducts);
productRouter.get("/product/:id", getProductById);
productRouter.get("/category/:category", getProductsByCategory);
productRouter.put("/product/:id", updateProduct);
productRouter.delete("/product/:id", deleteProduct);
productRouter.post("/add-to-cart", authHandler, addToCart);
productRouter.post("/remove-from-cart", authHandler, removeFromCart);
productRouter.get("/get-my-cart", authHandler, getMyCart);
productRouter.post("/review/:productId", submitReview); // Removed authHandler
productRouter.get("/reviews/:productId", getReviews);

module.exports = productRouter;
