const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "public", "uploads");
const CV_DIR = path.join(__dirname, "..", "..", "public", "cv");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(CV_DIR, { recursive: true });

function safeName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  return `${Date.now()}-${base}${ext}`;
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, safeName(file.originalname)),
});
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files are allowed."), ok);
  },
});

const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CV_DIR),
  filename: (req, file, cb) => cb(null, "cv" + path.extname(file.originalname).toLowerCase()),
});
const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === "application/pdf";
    cb(ok ? null : new Error("CV must be a PDF file."), ok);
  },
});

router.post("/image", requireAdmin, (req, res) => {
  imageUpload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

router.post("/cv", requireAdmin, (req, res) => {
  cvUpload.single("cv")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    await db.setSettings({ cvFile: `/cv/${req.file.filename}` });
    res.json({ url: `/cv/${req.file.filename}` });
  });
});

module.exports = router;
