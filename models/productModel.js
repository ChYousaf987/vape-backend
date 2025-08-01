const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
    },
    product_description: {
      type: String,
      required: true,
    },
    product_base_price: {
      type: Number,
      required: true,
    },
    product_discounted_price: {
      type: Number,
      required: true,
    },
    product_stock: {
      type: Number,
      required: true,
      default: 0,
    },
    product_images: {
      type: Array,
      required: true,
      default: [],
    },
    product_catagory: {
      type: Array,
      required: true,
      default: [],
    },
    brand_name: {
      type: String,
      required: true,
    },
    product_code: {
      type: String,
      required: true,
      unique: true,
    },
    rating: {
      type: Number,
      required: false,
      default: 4,
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);
