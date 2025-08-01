const handler = require("express-async-handler");
const productModel = require("../models/productModel");
const cartModel = require("../models/cartModel");
const reviewModel = require("../models/reviewModel");

const createProduct = handler(async (req, res) => {
  const {
    product_name,
    product_description,
    product_base_price,
    product_discounted_price,
    product_stock,
    product_images,
    product_catagory,
    brand_name,
    product_code,
    rating,
  } = req.body;

  if (
    !product_name ||
    !product_description ||
    !product_base_price ||
    !product_discounted_price ||
    !product_images ||
    !product_catagory ||
    !brand_name ||
    !product_code
  ) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const basePrice = Number(product_base_price);
  const discountedPrice = Number(product_discounted_price);

  if (isNaN(basePrice) || isNaN(discountedPrice)) {
    res.status(400);
    throw new Error("Prices must be valid numbers");
  }

  if (basePrice <= 0 || discountedPrice <= 0) {
    res.status(400);
    throw new Error("Prices must be positive");
  }

  if (discountedPrice > basePrice) {
    res.status(400);
    throw new Error("Discounted price cannot be higher than base price");
  }

  if (
    (product_catagory.includes("Disposables") ||
      product_catagory.includes("Devices")) &&
    product_images.length !== 7
  ) {
    res.status(400);
    throw new Error(
      "Vape/pod products must have exactly 7 images for color variants"
    );
  }

  const product = await productModel.create({
    product_name,
    product_description,
    product_base_price: basePrice,
    product_discounted_price: discountedPrice,
    product_stock: product_stock !== undefined ? product_stock : true,
    product_images,
    product_catagory,
    brand_name,
    product_code,
    rating: rating || 4,
    reviews: [],
  });

  res.status(201).json({
    _id: product._id,
    product_name: product.product_name,
    product_description: product.product_description,
    product_base_price: product.product_base_price,
    product_discounted_price: product.product_discounted_price,
    product_stock: product.product_stock,
    product_images: product.product_images,
    product_catagory: product.product_catagory,
    brand_name: product.brand_name,
    product_code: product.product_code,
    rating: product.rating,
    createdAt: product.createdAt,
  });
});

const getProducts = handler(async (req, res) => {
  const products = await productModel.find().populate("reviews");
  res.status(200).json(products);
});

const getProductById = handler(async (req, res) => {
  const product = await productModel
    .findById(req.params.id)
    .populate("reviews");
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }
  res.status(200).json(product);
});

const getProductsByCategory = handler(async (req, res) => {
  const category = req.params.category;
  const products = await productModel
    .find({ product_catagory: category })
    .populate("reviews");
  if (!products || products.length === 0) {
    res.status(404);
    throw new Error("No products found in this category");
  }
  res.status(200).json(products);
});

const updateProduct = handler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }

  const {
    product_name,
    product_description,
    product_base_price,
    product_discounted_price,
    product_stock,
    product_images,
    product_catagory,
    brand_name,
    product_code,
    rating,
  } = req.body;

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

  if (
    (product_catagory &&
      (product_catagory.includes("Disposables") ||
        product_catagory.includes("Devices"))) ||
    product.product_catagory.includes("Disposables") ||
    product.product_catagory.includes("Devices")
  ) {
    if (product_images && product_images.length !== 7) {
      res.status(400);
      throw new Error(
        "Vape/pod products must have exactly 7 images for color variants"
      );
    }
  }

  const updatedProduct = await productModel
    .findByIdAndUpdate(
      req.params.id,
      {
        product_name: product_name || product.product_name,
        product_description: product_description || product.product_description,
        product_base_price: basePrice,
        product_discounted_price: discountedPrice,
        product_stock:
          product_stock !== undefined ? product_stock : product.product_stock,
        product_images: product_images || product.product_images,
        product_catagory: product_catagory || product.product_catagory,
        brand_name: brand_name || product.brand_name,
        product_code: product_code || product.product_code,
        rating: rating || product.rating,
      },
      { new: true }
    )
    .populate("reviews");

  res.status(200).json(updatedProduct);
});

const deleteProduct = handler(async (req, res) => {
  const product = await productModel.findById(req.params.id);
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }

  await reviewModel.deleteMany({ product_id: req.params.id });
  await productModel.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Product deleted successfully" });
});

const addToCart = handler(async (req, res) => {
  const { prod_id, selected_image } = req.body;
  const user_id = req.user._id;

  const product = await productModel.findById(prod_id);
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }

  if (selected_image && !product.product_images.includes(selected_image)) {
    res.status(400);
    throw new Error("Invalid color variant selected");
  }

  const itemExist = await cartModel.findOne({
    product_id: prod_id,
    user_id,
    selected_image,
  });

  if (itemExist) {
    itemExist.quantity += 1;
    await itemExist.save();
  } else {
    await cartModel.create({
      user_id,
      product_id: prod_id,
      selected_image: selected_image || product.product_images[0],
      quantity: 1,
    });
  }

  const findCart = await cartModel.find({ user_id }).populate("product_id");
  res.status(200).json(findCart);
});

const removeFromCart = handler(async (req, res) => {
  const { prod_id, selected_image } = req.body;
  const user_id = req.user._id;

  const itemExist = await cartModel.findOne({
    product_id: prod_id,
    user_id,
    selected_image,
  });

  if (itemExist) {
    if (itemExist.quantity > 1) {
      itemExist.quantity -= 1;
      await itemExist.save();
    } else {
      await cartModel.deleteOne({
        product_id: prod_id,
        user_id,
        selected_image,
      });
    }
  } else {
    res.status(400);
    throw new Error("Item not found in cart");
  }

  const findCart = await cartModel.find({ user_id }).populate("product_id");
  res.status(200).json(findCart);
});

const getMyCart = handler(async (req, res) => {
  const user_id = req.user._id;
  const mycart = await cartModel.find({ user_id }).populate("product_id");
  res.status(200).json(mycart);
});

const submitReview = handler(async (req, res) => {
  const { rating, review_text } = req.body;
  const product_id = req.params.productId;
  const user_id = req.user?._id; // Optional user_id

  if (!rating || !review_text) {
    res.status(400);
    throw new Error("Rating and review text are required");
  }

  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const product = await productModel.findById(product_id);
  if (!product) {
    res.status(400);
    throw new Error("Product not found");
  }

  // Allow anonymous reviews; only check for duplicates if user_id exists
  if (user_id) {
    const existingReview = await reviewModel.findOne({ user_id, product_id });
    if (existingReview) {
      res.status(400);
      throw new Error("You have already reviewed this product");
    }
  }

  const review = await reviewModel.create({
    user_id: user_id || null, // Store null for anonymous reviews
    product_id,
    rating,
    review_text,
  });

  product.reviews.push(review._id);
  const reviews = await reviewModel.find({ product_id });
  const averageRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 4;
  product.rating = averageRating.toFixed(1);
  await product.save();

  res.status(201).json({
    _id: review._id,
    user_id: review.user_id,
    product_id: review.product_id,
    rating: review.rating,
    review_text: review.review_text,
    createdAt: review.createdAt,
  });
});

const getReviews = handler(async (req, res) => {
  const product_id = req.params.productId;
  const reviews = await reviewModel
    .find({ product_id })
    .populate("user_id", "name");
  if (!reviews || reviews.length === 0) {
    res.status(404);
    throw new Error("No reviews found for this product");
  }
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
  submitReview,
  getReviews,
};
