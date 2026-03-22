/* ═══════════════════════════════════════════════════════════
   script.js — CelebBirthdays Public Page
   Features: card rendering · copy wish · WhatsApp / FB / X share
             view tracking · pagination · skeleton loaders
═══════════════════════════════════════════════════════════ */

const VIEWED_KEY   = "celeb_viewed_v2";
const RECENT_LIMIT = 20;

let recentPage  = 1;
let recentTotal = 0;
let _uid        = 0; // unique id counter for share menus

// ── Utilities ─────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function toast(msg, type = "info", duration = 3000) {
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

// ── View tracking ─────────────────────────────────────────

function getViewed() {
  try { return JSON.parse(localStorage.getItem(VIEWED_KEY)) || {}; }
  catch { return {}; }
}

function markViewed(id) {
  const v = getViewed();
  v[String(id)] = 1;
  localStorage.setItem(VIEWED_KEY, JSON.stringify(v));
}

function hasViewed(id) { return !!getViewed()[String(id)]; }

async function incrementView(id) {
  if (hasViewed(id)) return;
  markViewed(id); // mark immediately to prevent double-hit on slow networks
  try { await fetch(`/increment-view/${id}`, { method: "POST" }); } catch {}
}

// ── Copy wish ─────────────────────────────────────────────

function copyWish(wish, btn) {
  navigator.clipboard.writeText(wish).then(() => {
    const orig = btn.innerHTML;
    btn.classList.add("copied");
    btn.innerHTML = "✓ Copied!";
    toast("Wish copied to clipboard!", "success");
    setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = orig; }, 2000);
  }).catch(() => toast("Copy failed — please select and copy manually.", "error"));
}

// ── Share functions ───────────────────────────────────────

function shareWhatsApp(name, wish) {
  const text = encodeURIComponent(`🎂 Happy Birthday, ${name}!\n\n${wish}\n\n— via CelebBirthdays`);
  window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
}

function shareFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "noopener,width=620,height=500");
}

function shareX(name, wish) {
  const snippet = wish.length > 180 ? wish.slice(0, 180).trimEnd() + "…" : wish;
  const text = encodeURIComponent(`🎂 Happy Birthday, ${name}!\n\n"${snippet}"\n`);
  const url  = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,width=620,height=450");
}

// Close share menus when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".card-footer")) {
    document.querySelectorAll(".share-menu.open").forEach(m => m.classList.remove("open"));
    document.querySelectorAll(".btn-share-toggle.active").forEach(b => b.classList.remove("active"));
  }
});

// ── SVG icons ─────────────────────────────────────────────

const I_COPY  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
const I_SHARE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
const I_WA    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
const I_FB    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
const I_X     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`;

// ── Card renderer ─────────────────────────────────────────

function renderCard(post, isToday = false) {
  const card   = document.createElement("div");
  const menuId = `sm-${post.id}-${_uid++}`;
  card.className = `card${isToday ? " today-card" : ""}`;

  const shortWish = post.wish.length > 230
    ? post.wish.slice(0, 230).trimEnd() + "…"
    : post.wish;

  const fallback = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect fill='%23181530' width='400' height='300'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='64'>🎂</text></svg>`;

  card.innerHTML = `
    <div class="card-image-wrap">
      <img src="${esc(post.image)}" alt="${esc(post.name)}" loading="lazy" onerror="this.src='${fallback}'" />
      ${isToday ? `<span class="card-badge">🎉 Today!</span>` : ""}
      <span class="card-views-badge">👁 <span class="vc">${post.views || 0}</span></span>
    </div>
    <div class="card-body">
      <div class="card-profession">${esc(post.profession)}</div>
      <h3 class="card-name">${esc(post.name)}</h3>
      <p class="card-wish">${esc(shortWish)}</p>
    </div>
    <div class="card-footer">
      <button class="btn-card btn-copy">${I_COPY} Copy Wish</button>
      <button class="btn-share-toggle">${I_SHARE} Share</button>
      <div class="share-menu" id="${menuId}">
        <span class="share-menu-label">Share this wish via</span>
        <div class="share-btns-row">
          <button class="btn-share btn-share-wa">${I_WA} WhatsApp</button>
          <button class="btn-share btn-share-fb">${I_FB} Facebook</button>
          <button class="btn-share btn-share-x">${I_X} X</button>
        </div>
      </div>
    </div>`;

  // Wire events
  const copyBtn     = card.querySelector(".btn-copy");
  const shareToggle = card.querySelector(".btn-share-toggle");
  const shareMenu   = card.querySelector(".share-menu");

  copyBtn.addEventListener("click", () => copyWish(post.wish, copyBtn));

  shareToggle.addEventListener("click", e => {
    e.stopPropagation();
    const wasOpen = shareMenu.classList.contains("open");
    // close all
    document.querySelectorAll(".share-menu.open").forEach(m => m.classList.remove("open"));
    document.querySelectorAll(".btn-share-toggle.active").forEach(b => b.classList.remove("active"));
    if (!wasOpen) {
      shareMenu.classList.add("open");
      shareToggle.classList.add("active");
    }
  });

  card.querySelector(".btn-share-wa").addEventListener("click", () => {
    shareWhatsApp(post.name, post.wish);
    toast("Opening WhatsApp…", "info");
  });
  card.querySelector(".btn-share-fb").addEventListener("click", () => {
    shareFacebook();
    toast("Opening Facebook…", "info");
  });
  card.querySelector(".btn-share-x").addEventListener("click", () => {
    shareX(post.name, post.wish);
    toast("Opening X…", "info");
  });

  // View increment
  if (!hasViewed(post.id)) {
    const counter = card.querySelector(".vc");
    if (counter) counter.textContent = (parseInt(counter.textContent) || 0) + 1;
    incrementView(post.id);
  }

  return card;
}

// ── Skeleton loader ───────────────────────────────────────

function renderSkeletons(container, count = 3) {
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text tall"></div>
    </div>`).join("");
}

// ── Today's birthdays ─────────────────────────────────────

async function loadToday() {
  const grid      = document.getElementById("todayGrid");
  const empty     = document.getElementById("todayEmpty");
  const countEl   = document.getElementById("todayCount");
  const statToday = document.getElementById("statToday");

  renderSkeletons(grid, 3);

  try {
    const json = await fetch("/posts/today").then(r => r.json());
    grid.innerHTML = "";

    if (!json.success || !json.data.length) {
      grid.style.display = "none";
      empty.style.display = "block";
      statToday.textContent = "0";
      return;
    }

    statToday.textContent = json.data.length;
    countEl.textContent   = `${json.data.length} birthday${json.data.length !== 1 ? "s" : ""} today`;

    json.data.forEach((p, i) => {
      const card = renderCard(p, true);
      card.style.animationDelay = `${i * 0.07}s`;
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = "";
    empty.innerHTML = `<span class="empty-icon">⚠️</span><h3>Failed to load</h3><p>Please refresh the page.</p>`;
    empty.style.display = "block";
  }
}

// ── Recent posts ──────────────────────────────────────────

async function loadRecent(page = 1) {
  const grid     = document.getElementById("recentGrid");
  const empty    = document.getElementById("recentEmpty");
  const countEl  = document.getElementById("recentCount");
  const loadWrap = document.getElementById("loadMoreWrap");
  const loadBtn  = document.getElementById("loadMoreBtn");

  if (page === 1) renderSkeletons(grid, 6);

  try {
    const json = await fetch(`/posts?page=${page}&limit=${RECENT_LIMIT}`).then(r => r.json());
    if (page === 1) grid.innerHTML = "";

    if (!json.success || !json.data.length) {
      if (page === 1) empty.style.display = "block";
      loadWrap.style.display = "none";
      return;
    }

    recentTotal = json.total;
    countEl.textContent = `${recentTotal} total`;
    document.getElementById("statTotal").textContent = recentTotal;

    json.data.forEach((p, i) => {
      const card = renderCard(p, false);
      card.style.animationDelay = `${i * 0.05}s`;
      grid.appendChild(card);
    });

    recentPage = page;
    const loaded = page * RECENT_LIMIT;
    loadWrap.style.display = loaded < recentTotal ? "block" : "none";
    if (loadBtn) loadBtn.disabled = false;
  } catch {
    if (page === 1) {
      grid.innerHTML = "";
      empty.innerHTML = `<span class="empty-icon">⚠️</span><h3>Failed to load posts</h3><p>Please refresh the page.</p>`;
      empty.style.display = "block";
    } else {
      toast("Failed to load more posts.", "error");
    }
  }
}

function loadMoreRecent() {
  const btn = document.getElementById("loadMoreBtn");
  btn.disabled = true;
  btn.textContent = "Loading…";
  loadRecent(recentPage + 1).then(() => {
    btn.textContent = "Load More Posts";
  });
}

// ── Init ──────────────────────────────────────────────────
(async () => { await Promise.all([loadToday(), loadRecent(1)]); })();
