/* ═══════════════════════════════════════════════════════════
   admin.js — CelebBirthdays Admin Panel
   Features: add/delete posts · image upload + preview
             AI wish generation (Anthropic API)
             live search · pagination
═══════════════════════════════════════════════════════════ */

const ADMIN_LIMIT = 25;
let adminPage        = 1;
let adminTotal       = 0;
let adminSearch      = "";
let adminSearchTimer = null;

// ── Toast ─────────────────────────────────────────────────

function toast(msg, type = "info", duration = 3500) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toastContainer").appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 320);
  }, duration);
}

// ── Helpers ───────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  } catch { return s; }
}

function highlightErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = "var(--rose)";
  el.focus();
  toast(msg, "error");
  el.addEventListener("input", () => { el.style.borderColor = ""; }, { once: true });
}

// ── Posts table ───────────────────────────────────────────

async function loadAdminPosts(page = 1, search = "") {
  const tbody   = document.getElementById("adminTableBody");
  const countEl = document.getElementById("adminPostCount");
  const loadWrap = document.getElementById("adminLoadMoreWrap");
  const loadBtn  = document.getElementById("adminLoadMoreBtn");

  if (page === 1) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:44px;color:rgba(244,240,255,.3)">Loading…</td></tr>`;
  }

  try {
    const params = new URLSearchParams({ page, limit: ADMIN_LIMIT, search });
    const json = await fetch(`/posts?${params}`).then(r => r.json());

    if (page === 1) tbody.innerHTML = "";
    adminTotal = json.total || 0;
    countEl.textContent = `(${adminTotal} total)`;

    if (!json.data || !json.data.length) {
      if (page === 1) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:44px;color:rgba(244,240,255,.3)">No posts found.</td></tr>`;
      }
      loadWrap.style.display = "none";
      return;
    }

    json.data.forEach(post => {
      const tr = document.createElement("tr");
      tr.dataset.id = post.id;
      const fallback = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 52 40'><rect fill='%23181530' width='52' height='40'/><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='20'>🎂</text></svg>`;
      tr.innerHTML = `
        <td><img class="table-img" src="${esc(post.image)}" alt="${esc(post.name)}" onerror="this.src='${fallback}'" /></td>
        <td><div class="table-name">${esc(post.name)}</div></td>
        <td><div class="table-profession">${esc(post.profession)}</div></td>
        <td><div class="table-date">${fmtDate(post.date)}</div></td>
        <td><div class="table-views">👁 ${post.views || 0}</div></td>
        <td><button class="btn-delete" onclick="deletePost(${post.id},this)">🗑 Delete</button></td>`;
      tbody.appendChild(tr);
    });

    adminPage = page;
    const loaded = page * ADMIN_LIMIT;
    loadWrap.style.display = loaded < adminTotal ? "block" : "none";
    if (loadBtn) loadBtn.disabled = false;
  } catch {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:44px;color:var(--rose-light)">Failed to load posts.</td></tr>`;
  }
}

function adminLoadMore() {
  const btn = document.getElementById("adminLoadMoreBtn");
  btn.disabled = true;
  btn.textContent = "Loading…";
  loadAdminPosts(adminPage + 1, adminSearch).then(() => {
    btn.textContent = "Load More";
    btn.disabled = false;
  });
}

async function deletePost(id, btn) {
  if (!confirm("Delete this post permanently? This cannot be undone.")) return;
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    const json = await fetch(`/posts/${id}`, { method: "DELETE" }).then(r => r.json());
    if (json.success) {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) { row.style.opacity = "0"; row.style.transition = ".3s"; setTimeout(() => row.remove(), 300); }
      adminTotal--;
      document.getElementById("adminPostCount").textContent = `(${adminTotal} total)`;
      toast("Post deleted.", "success");
    } else {
      toast(json.error || "Delete failed.", "error");
      btn.disabled = false; btn.textContent = "🗑 Delete";
    }
  } catch {
    toast("Network error.", "error");
    btn.disabled = false; btn.textContent = "🗑 Delete";
  }
}

// ── Image preview ─────────────────────────────────────────

const imgInput  = document.getElementById("fieldImage");
const uploadArea = document.getElementById("uploadArea");
const imgPreview = document.getElementById("imgPreview");
const previewImg = document.getElementById("previewImg");
const removeImg  = document.getElementById("removeImg");

function showPreview(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast("File too large. Max 5 MB.", "error");
    imgInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    imgPreview.style.display = "block";
    uploadArea.style.display = "none";
  };
  reader.readAsDataURL(file);
}

imgInput.addEventListener("change", () => showPreview(imgInput.files[0]));

removeImg.addEventListener("click", () => {
  imgInput.value = "";
  previewImg.src = "";
  imgPreview.style.display = "none";
  uploadArea.style.display = "block";
});

// Drag & drop
uploadArea.addEventListener("dragover", e => { e.preventDefault(); uploadArea.classList.add("dragging"); });
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragging"));
uploadArea.addEventListener("drop", e => {
  e.preventDefault();
  uploadArea.classList.remove("dragging");
  if (e.dataTransfer.files.length) {
    imgInput.files = e.dataTransfer.files;
    showPreview(imgInput.files[0]);
  }
});

// ── Character count ───────────────────────────────────────

document.getElementById("fieldWish").addEventListener("input", function () {
  document.getElementById("wishCount").textContent = this.value.length;
});

// ── Form submit ───────────────────────────────────────────

document.getElementById("addPostForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const name       = document.getElementById("fieldName").value.trim();
  const profession = document.getElementById("fieldProfession").value.trim();
  const date       = document.getElementById("fieldDate").value;
  const wish       = document.getElementById("fieldWish").value.trim();
  const image      = imgInput.files[0];

  if (!name)       return highlightErr("fieldName", "Please enter the celebrity name.");
  if (!profession) return highlightErr("fieldProfession", "Please enter the profession.");
  if (!date)       return highlightErr("fieldDate", "Please select a birthday date.");
  if (!wish)       return highlightErr("fieldWish", "Please write a birthday wish.");
  if (!image)      return toast("Please upload a celebrity photo.", "error");

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "⏳ Publishing…";

  try {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("profession", profession);
    fd.append("date", date);
    fd.append("wish", wish);
    fd.append("image", image);

    const json = await fetch("/add-post", { method: "POST", body: fd }).then(r => r.json());

    if (json.success) {
      document.getElementById("successBanner").style.display = "block";
      toast(`🎉 ${name}'s birthday published!`, "success");

      setTimeout(() => {
        this.reset();
        document.getElementById("wishCount").textContent = "0";
        document.getElementById("aiStatus").textContent = "";
        document.getElementById("aiVariations").style.display = "none";
        document.getElementById("aiVariationsList").innerHTML = "";
        imgInput.value = "";
        previewImg.src = "";
        imgPreview.style.display = "none";
        uploadArea.style.display = "block";
        document.getElementById("successBanner").style.display = "none";
      }, 2400);

      loadAdminPosts(1, adminSearch);
    } else {
      toast(json.error || "Failed to publish post.", "error");
    }
  } catch {
    toast("Network error. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "🎉 Publish Birthday Post";
  }
});

// ── Search ────────────────────────────────────────────────

document.getElementById("adminSearch").addEventListener("input", function () {
  clearTimeout(adminSearchTimer);
  const q = this.value.trim();
  adminSearchTimer = setTimeout(() => {
    adminSearch = q;
    loadAdminPosts(1, q);
  }, 400);
});

// ══════════════════════════════════════════════════════════
//  AI WISH GENERATOR
// ══════════════════════════════════════════════════════════

const TONE_LABELS = {
  warm:          "Warm & Heartfelt",
  funny:         "Fun & Playful",
  formal:        "Formal & Elegant",
  inspirational: "Inspirational",
  fan:           "Enthusiastic Fan",
};

async function generateWish(isRegen = false) {
  const name       = document.getElementById("fieldName").value.trim();
  const profession = document.getElementById("fieldProfession").value.trim();
  const tone       = document.getElementById("aiTone").value;
  const genBtn     = document.getElementById("btnAiGen");
  const genLabel   = document.getElementById("aiGenLabel");
  const regenBtn   = document.getElementById("btnRegen");
  const statusEl   = document.getElementById("aiStatus");
  const panel      = document.getElementById("aiVariations");
  const list       = document.getElementById("aiVariationsList");

  if (!name)       { highlightErr("fieldName", "Enter the celebrity name first."); return; }
  if (!profession) { highlightErr("fieldProfession", "Enter the profession first."); return; }

  // loading UI
  genBtn.disabled = true;
  genBtn.classList.add("generating");
  genLabel.textContent = "Generating…";
  if (regenBtn) regenBtn.disabled = true;
  statusEl.textContent = "🤖 Crafting 3 unique wishes…";

  // skeleton
  panel.style.display = "block";
  list.innerHTML = [0,1,2].map(() => `
    <div class="ai-variation-skeleton">
      <div class="skeleton skeleton-text" style="height:13px;margin:0 0 6px;width:90%"></div>
      <div class="skeleton skeleton-text" style="height:13px;margin:0 0 6px;width:76%"></div>
      <div class="skeleton skeleton-text" style="height:13px;margin:0;width:58%"></div>
    </div>`).join("");

  try {
    const wishes = await callClaude(name, profession, tone);
    if (!wishes || !wishes.length) throw new Error("Empty response");

    list.innerHTML = "";
    wishes.forEach((wish, i) => {
      const item = document.createElement("div");
      item.className = "ai-variation-item";
      item.dataset.wish = wish;
      item.innerHTML = `
        <p class="ai-variation-text">${esc(wish)}</p>
        <div class="ai-variation-actions">
          <button class="btn-use-wish" onclick="useWish(${i})">✓ Use This</button>
          <span class="ai-variation-tag">${esc(TONE_LABELS[tone])} · Option ${i + 1}</span>
        </div>`;
      list.appendChild(item);
    });

    statusEl.textContent = `✨ ${wishes.length} wishes generated — pick one`;
    toast("3 birthday wishes ready!", "success");
  } catch (err) {
    console.error("AI error:", err);
    panel.style.display = "none";
    statusEl.textContent = "";
    toast("AI generation failed. Check your internet or try again.", "error");
  } finally {
    genBtn.disabled = false;
    genBtn.classList.remove("generating");
    genLabel.textContent = "✨ Generate";
    if (regenBtn) regenBtn.disabled = false;
  }
}

async function callClaude(name, profession, tone) {
  // Call our own server — it proxies to Anthropic with the API key securely
  const res = await fetch("/generate-wish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, profession, tone }),
  });

  const data = await res.json();

  if (!data.success) throw new Error(data.error || "Server error");
  if (!Array.isArray(data.wishes)) throw new Error("Invalid response");

  return data.wishes;
}

function useWish(index) {
  const items = document.querySelectorAll(".ai-variation-item");
  items.forEach(el => el.classList.remove("selected"));

  const item = items[index];
  if (!item) return;
  item.classList.add("selected");

  const wish = item.dataset.wish;
  const ta = document.getElementById("fieldWish");
  ta.value = wish;
  document.getElementById("wishCount").textContent = wish.length;
  document.getElementById("aiStatus").textContent = `✓ Option ${index + 1} selected`;

  ta.focus();
  ta.scrollIntoView({ behavior: "smooth", block: "center" });
  toast("Wish applied! Edit it freely before publishing.", "info");
}

// ── Init ──────────────────────────────────────────────────
loadAdminPosts(1);
