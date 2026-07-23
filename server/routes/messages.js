const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAdmin);

router.get("/", (req, res) => {
  const messages = db
    .getAll("messages")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(messages);
});

router.patch("/:id/read", async (req, res) => {
  const msg = await db.update("messages", req.params.id, { read: true });
  if (!msg) return res.status(404).json({ error: "Message not found." });
  res.json(msg);
});

router.delete("/:id", async (req, res) => {
  const ok = await db.remove("messages", req.params.id);
  if (!ok) return res.status(404).json({ error: "Message not found." });
  res.json({ ok: true });
});

module.exports = router;
