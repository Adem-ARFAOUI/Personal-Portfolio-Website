const express = require("express");
const slugify = require("slugify");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/blog (public) — only published posts, newest first
router.get("/", (req, res) => {
  const posts = db
    .getAll("posts")
    .filter((p) => p.published)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

// GET /api/blog/all (admin) — everything, including drafts
router.get("/all", requireAdmin, (req, res) => {
  const posts = db
    .getAll("posts")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

router.get("/:slug", (req, res) => {
  const post = db.find("posts", (p) => p.slug === req.params.slug);
  if (!post || !post.published) {
    return res.status(404).json({ error: "Post not found." });
  }
  res.json(post);
});

router.post("/", requireAdmin, async (req, res) => {
  const { title, excerpt, content, coverImage, published } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }
  const baseSlug = slugify(title, { lower: true, strict: true });
  const existingSlugs = new Set(db.getAll("posts").map((p) => p.slug));
  let slug = baseSlug;
  let i = 2;
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${i++}`;
  }

  const now = new Date().toISOString();
  const post = await db.insert("posts", {
    title,
    slug,
    excerpt: excerpt || content.slice(0, 140),
    content,
    coverImage: coverImage || "",
    published: published !== false,
    createdAt: now,
    updatedAt: now,
  });
  res.status(201).json(post);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const body = { ...req.body, updatedAt: new Date().toISOString() };
  if (body.title && !body.slug) {
    // keep slug stable unless explicitly changed by the admin
  }
  const post = await db.update("posts", req.params.id, body);
  if (!post) return res.status(404).json({ error: "Post not found." });
  res.json(post);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const ok = await db.remove("posts", req.params.id);
  if (!ok) return res.status(404).json({ error: "Post not found." });
  res.json({ ok: true });
});

module.exports = router;
