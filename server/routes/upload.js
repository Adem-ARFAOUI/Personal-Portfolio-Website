const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Cloudinary is configured from environment variables (see .env.example).
// Uploaded files are stored on Cloudinary instead of the local disk because
// hosts like Render use an ephemeral filesystem: anything written to disk at
// runtime disappears on the next restart/redeploy. Cloudinary gives us
// persistent, public URLs that survive redeploys.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function assertCloudinaryConfigured() {
  const missing = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Cloudinary is not configured. Missing env vars: ${missing.join(", ")}. ` +
        "See .env.example.",
    );
  }
}

// Keep the file in memory instead of writing it to disk, then stream it
// straight to Cloudinary.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed."), ok);
  },
});

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === "application/pdf";
    cb(ok ? null : new Error("CV must be a PDF file."), ok);
  },
});

function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

router.post("/image", requireAdmin, (req, res) => {
  imageUpload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    try {
      assertCloudinaryConfigured();
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "portfolio/uploads",
        resource_type: "image",
      });
      res.json({ url: result.secure_url });
    } catch (uploadErr) {
      console.error("Cloudinary image upload failed:", uploadErr);
      res
        .status(500)
        .json({ error: uploadErr.message || "Image upload failed." });
    }
  });
});

router.post("/cv", requireAdmin, (req, res) => {
  cvUpload.single("cv")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    try {
      assertCloudinaryConfigured();
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "portfolio/cv",
        resource_type: "raw",
        public_id: "cv.pdf",
        overwrite: true,
        invalidate: true,
      });
      await db.setSettings({ cvFile: result.secure_url });
      res.json({ url: result.secure_url });
    } catch (uploadErr) {
      console.error("Cloudinary CV upload failed:", uploadErr);
      res.status(500).json({ error: uploadErr.message || "CV upload failed." });
    }
  });
});

module.exports = router;
