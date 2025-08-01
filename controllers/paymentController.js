const handler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");
const { v4: uuidv4 } = require("uuid");

const payment = handler(async (req, res) => {
  const { products, shipping_address, user_id } = req.body;

  console.log("Payment request received:", {
    products,
    shipping_address,
    user_id,
  });

  if (!products || !Array.isArray(products) || products.length === 0) {
    console.error("No products provided");
    res.status(400);
    throw new Error("No products provided for checkout");
  }

  if (!shipping_address) {
    console.error("Shipping address missing");
    res.status(400);
    throw new Error("Shipping address is required");
  }

  try {
    const myItems = await Promise.all(
      products.map(async (item) => {
        const myProduct = await productModel.findOne({ _id: item.product_id });
        if (!myProduct) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        // Check stock availability
        if (myProduct.product_stock < item.quantity) {
          throw new Error(
            `Product ${myProduct.product_name} has only ${myProduct.product_stock} units in stock`
          );
        }

        const selectedImage =
          item.selected_image &&
          myProduct.product_images.includes(item.selected_image)
            ? item.selected_image
            : myProduct.product_images[0] || "https://via.placeholder.com/150";

        return {
          price_data: {
            currency: "USD",
            product_data: {
              name: myProduct.product_name,
              images: [selectedImage],
            },
            unit_amount: Math.round(myProduct.product_discounted_price * 100),
          },
          quantity: item.quantity,
        };
      })
    );

    const total_amount = myItems.reduce(
      (sum, item) => sum + (item.price_data.unit_amount / 100) * item.quantity,
      0
    );

    // Use provided user_id or generate a guest ID
    const orderUserId = user_id || `guest_${uuidv4()}`;

    // Create order
    const order = await orderModel.create({
      user_id: orderUserId,
      products: products.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        selected_image: item.selected_image,
      })),
      total_amount,
      shipping_address,
      status: "pending",
      payment_status: "pending",
    });
    console.log("Order created:", order);

    // Update product stock
    await Promise.all(
      products.map(async (item) => {
        await productModel.findByIdAndUpdate(item.product_id, {
          $inc: { product_stock: -item.quantity },
        });
      })
    );

    const stripeSession = await stripe.checkout.sessions.create({
      line_items: myItems,
      mode: "payment",
      success_url: `http://localhost:5173/success`,
      cancel_url: "http://localhost:5173/cancel",
      metadata: { orderId: order._id.toString(), user_id: orderUserId },
    });

    await orderModel.findByIdAndUpdate(order._id, {
      stripe_session_id: stripeSession.id,
    });

    res.status(200).json({ url: stripeSession.url });
  } catch (error) {
    console.error("Payment processing error:", error.message);
    res
      .status(400)
      .json({ message: error.message || "Failed to process payment" });
  }
});

module.exports = { payment };
