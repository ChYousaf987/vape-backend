const handler = require("express-async-handler");
const productModel = require("../models/productModel");
const cartModel = require("../models/cartModel");
const reviewModel = require("../models/reviewModel");
const Category = require("../models/categoryModel");
const path = require("path");
const mongoose = require("mongoose");

// Debug: Log the resolved path for userModel
const userModelPath = path.resolve(__dirname, "../models/userModel.js");
console.log("Attempting to import User model from:", userModelPath);

let User;
try {
  User = require("../models/userModel");
  console.log("User model imported successfully:", !!User);
} catch (error) {
  console.error("Failed to import User model:", error.message);
  throw new Error("Server configuration error: User model not found");
}

const createProduct = handler(async (req, res) => {
  const {
    product_name,
    product_description,
    product_base_price,
    product_discounted_price,
    product_stock,
    product_images,
    category,
    subcategories,
    brand_name,
    product_code,
    nicotine_strengths,
    flavors,
    rating,
  } = req.body;

  if (
    !product_name ||
    !product_base_price ||
    !product_discounted_price ||
    !product_images ||
    !category ||
    !brand_name ||
    !product_code
  ) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists || categoryExists.parent_category) {
    res.status(400);
    throw new Error("Invalid category ID or category is a subcategory");
  }

  if (subcategories && subcategories.length > 0) {
    const subcats = await Category.find({
      _id: { $in: subcategories },
      parent_category: category,
    });
    if (subcats.length !== subcategories.length) {
      res.status(400);
      throw new Error(
        "Invalid subcategories or they do not belong to the specified category"
      );
    }
  }

  const basePrice = Number(product_base_price);
  const discountedPrice = Number(product_discounted_price);

  if (
    isNaN(basePrice) ||
    isNaN(discountedPrice) ||
    basePrice <= 0 ||
    discountedPrice <= 0
  ) {
    res.status(400);
    throw new Error("Prices must be valid positive numbers");
  }

  if (discountedPrice > basePrice) {
    res.status(400);
    throw new Error("Discounted price cannot be higher than base price");
  }

  const nicotineArray =
    typeof nicotine_strengths === "string"
      ? nicotine_strengths
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n))
      : Array.isArray(nicotine_strengths)
      ? nicotine_strengths
      : [0, 3, 6, 12];
  const flavorsArray =
    typeof flavors === "string"
      ? flavors
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f)
      : Array.isArray(flavors)
      ? flavors
      : ["None"];

  const product = await productModel.create({
    product_name,
    product_description: product_description || "",
    product_base_price: basePrice,
    product_discounted_price: discountedPrice,
    product_stock: Number(product_stock) || 0,
    product_images: Array.isArray(product_images) ? product_images : [],
    category,
    subcategories: subcategories || [],
    brand_name,
    product_code,
    nicotine_strengths: nicotineArray,
    flavors: flavorsArray,
    rating: Number(rating) || 4,
    reviews: [],
  });

  const populatedProduct = await productModel
    .findById(product._id)
    .populate("category")
    .populate("subcategories");
  res.status(201).json(populatedProduct);
});

const getProducts = handler(async (req, res) => {
  const products = await productModel
    .find()
    .populate("category")
    .populate("subcategories")
    .populate("reviews");
  res.status(200).json(products);
});

const getProductById = handler(async (req, res) => {
  const product = await productModel
    .findById(req.params.id)
    .populate("category")
    .populate("subcategories")
    .populate("reviews");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json(product);
});

const getProductsByCategory = handler(async (req, res) => {
  const categoryId = req.params.categoryId;
  const products = await productModel
    .find({
      $or: [{ category: categoryId }, { subcategories: categoryId }],
    })
    .populate("category")
    .populate("subcategories")
    .populate("reviews");
  if (!products || products.length === 0) {
    res.status(404);
    throw new Error("No products found in this category or subcategory");
  }
  res.status(200).json(products);
});

const updateProduct = handler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const {
    product_name,
    product_description,
    product_base_price,
    product_discounted_price,
    product_stock,
    product_images,
    category,
    subcategories,
    brand_name,
    product_code,
    nicotine_strengths,
    flavors,
    rating,
  } = req.body;

  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists || categoryExists.parent_category) {
      res.status(400);
      throw new Error("Invalid category ID or category is a subcategory");
    }
  }

  if (subcategories && subcategories.length > 0) {
    const subcats = await Category.find({
      _id: { $in: subcategories },
      parent_category: category || product.category,
    });
    if (subcats.length !== subcategories.length) {
      res.status(400);
      throw new Error(
        "Invalid subcategories or they do not belong to the specified category"
      );
    }
  }

  let basePrice =
    product_base_price !== undefined
      ? Number(product_base_price)
      : product.product_base_price;
  let discountedPrice =
    product_discounted_price !== undefined
      ? Number(product_discounted_price)
      : product.product_discounted_price;

  if (
    product_base_price !== undefined &&
    (isNaN(basePrice) || basePrice <= 0)
  ) {
    res.status(400);
    throw new Error("Base price must be a positive number");
  }

  if (
    product_discounted_price !== undefined &&
    (isNaN(discountedPrice) || discountedPrice <= 0)
  ) {
    res.status(400);
    throw new Error("Discounted price must be a positive number");
  }

  if (
    product_base_price !== undefined &&
    product_discounted_price !== undefined &&
    discountedPrice > basePrice
  ) {
    res.status(400);
    throw new Error("Discounted price cannot be higher than base price");
  }

  const nicotineArray =
    typeof nicotine_strengths === "string"
      ? nicotine_strengths
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n))
      : Array.isArray(nicotine_strengths)
      ? nicotine_strengths
      : product.nicotine_strengths;
  const flavorsArray =
    typeof flavors === "string"
      ? flavors
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f)
      : Array.isArray(flavors)
      ? flavors
      : product.flavors;

  const updatedProduct = await productModel
    .findByIdAndUpdate(
      req.params.id,
      {
        product_name: product_name || product.product_name,
        product_description: product_description || product.product_description,
        product_base_price: basePrice,
        product_discounted_price: discountedPrice,
        product_stock:
          product_stock !== undefined
            ? Number(product_stock)
            : product.product_stock,
        product_images: product_images || product.product_images,
        category: category || product.category,
        subcategories: subcategories || product.subcategories,
        brand_name: brand_name || product.brand_name,
        product_code: product_code || product.product_code,
        nicotine_strengths: nicotineArray,
        flavors: flavorsArray,
        rating: Number(rating) || product.rating,
      },
      { new: true }
    )
    .populate("category")
    .populate("subcategories")
    .populate("reviews");

  res.status(200).json(updatedProduct);
});

const deleteProduct = handler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await reviewModel.deleteMany({ product_id: req.params.id });
  await productModel.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Product deleted successfully" });
});

const addToCart = handler(async (req, res) => {
  console.log("addToCart - Request body:", req.body);

  const { user_id, product_id, selected_image, nicotine_strength, flavor } =
    req.body;

  if (!user_id || !product_id || !selected_image || !flavor) {
    console.log("addToCart - Missing required fields:", {
      user_id,
      product_id,
      selected_image,
      nicotine_strength,
      flavor,
    });
    res.status(400);
    throw new Error(
      "All fields (user_id, product_id, selected_image, flavor) are required"
    );
  }

  if (isNaN(Number(nicotine_strength))) {
    console.log("addToCart - Invalid nicotine_strength:", nicotine_strength);
    res.status(400);
    throw new Error("Nicotine strength must be a valid number");
  }

  if (typeof flavor !== "string" || flavor.trim() === "") {
    console.log("addToCart - Invalid flavor:", flavor);
    res.status(400);
    throw new Error("Flavor must be a non-empty string");
  }

  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    console.log("addToCart - Invalid product_id:", product_id);
    res.status(400);
    throw new Error("Invalid product ID format");
  }

  let user;
  try {
    user = await User.findById(user_id);
  } catch (error) {
    console.error("addToCart - Error finding user:", error.message);
    res.status(500);
    throw new Error("Server error while validating user");
  }
  if (!user) {
    console.log("addToCart - User not found for ID:", user_id);
    res.status(404);
    throw new Error("User not found");
  }

  const product = await productModel.findById(product_id);
  if (!product) {
    console.log("addToCart - Product not found for ID:", product_id);
    res.status(404);
    throw new Error("Product not found");
  }

  if (!product.flavors.includes(flavor)) {
    console.log(
      "addToCart - Flavor not available for product:",
      flavor,
      product.flavors
    );
    res.status(400);
    throw new Error(`Flavor '${flavor}' is not available for this product`);
  }

  if (!product.nicotine_strengths.includes(Number(nicotine_strength))) {
    console.log(
      "addToCart - Nicotine strength not available for product:",
      nicotine_strength,
      product.nicotine_strengths
    );
    res.status(400);
    throw new Error(
      `Nicotine strength '${nicotine_strength}' is not available for this product`
    );
  }

  let cart = await cartModel.findOne({
    user_id,
    product_id,
    nicotine_strength: Number(nicotine_strength),
    flavor,
  });

  if (cart) {
    console.log(
      "addToCart - Incrementing quantity for existing cart item:",
      cart._id
    );
    cart.quantity += 1;
    await cart.save();
  } else {
    console.log("addToCart - Creating new cart item:", {
      user_id,
      product_id,
      selected_image,
      nicotine_strength: Number(nicotine_strength),
      flavor,
    });
    cart = await cartModel.create({
      user_id,
      product_id,
      selected_image,
      nicotine_strength: Number(nicotine_strength),
      flavor: flavor.trim(),
      quantity: 1,
    });
  }

  try {
    console.log("addToCart - Cart saved successfully:", cart);
  } catch (error) {
    console.error("addToCart - Error saving cart:", error.message);
    res.status(500);
    throw new Error("Server error while saving cart: " + error.message);
  }

  const populatedCart = await cartModel
    .findById(cart._id)
    .populate("product_id");
  res.status(200).json(populatedCart);
});

const getMyCart = handler(async (req, res) => {
  const user_id = req.user?._id;
  console.log("getMyCart called for user:", user_id);

  if (!user_id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  const carts = await cartModel.find({ user_id }).populate("product_id");
  res.status(200).json(carts);
});

const removeFromCart = handler(async (req, res) => {
  const { product_id, selected_image, nicotine_strength, flavor } = req.body;
  const user_id = req.user?._id;

  console.log("removeFromCart called with:", {
    product_id,
    selected_image,
    nicotine_strength,
    flavor,
    user_id,
  });

  if (!user_id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  if (!product_id || !selected_image || !flavor) {
    console.log("removeFromCart - Missing required fields:", {
      product_id,
      selected_image,
      nicotine_strength,
      flavor,
    });
    res.status(400);
    throw new Error(
      "All fields (product_id, selected_image, flavor) are required"
    );
  }

  if (isNaN(Number(nicotine_strength))) {
    console.log(
      "removeFromCart - Invalid nicotine_strength:",
      nicotine_strength
    );
    res.status(400);
    throw new Error("Nicotine strength must be a valid number");
  }

  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    console.log("removeFromCart - Invalid product_id:", product_id);
    res.status(400);
    throw new Error("Invalid product ID format");
  }

  let cart = await cartModel.findOne({
    user_id,
    product_id,
    selected_image,
    nicotine_strength: Number(nicotine_strength),
    flavor,
  });

  if (!cart) {
    console.log("removeFromCart - Cart item not found:", {
      product_id,
      selected_image,
      nicotine_strength,
      flavor,
    });
    res.status(404);
    throw new Error("Cart item not found");
  }

  if (cart.quantity > 1) {
    cart.quantity -= 1;
    await cart.save();
  } else {
    await cartModel.deleteOne({ _id: cart._id });
  }

  const updatedCarts = await cartModel.find({ user_id }).populate("product_id");
  res.status(200).json(updatedCarts);
});

const clearCart = handler(async (req, res) => {
  const user_id = req.user?._id;
  console.log("clearCart called for user:", user_id);

  if (!user_id) {
    res.status(401);
    throw new Error("User not authenticated");
  }

  await cartModel.deleteMany({ user_id });
  res.status(200).json([]);
});

const submitReview = handler(async (req, res) => {
  console.log("submitReview - Request body:", req.body);

  const { user_id, rating, review_text } = req.body;
  const product_id = req.params.productId;

  if (!user_id) {
    console.log("submitReview - No user_id provided");
    res.status(400);
    throw new Error("User ID is required");
  }

  let user;
  try {
    user = await User.findById(user_id);
  } catch (error) {
    console.error("submitReview - Error finding user:", error.message);
    res.status(500);
    throw new Error("Server error while validating user");
  }
  if (!user) {
    console.log("submitReview - User not found for ID:", user_id);
    res.status(404);
    throw new Error("User not found");
  }

  const product = await productModel.findById(product_id);
  if (!product) {
    console.log("submitReview - Product not found for ID:", product_id);
    res.status(404);
    throw new Error("Product not found");
  }

  const review = await reviewModel.create({
    user_id,
    product_id,
    rating,
    review_text,
  });

  product.reviews.push(review._id);
  const reviews = await reviewModel.find({ product_id });
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  product.rating = totalRating / reviews.length;
  await product.save();

  const populatedReview = await reviewModel
    .findById(review._id)
    .populate("user_id", "username");
  console.log("submitReview - Created review:", populatedReview);
  res.status(201).json(populatedReview);
});

const getReviews = handler(async (req, res) => {
  const product_id = req.params.productId;
  console.log(`getReviews - Fetching reviews for product_id: ${product_id}`);

  const product = await productModel.findById(product_id);
  if (!product) {
    console.log(`getReviews - Product not found for ID: ${product_id}`);
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = await reviewModel
    .find({ product_id })
    .populate("user_id", "username");
  console.log(
    `getReviews - Found ${reviews.length} reviews for product_id: ${product_id}`
  );

  res.status(200).json(reviews);
});

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  addToCart,
  getMyCart,
  removeFromCart,
  clearCart,
  submitReview,
  getReviews,
};
