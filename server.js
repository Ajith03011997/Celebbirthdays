/**
 * ═══════════════════════════════════════════════════════
 *  Celebrity Birthdays — server.js
 *  Stack: Node.js + Express + Multer
 * ═══════════════════════════════════════════════════════
 */

const express = require("express");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE  = path.join(__dirname, "data.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOADS_DIR = path.join(__dirname, "uploads");

// ── Bootstrap directories & data file ──────────────────
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ posts: [], meta: { total: 0, last_id: 0 } }, null, 2));
}

// ── Middleware ──────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

// ── Multer — image upload ───────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WEBP images are allowed."));
  },
});

// ── Data helpers ────────────────────────────────────────
function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { posts: [], meta: { total: 0, last_id: 0 } }; }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ══════════════════════════════════════════════════════
//  API ROUTES
// ══════════════════════════════════════════════════════

// ── GET /health ─────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── GET /posts ──────────────────────────────────────────
//    ?page=1&limit=20&search=
app.get("/posts", (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const data  = readData();
    let   posts = [...data.posts].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    if (search) {
      const q = search.toLowerCase();
      posts = posts.filter(
        p => p.name.toLowerCase().includes(q) ||
             p.profession.toLowerCase().includes(q)
      );
    }

    const total     = posts.length;
    const start     = (parseInt(page) - 1) * parseInt(limit);
    const paginated = posts.slice(start, start + parseInt(limit));

    res.json({ success: true, data: paginated, total, page: parseInt(page), limit: parseInt(limit) });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch posts." });
  }
});

// ── GET /posts/today ────────────────────────────────────
//    Matches MM-DD so it works every year
app.get("/posts/today", (_req, res) => {
  try {
    const data = readData();
    const mmdd = new Date().toISOString().slice(5, 10); // "MM-DD"
    const todayPosts = data.posts.filter(
      p => p.date && p.date.slice(5) === mmdd
    );
    res.json({ success: true, data: todayPosts, total: todayPosts.length });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch today's posts." });
  }
});

// ── POST /add-post ──────────────────────────────────────
app.post("/add-post", upload.single("image"), (req, res) => {
  try {
    const { name, profession, wish, date } = req.body;

    if (!name || !profession || !wish || !date)
      return res.status(400).json({ success: false, error: "All fields are required." });
    if (!req.file)
      return res.status(400).json({ success: false, error: "Image is required." });

    const data  = readData();
    const newId = data.meta.last_id + 1;

    const post = {
      id:         newId,
      name:       name.trim(),
      profession: profession.trim(),
      wish:       wish.trim(),
      image:      `/uploads/${req.file.filename}`,
      date,
      views:      0,
      created_at: new Date().toISOString(),
    };

    data.posts.unshift(post);
    data.meta.last_id = newId;
    data.meta.total   = data.posts.length;
    writeData(data);

    res.json({ success: true, data: post, message: "Post created successfully!" });
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ success: false, error: "File too large. Max 5 MB." });
    res.status(500).json({ success: false, error: err.message || "Failed to create post." });
  }
});

// ── POST /increment-view/:id ────────────────────────────
app.post("/increment-view/:id", (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const data = readData();
    const post = data.posts.find(p => p.id === id);

    if (!post)
      return res.status(404).json({ success: false, error: "Post not found." });

    post.views = (post.views || 0) + 1;
    writeData(data);
    res.json({ success: true, views: post.views });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update views." });
  }
});

// ── DELETE /posts/:id ───────────────────────────────────
app.delete("/posts/:id", (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const data = readData();
    const idx  = data.posts.findIndex(p => p.id === id);

    if (idx === -1)
      return res.status(404).json({ success: false, error: "Post not found." });

    // Delete image file
    const imgPath = path.join(__dirname, data.posts[idx].image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

    data.posts.splice(idx, 1);
    data.meta.total = data.posts.length;
    writeData(data);

    res.json({ success: true, message: "Post deleted." });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete post." });
  }
});

// ── POST /generate-wish ─────────────────────────────────
//    Proxies Anthropic API server-side (avoids CORS/browser blocks)
app.post("/generate-wish", async (req, res) => {
  try {
    const { name, profession, tone } = req.body;

    if (!name || !profession || !tone)
      return res.status(400).json({ success: false, error: "name, profession and tone are required." });

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY)
      return res.status(500).json({ success: false, error: "ANTHROPIC_API_KEY not set on server." });

    const toneGuide = {
      warm:          "warm, heartfelt, and genuine — like a close friend wishing them",
      funny:         "fun, playful, and lightly humorous — celebratory and uplifting",
      formal:        "formal, dignified, and elegant — suitable for a professional tribute",
      inspirational: "inspirational and motivational — celebrating their journey and future",
      fan:           "enthusiastic fan-like admiration — full of energy and excitement",
    };

    const prompt = `Generate exactly 3 unique birthday wish messages for a celebrity named ${name}, who is a ${profession}.

Each wish should be ${toneGuide[tone] || "warm and heartfelt"}.

Rules:
- Each wish: 2-4 sentences, 60-120 words each
- Each must feel distinct — not repetitive
- Use the celebrity's name naturally in the text
- No hashtags, no emojis, no bullet points, no numbering
- Return ONLY a valid JSON array of 3 strings, nothing else

Format: ["Wish one here.", "Wish two here.", "Wish three here."]`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            ANTHROPIC_KEY,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-opus-4-5",
        max_tokens: 1024,
        messages:   [{ role: "user", content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error("Anthropic API error:", errText);
      return res.status(502).json({ success: false, error: "AI service error. Try again." });
    }

    const apiData = await apiRes.json();
    const raw     = apiData.content.map(b => b.text || "").join("").trim();
    const clean   = raw.replace(/```json|```/gi, "").trim();
    const wishes  = JSON.parse(clean);

    if (!Array.isArray(wishes) || !wishes.length)
      return res.status(502).json({ success: false, error: "Invalid response from AI. Try again." });

    res.json({ success: true, wishes: wishes.slice(0, 3) });

  } catch (err) {
    console.error("generate-wish error:", err);
    res.status(500).json({ success: false, error: "AI generation failed. Try again." });
  }
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n🎂  Celebrity Birthdays is running!");
  console.log(`    Public site : http://localhost:${PORT}`);
  console.log(`    Admin panel : http://localhost:${PORT}/admin.html\n`);
});
