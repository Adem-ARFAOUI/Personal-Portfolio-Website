const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/projects?tag=React&category=Web+App  (public)
router.get("/", (req, res) => {
  const { tag, category } = req.query;
  let projects = db.getAll("projects");

  if (tag) {
    projects = projects.filter((p) =>
      (p.tags || []).some((t) => t.toLowerCase() === String(tag).toLowerCase()),
    );
  }
  if (category) {
    projects = projects.filter(
      (p) => (p.category || "").toLowerCase() === String(category).toLowerCase(),
    );
  }

  projects.sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(projects);
});

router.get("/:id", (req, res) => {
  const project = db.getById("projects", req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json(project);
});

// --- Admin only below ---

router.post("/", requireAdmin, async (req, res) => {
  const { title, description, image, tags, category, githubUrl, liveUrl, featured, order } =
    req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required." });
  }
  const project = await db.insert("projects", {
    title,
    description,
    image: image || "",
    tags: Array.isArray(tags) ? tags : String(tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    category: category || "",
    githubUrl: githubUrl || "",
    liveUrl: liveUrl || "",
    featured: Boolean(featured),
    order: Number(order) || 0,
  });
  res.status(201).json(project);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const body = { ...req.body };
  if (body.tags && !Array.isArray(body.tags)) {
    body.tags = String(body.tags).split(",").map((t) => t.trim()).filter(Boolean);
  }
  const project = await db.update("projects", req.params.id, body);
  if (!project) return res.status(404).json({ error: "Project not found." });
  res.json(project);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const ok = await db.remove("projects", req.params.id);
  if (!ok) return res.status(404).json({ error: "Project not found." });
  res.json({ ok: true });
});

module.exports = router;
