const express = require("express");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { sendContactNotification } = require("../utils/mailer");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { error: "Too many messages sent. Please try again later." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", contactLimiter, async (req, res) => {
  const { user_name, user_email, message, website } = req.body || {};

  // Honeypot: real users never fill this hidden field, bots often do.
  if (website) {
    return res.json({ ok: true });
  }

  const name = String(user_name || "").trim();
  const email = String(user_email || "").trim();
  const msg = String(message || "").trim();

  if (!name || !email || !msg) {
    return res.status(400).json({ error: "Name, email, and message are all required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (msg.length > 5000) {
    return res.status(400).json({ error: "Message is too long." });
  }

  const saved = await db.insert("messages", {
    name,
    email,
    message: msg,
    createdAt: new Date().toISOString(),
    read: false,
  });

  // Respond immediately once the message is safely saved — the message is
  // never lost even if outgoing email is slow, misconfigured, or down.
  // It's always visible in the admin dashboard either way.
  res.status(201).json({ ok: true, saved: true, id: saved.id });

  sendContactNotification({ name, email, message: msg }).catch((err) => {
    console.error("Failed to send contact email:", err.message);
  });
});

module.exports = router;
