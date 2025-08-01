const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    user_id: {
      type: String, // Changed to String to support guest IDs
      required: true,
    },
    products: [
      {
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
      },
    ],
    total_amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    payment_status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    shipping_address: {
      type: String,
      required: true,
    },
    stripe_session_id: {
      type: String,
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
