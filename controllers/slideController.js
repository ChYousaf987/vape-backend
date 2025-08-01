const handler = require("express-async-handler");
const slideModel = require("../models/slideModel");
const cloudinary = require("cloudinary").v2;

// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
  const requiredEnvVars = {
    cloud_name: process.env.Cloud_Name,
    api_key: process.env.API_Key,
    api_secret: process.env.API_Secret,
  };

  console.log("Cloudinary config:", {
    cloud_name: process.env.Cloud_Name,
    api_key: !!process.env.API_Key, // Hide actual API key for security
    api_secret: !!process.env.API_Secret, // Hide actual API secret for security
  });

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing Cloudinary environment variable: ${key}`);
    }
  }

  cloudinary.config({
    cloud_name: process.env.Cloud_Name,
    api_key: process.env.API_Key,
    api_secret: process.env.API_Secret,
  });
};

const createSlide = handler(async (req, res) => {
  console.log("createSlide - req.body:", req.body);
  console.log(
    "createSlide - req.file:",
    req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file received"
  );

  const { title, subtitle, buttonText, link } = req.body;

  if (!title || !subtitle || !buttonText || !req.file) {
    console.error("Missing required fields:", {
      title: !!title,
      subtitle: !!subtitle,
      buttonText: !!buttonText,
      file: !!req.file,
    });
    res.status(400);
    throw new Error("Please provide all required fields, including an image");
  }

  try {
    // Validate Cloudinary configuration
    validateCloudinaryConfig();

    // Upload image to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "slides" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error.message);
            reject(new Error(`Cloudinary error: ${error.message}`));
          } else {
            resolve(result);
          }
        }
      );
      stream.end(req.file.buffer);
    });

    const slide = await slideModel.create({
      title,
      subtitle,
      buttonText,
      image: result.secure_url,
      link: link || "/products",
    });

    res.status(201).json({
      _id: slide._id,
      title: slide.title,
      subtitle: slide.subtitle,
      buttonText: slide.buttonText,
      image: slide.image,
      link: slide.link,
      createdAt: slide.createdAt,
    });
  } catch (error) {
    console.error("Error in createSlide:", error.message);
    res.status(500);
    throw new Error(`Failed to create slide: ${error.message}`);
  }
});

const getSlides = handler(async (req, res) => {
  const slides = await slideModel.find().sort({ createdAt: -1 });
  res.status(200).json(slides);
});

const getSlideById = handler(async (req, res) => {
  const slide = await slideModel.findById(req.params.id);

  if (!slide) {
    res.status(404);
    throw new Error("Slide not found");
  }

  res.status(200).json(slide);
});

const updateSlide = handler(async (req, res) => {
  console.log("updateSlide - req.body:", req.body);
  console.log(
    "updateSlide - req.file:",
    req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : "No file received"
  );

  const slide = await slideModel.findById(req.params.id);

  if (!slide) {
    res.status(404);
    throw new Error("Slide not found");
  }

  const { title, subtitle, buttonText, link } = req.body;

  let imageUrl = slide.image;
  if (req.file) {
    try {
      // Validate Cloudinary configuration
      validateCloudinaryConfig();

      // Upload new image to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "slides" },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error.message);
              reject(new Error(`Cloudinary error: ${error.message}`));
            } else {
              resolve(result);
            }
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    } catch (error) {
      console.error("Error in updateSlide:", error.message);
      res.status(500);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  const updatedSlide = await slideModel.findByIdAndUpdate(
    req.params.id,
    {
      title: title || slide.title,
      subtitle: subtitle || slide.subtitle,
      buttonText: buttonText || slide.buttonText,
      image: imageUrl,
      link: link || slide.link,
    },
    { new: true }
  );

  res.status(200).json(updatedSlide);
});

const deleteSlide = handler(async (req, res) => {
  const slide = await slideModel.findById(req.params.id);

  if (!slide) {
    res.status(404);
    throw new Error("Slide not found");
  }

  await slideModel.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Slide deleted successfully" });
});

module.exports = {
  createSlide,
  getSlides,
  getSlideById,
  updateSlide,
  deleteSlide,
};
