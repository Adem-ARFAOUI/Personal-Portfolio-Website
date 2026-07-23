require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const projectsRoutes = require("./routes/projects");
const blogRoutes = require("./routes/blog");
const contactRoutes = require("./routes/contact");
const messagesRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload");
const settingsRoutes = require("./routes/settings");

if (!process.env.JWT_SECRET) {
  console.error(
    "Missing JWT_SECRET in your environment. Copy .env.example to .env, fill it in, then restart.",
  );
  process.exit(1);
}

const app = express();
const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// --- API ---
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- Static site ---
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

// SPA-ish fallbacks for clean URLs
app.get("/admin", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "admin", "index.html")));
app.get("/blog", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "blog.html")));
app.get("/blog/:slug", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "post.html")));

// 404
app.use((req, res) => {
  const notFoundPage = path.join(PUBLIC_DIR, "404.html");
  if (fs.existsSync(notFoundPage)) return res.status(404).sendFile(notFoundPage);
  res.status(404).send("Not found");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
