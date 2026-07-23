const express = require("express");
const db = require("../db");

const router = express.Router();

// Public: expose only the safe, public bits of settings (e.g. current CV file).
router.get("/", (req, res) => {
  const settings = db.getSettings();
  res.json({ cvFile: settings.cvFile || null });
});

module.exports = router;
