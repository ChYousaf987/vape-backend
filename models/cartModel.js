const mongoose = require("mongoose");

const cartSchema = mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    selected_image: {
      type: String,
      required: false,
    },
    nicotine_strength: {
      type: Number,
      required: true,
    },
    flavor: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
