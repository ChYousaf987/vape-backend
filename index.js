const express = require("express");
const errorHandler = require("./middlewares/errorMiddleware");
const connectDB = require("./config/connectDB");
const cors = require("cors");
const slideRouter = require("./routes/slideRoutes");
const multer = require("multer");

const app = express();

require("dotenv").config();
require("colors");

// Configure CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://cloudandroots.com",
      "https://dasboard.cloudandroots.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Connect to MongoDB
connectDB();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer fileFilter - file:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err.message, err);
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  }
  next(err);
};

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use("/api/users/", require("./routes/userRoutes"));
app.use("/api/admins/", require("./routes/adminRoutes"));
app.use("/api/products/", require("./routes/productRoutes"));
app.use("/api/payment/", require("./routes/paymentRoutes"));
app.use("/api/orders/", require("./routes/orderRoutes"));
app.use("/api/slides", upload.single("image"), slideRouter);

// Apply multer error handling after routes
app.use(handleMulterError);

// General error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server started on port: ${PORT}`.yellow));
