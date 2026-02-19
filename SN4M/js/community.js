(() => {

  const profileImg = document.getElementById("profileImg");
  const profileBox = document.querySelector(".profile");
  const logoBtn = document.getElementById("logoBtn");

  const DEFAULT_AVATAR = "media/default-avatar.jpg";

  function ensureDemoUser() {
    if (localStorage.getItem("currentUser")) return;
    const demoUser = { id: "demo_user", username: "demo_user", email: "demo@sn4m.local" };
    localStorage.setItem("currentUser", JSON.stringify(demoUser));
  }

  function loadAvatar() {
    try {
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      profileImg.src = (currentUser && currentUser.avatar) ? currentUser.avatar : DEFAULT_AVATAR;
    } catch {
      profileImg.src = DEFAULT_AVATAR;
    }
  }

  profileImg?.addEventListener("error", () => (profileImg.src = DEFAULT_AVATAR));
  profileBox?.addEventListener("click", () => (window.location.href = "user_profile.html"));
  logoBtn?.addEventListener("click", () => (window.location.href = "landing_page.html"));

  ensureDemoUser();
  loadAvatar();

  
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseTags(txt) {
    return String(txt || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  function ensureId(prefix = "co") {
    return (crypto?.randomUUID?.() || `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null"); }
    catch { return null; }
  }

  function getCurrentUserId() {
    const u = getCurrentUser();
    return (u && (u.id || u.username || u.email)) ? String(u.id || u.username || u.email) : "guest";
  }

  function getCurrentUsername() {
    const u = getCurrentUser();
    return (u && (u.username || u.id || u.email)) ? String(u.username || u.id || u.email) : "guest";
  }

  function fmtDuration(sec) {
    const s = Number(sec || 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  
  function communityCoverDataUri(seedText = "Community", coverVariant = null) {
    const gradients = [
      ["#7c3aed", "#06b6d4"],
      ["#22c55e", "#3b82f6"],
      ["#f97316", "#a855f7"],
      ["#06b6d4", "#22c55e"],
      ["#3b82f6", "#7c3aed"],
    ];

    let idx; //idx contiene l'indice del gradiente scelto
    if (Number.isInteger(coverVariant)) {
      idx = Math.abs(coverVariant) % gradients.length;
    } else {
      const str = String(seedText || "Community");
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
      idx = hash % gradients.length;
    }

    const [c1, c2] = gradients[idx];

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="1" stop-color="${c2}"/>
        </linearGradient>
      </defs>

      <rect width="800" height="800" rx="90" fill="url(#g)"/>

      <text x="50%" y="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="220"
            font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui"
            fill="rgba(255,255,255,0.96)">👥</text>
    </svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  
  function playlistCoverFallbackDataUri(seedText = "Playlist") {
    const gradients = [
      ["#7c3aed", "#06b6d4"],
      ["#22c55e", "#3b82f6"],
      ["#f97316", "#a855f7"],
      ["#06b6d4", "#22c55e"],
      ["#3b82f6", "#7c3aed"],
    ];
    const str = String(seedText || "Playlist");
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    const [c1, c2] = gradients[hash % gradients.length];

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/>
          <stop offset="1" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" rx="90" fill="url(#g)"/>
      <text x="50%" y="52%"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="220"
            font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, system-ui"
            fill="rgba(255,255,255,0.96)">🎵</text>
    </svg>`;

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  function pickSongCoverUrl(song) {
    if (!song) return "";
    return (
      song.image ||
      song.cover ||
      song.albumArt ||
      song.album_image ||
      song?.album?.images?.[0]?.url ||
      song?.album?.image ||
      ""
    );
  }

    
  const COMMUNITIES_KEY = "sn4m_communities";

  function normalizeCommunities(list) {
    const arr = Array.isArray(list) ? list : [];
    const now = Date.now();

    return arr.map(c => {
      const members = Array.isArray(c.members) ? c.members.map(String) : [];
      return {
        id: c.id || ensureId("co"),
        title: c.title || "Community",
        desc: c.desc || "Descrizione non inserita.",
        tags: Array.isArray(c.tags) ? c.tags : [],
        ownerId: c.ownerId ? String(c.ownerId) : "guest",
        ownerName: c.ownerName || "guest",
        members,
        coverVariant: Number.isInteger(c.coverVariant) ? c.coverVariant : null,
        createdAt: c.createdAt || now,
        updatedAt: c.updatedAt || now
      };
    });
  }

  function loadCommunities() {
    try {
      const raw = JSON.parse(localStorage.getItem(COMMUNITIES_KEY) || "null");
      return normalizeCommunities(Array.isArray(raw) ? raw : []);
    } catch {
      return [];
    }
  }

  function saveCommunities(list) {
    const normalized = normalizeCommunities(list);
    localStorage.setItem(COMMUNITIES_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("sn4m:communities-changed"));
    return normalized;
  }

  
  const PLAYLIST_KEYS_CANDIDATES = [
    "sn4m_playlists",
    "playlists",
    "sn4m_user_playlists",
    "sn4mPlaylists"
  ];

  const SHARES_KEYS_CANDIDATES = [
    "sn4m_shares",
    "sn4m_shared_playlists",
    "sn4m_shared",
    "shares"
  ];

  function safeJsonParse(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function normalizeSongs(songs) {
    const arr = Array.isArray(songs) ? songs : [];
    return arr.map(s => ({
      id: s.id || s.trackId || s.uri || "",
      title: s.title || s.name || s.track || "Brano",
      artist: s.artist || s.artists || s.author || "—",
      durationSec:
        s.durationSec ??
        (Number.isFinite(s.durationMs) ? Math.round(s.durationMs / 1000) : null) ??
        (Number.isFinite(s.duration_ms) ? Math.round(s.duration_ms / 1000) : null) ??
        s.duration ??
        s.length ??
        0,
      year: s.year ?? s.releaseYear ?? "",
      genre: s.genre ?? "",
      coverUrl: pickSongCoverUrl(s)
    }));
  }

  function normalizePlaylist(p) {
    const songs = normalizeSongs(p?.songs || p?.tracks || p?.items || []);
    const cover =
      p?.cover ||
      p?.image ||
      p?.img ||
      (songs[0]?.coverUrl || "");

    return {
      id: String(p?.id || p?.playlistId || p?._id || ""),
      title: p?.title || p?.name || "Playlist",
      desc: p?.desc || p?.description || "",
      tags: Array.isArray(p?.tags) ? p.tags : parseTags(p?.tags || ""),
      ownerId: String(p?.ownerId || p?.userId || p?.owner || ""),
      ownerName: String(p?.ownerName || p?.username || p?.ownerUser || ""),
      songs,
      coverUrl: cover
    };
  }

  function loadAllPlaylists() {
  let all = [];

  // 1) prendi la chiave globale (sn4m_playlists) se c’è
  for (const key of PLAYLIST_KEYS_CANDIDATES) {
    const raw = safeJsonParse(key);
    if (Array.isArray(raw)) { all = all.concat(raw); break; }
  }

  // 2) aggiungi anche TUTTE le chiavi per-utente: sn4m_playlists_<id>
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sn4m_playlists_")) {
        const raw = safeJsonParse(k);
        if (Array.isArray(raw)) all = all.concat(raw);
      }
    }
  } catch {}

  // 3) normalizza + dedup per id
  const out = [];
  const seen = new Set();

  for (const pRaw of all) {
    const p = normalizePlaylist(pRaw);
    if (!p.id) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }

  return out;
}
  

  function loadAllShares() {
    for (const key of SHARES_KEYS_CANDIDATES) {
      const raw = safeJsonParse(key);
      if (Array.isArray(raw)) return raw;
    }
    return [];
  }

  function playlistIsSharedToCommunity(pRaw, communityId) {
    const id = String(communityId);

    // campi possibili dentro la playlist
    const direct =
      pRaw?.sharedCommunityId ||
      pRaw?.communityId ||
      pRaw?.sharedToCommunity ||
      pRaw?.sharedTo ||
      "";

    if (String(direct) === id) return true;

    const arr =
      pRaw?.sharedCommunityIds ||
      pRaw?.sharedInCommunities ||
      pRaw?.communityIds ||
      [];

    if (Array.isArray(arr) && arr.map(String).includes(id)) return true;

    return false;
  }

  function getSharedPlaylistsForCommunity(communityId) {
    const playlistsRaw = [];

    // prendo raw dalla chiave globale se esiste
    for (const key of PLAYLIST_KEYS_CANDIDATES) {
      const raw = safeJsonParse(key);
      if (Array.isArray(raw)) { playlistsRaw.push(...raw); break; }
    }

    // + prendo raw anche da tutte le chiavi per-utente
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sn4m_playlists_")) {
          const raw = safeJsonParse(k);
          if (Array.isArray(raw)) playlistsRaw.push(...raw);
        }   
      }
    } catch {}

    const allNorm = loadAllPlaylists();
    const byId = new Map(allNorm.map(p => [p.id, p]));

    const out = [];

    // 1) caso A: share info dentro playlist
    for (const pRaw of playlistsRaw) {
      const pid = String(pRaw?.id || pRaw?.playlistId || pRaw?._id || "");
      if (!pid) continue;
      if (playlistIsSharedToCommunity(pRaw, communityId)) {
        const norm = byId.get(pid);
        if (norm) out.push(norm);
      }
    }

    // 2) caso B: shares separati (records tipo {communityId, playlistId})
    const shares = loadAllShares();
    for (const s of shares) {
      const cid = String(s?.communityId || s?.coId || s?.community || "");
      const pid = String(s?.playlistId || s?.plId || s?.playlist || "");
      if (!cid || !pid) continue;
      if (cid === String(communityId)) {
        const norm = byId.get(pid);
        if (norm) out.push(norm);
      }
    }

    // dedup + ordine (più recenti prima se c’è updatedAt/createdAt)
    const uniq = new Map();
    for (const p of out) uniq.set(p.id, p);
    return [...uniq.values()];
  }

    
  const DEFAULT_COMMUNITY_TITLE = "Indie Italia";
  function makeSeedCommunities(now = Date.now()) {
    return [
      {
        id: ensureId("co"),
        title: "Indie Italia",
        desc: "Nuove uscite, concerti e perle indie italiane.",
        tags: ["indie", "italia", "live"],
        ownerId: "alice",
        ownerName: "alice",
        members: ["alice"],
        coverVariant: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: ensureId("co"),
        title: "Hip-Hop & Urban",
        desc: "Rap, trap, drill e tutto quello che spinge.",
        tags: ["rap", "trap", "urban"],
        ownerId: "marco",
        ownerName: "marco",
        members: ["marco"],
        coverVariant: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: ensureId("co"),
        title: "Classic Rock Club",
        desc: "Dai Queen ai Pink Floyd: solo classici.",
        tags: ["rock", "classic", "vinyl"],
        ownerId: "sofia",
        ownerName: "sofia",
        members: ["sofia"],
        coverVariant: 2,
        createdAt: now,
        updatedAt: now
      },
    ];
  }

  function ensureInitialCommunities() {
    const existing = loadCommunities();
    if (existing.length) return existing;
    return saveCommunities(makeSeedCommunities(Date.now()));
  }

  
  function leftDefaultKey(uid) {
    return `sn4m_left_default_community_${uid}`;
  }

  function autoJoinDefaultCommunity() {
    const uid = getCurrentUserId();
    if (!uid) return;
    if (localStorage.getItem(leftDefaultKey(uid)) === "1") return;

    communities = loadCommunities();
    const idx = communities.findIndex(c => (c.title || "").trim() === DEFAULT_COMMUNITY_TITLE);
    if (idx === -1) return;

    const c = communities[idx];
    const members = Array.isArray(c.members) ? [...c.members] : [];

    if (!members.includes(String(uid))) {
      members.push(String(uid));
      communities[idx] = { ...c, members, updatedAt: Date.now() };
      communities = saveCommunities(communities);
    }
  }

  
  const grid = document.getElementById("communityGrid");
  const empty = document.getElementById("communityEmpty");
  const filter = document.getElementById("filterAllCommunities");
  const createBtn = document.getElementById("createCommunityBtn");

  const myGrid = document.getElementById("myCommunityGrid");
  const myEmpty = document.getElementById("myCommunityEmpty");
  const myFilter = document.getElementById("filterMyCommunities");

  // create/edit modal
  const modal = document.getElementById("communityModal");
  const closeModalBtn = document.getElementById("closeCommunityModalBtn");
  const cancelModalBtn = document.getElementById("cancelCommunityBtn");
  const form = document.getElementById("communityForm");

  const modalTitle = document.getElementById("communityModalTitle");
  const submitBtn = document.getElementById("submitCommunityBtn");

  const inputTitle = document.getElementById("coTitle");
  const inputDesc = document.getElementById("coDesc");
  const inputTags = document.getElementById("coTags");

  // view modal
  const viewModal = document.getElementById("communityViewModal");
  const closeViewBtn = document.getElementById("closeCommunityViewBtn");
  const closeViewBtn2 = document.getElementById("closeCommunityViewBtn2");

  const viewCover = document.getElementById("communityViewCover");
  const viewTitle = document.getElementById("communityViewTitle");
  const viewDesc = document.getElementById("communityViewDesc");
  const viewKpis = document.getElementById("communityViewKpis");
  const viewTags = document.getElementById("communityViewTags");
  const viewActions = document.getElementById("communityViewActions");
  const viewHint = document.getElementById("communityViewHint");

  // NUOVI refs: shared playlists in popup
  const viewSharedGrid = document.getElementById("communityViewSharedGrid");
  const viewSharedEmpty = document.getElementById("communityViewSharedEmpty");
  const sharedDetails = document.getElementById("communitySharedDetails");

  let editingId = null;
  let viewingId = null;

  
  function applyFilterAll(list) {
    const q = (filter?.value || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => {
      const t = (c.title || "").toLowerCase();
      const d = (c.desc || "").toLowerCase();
      const tags = (c.tags || []).join(",").toLowerCase();
      const owner = (c.ownerName || "").toLowerCase();
      return t.includes(q) || d.includes(q) || tags.includes(q) || owner.includes(q);
    });
  }

  function getMyCommunities(list) {
    const uid = getCurrentUserId();
    return list.filter(c => Array.isArray(c.members) && c.members.includes(String(uid)));
  }

  function applyFilterMine(list) {
    const q = (myFilter?.value || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => {
      const t = (c.title || "").toLowerCase();
      const d = (c.desc || "").toLowerCase();
      const tags = (c.tags || []).join(",").toLowerCase();
      const owner = (c.ownerName || "").toLowerCase();
      return t.includes(q) || d.includes(q) || tags.includes(q) || owner.includes(q);
    });
  }

  function isMember(c, uid) {
    return Array.isArray(c.members) && c.members.includes(String(uid));
  }

  function isOwner(c, uid) {
    return String(c.ownerId) === String(uid);
  }

  
  function deleteCommunityById(id) {
    const c = communities.find(x => x.id === id);
    if (!c) return;

    if (!confirm(`Eliminare la community "${c.title}"?`)) return;

    communities = communities.filter(x => x.id !== id);
    communities = saveCommunities(communities);

    if (viewingId === id) closeViewModal();
    rerenderAll();
  }

    
  function renderInto(gridEl, emptyEl, list) {
    if (!gridEl || !emptyEl) return;

    gridEl.innerHTML = "";

    if (!list.length) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    const uid = getCurrentUserId();

    for (const c of list) {
      const membersCount = Array.isArray(c.members) ? c.members.length : 0;
      const joined = isMember(c, uid);
      const owner = isOwner(c, uid);

      const cover = communityCoverDataUri(c.title || "Community", c.coverVariant);

      const tile = document.createElement("div");
      tile.className = "plTile";

      tile.innerHTML = `
        <button class="plTile__coverBtn" type="button"
                data-open="${escapeHtml(c.id)}"
                aria-label="Apri community ${escapeHtml(c.title)}">
          <div class="plTile__cover">
            <img src="${escapeHtml(cover)}" alt="">
          </div>
        </button>

        <div class="plTile__bottom">
          <div class="plTile__meta" style="min-width:0;">
            <p class="plTile__title" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</p>
            <p class="plTile__sub">${membersCount} membri • by ${escapeHtml(c.ownerName || "—")}</p>
          </div>

          <div class="plTile__actions">
            ${
              owner
                ? `
                  <button class="iconMini" type="button" title="Modifica" data-edit="${escapeHtml(c.id)}">✎</button>
                  <button class="iconMini" type="button" title="Elimina" data-del="${escapeHtml(c.id)}">🗑</button>
                `
                : `
                  <button class="iconMini" type="button" title="${joined ? "Lascia" : "Unisciti"}"
                          data-join="${escapeHtml(c.id)}">
                    ${joined ? "⎋" : "＋"}
                  </button>
                `
            }
          </div>
        </div>
      `;

      gridEl.appendChild(tile);
    }

    gridEl.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => openCommunityView(btn.getAttribute("data-open")));
    });

    gridEl.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-edit");
        const c = communities.find(x => x.id === id);
        if (c) openModal("edit", c);
      });
    });

    gridEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCommunityById(btn.getAttribute("data-del"));
      });
    });

    gridEl.querySelectorAll("[data-join]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleJoinCommunity(btn.getAttribute("data-join"));
      });
    });
  }

  function rerenderAll() {
    const allList = applyFilterAll(communities);
    renderInto(grid, empty, allList);

    const mineBase = getMyCommunities(communities);
    const mineList = applyFilterMine(mineBase);
    renderInto(myGrid, myEmpty, mineList);

    if (viewingId) {
      const still = communities.find(x => x.id === viewingId);
      if (still) openCommunityView(viewingId);
      else closeViewModal();
    }
  }

  
  function openModal(mode, community) {
    modal?.classList.add("isOpen");
    modal?.setAttribute("aria-hidden", "false");

    if (mode === "edit") {
      editingId = community.id;
      modalTitle && (modalTitle.textContent = "Modifica community");
      submitBtn && (submitBtn.textContent = "Salva");

      inputTitle && (inputTitle.value = community.title || "");
      inputDesc && (inputDesc.value = community.desc || "");
      inputTags && (inputTags.value = (community.tags || []).join(", "));
    } else {
      editingId = null;
      modalTitle && (modalTitle.textContent = "Crea community");
      submitBtn && (submitBtn.textContent = "Crea");
      form?.reset();
    }
  }

  function closeModal() {
    modal?.classList.remove("isOpen");
    modal?.setAttribute("aria-hidden", "true");
    form?.reset();
    editingId = null;
  }

  closeModalBtn?.addEventListener("click", closeModal);
  cancelModalBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  function validateFields({ title, desc, tags }) {
    if (!title) return "Inserisci un titolo.";
    if (!desc) return "Inserisci una descrizione.";
    if (!tags || tags.length === 0) return "Inserisci almeno un tag (separati da virgole).";
    return "";
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = (inputTitle?.value || "").trim();
    const desc  = (inputDesc?.value || "").trim();
    const tags  = parseTags(inputTags?.value || "");

    const error = validateFields({ title, desc, tags });
    if (error) return alert(error);

    const now = Date.now();
    const uid = getCurrentUserId();
    const uname = getCurrentUsername();

    communities = loadCommunities();

    if (editingId) {
      const idx = communities.findIndex(c => c.id === editingId);
      if (idx !== -1) {
        if (String(communities[idx].ownerId) !== String(uid)) {
          alert("Puoi modificare solo le community che hai creato.");
          return;
        }
        communities[idx] = { ...communities[idx], title, desc, tags, updatedAt: now };
      }
    } else {
      const newCommunity = {
        id: ensureId("co"),
        title,
        desc,
        tags,
        ownerId: uid,
        ownerName: uname,
        members: [String(uid)],
        coverVariant: null,
        createdAt: now,
        updatedAt: now
      };
      communities.unshift(newCommunity);
    }

    communities = saveCommunities(communities);
    rerenderAll();
    closeModal();
  });

  
  function openViewModal() {
    viewModal?.classList.add("isOpen");
    viewModal?.setAttribute("aria-hidden", "false");
  }

  function closeViewModal() {
    viewModal?.classList.remove("isOpen");
    viewModal?.setAttribute("aria-hidden", "true");
    viewingId = null;

    viewActions && (viewActions.innerHTML = "");
    viewTags && (viewTags.innerHTML = "");
    viewKpis && (viewKpis.innerHTML = "");
    viewHint && (viewHint.textContent = "");

    if (viewSharedGrid) viewSharedGrid.innerHTML = "";
    if (viewSharedEmpty) viewSharedEmpty.hidden = true;
    if (sharedDetails) {
      sharedDetails.hidden = true;
      sharedDetails.innerHTML = "";
    }
  }

  closeViewBtn?.addEventListener("click", closeViewModal);
  closeViewBtn2?.addEventListener("click", closeViewModal);
  viewModal?.addEventListener("click", (e) => { if (e.target === viewModal) closeViewModal(); });

  function renderKpis(c) {
    const membersCount = Array.isArray(c.members) ? c.members.length : 0;
    const chips = [
      `👥 ${membersCount} membri`,
      `🧑‍💻 Creator: ${escapeHtml(c.ownerName || "—")}`,
      `🏷 ${Array.isArray(c.tags) ? c.tags.length : 0} tag`
    ];
    return chips.map(t => `<span class="chip">${t}</span>`).join("");
  }

  function renderTags(tags) {
    const list = Array.isArray(tags) ? tags : [];
    if (!list.length) return `<span class="coTag">—</span>`;
    return list.map(t => `<span class="coTag">#${escapeHtml(t)}</span>`).join("");
  }

  
  function renderSharedPlaylists(communityId) {
    if (!viewSharedGrid || !viewSharedEmpty) return;

    viewSharedGrid.innerHTML = "";
    if (sharedDetails) {
      sharedDetails.hidden = true;
      sharedDetails.innerHTML = "";
    }

    const shared = getSharedPlaylistsForCommunity(communityId);

    if (!shared.length) {
      viewSharedEmpty.hidden = false;
      return;
    }
    viewSharedEmpty.hidden = true;

    for (const p of shared) {
      const cover = p.coverUrl || playlistCoverFallbackDataUri(p.title);
      const songsCount = Array.isArray(p.songs) ? p.songs.length : 0;
      const owner = p.ownerName ? ` • by ${escapeHtml(p.ownerName)}` : "";

      const tile = document.createElement("div");
      tile.className = "plTile";

      tile.innerHTML = `
        <button class="plTile__coverBtn" type="button" data-open-shared="${escapeHtml(p.id)}"
                aria-label="Apri playlist ${escapeHtml(p.title)}">
          <div class="plTile__cover">
            <img src="${escapeHtml(cover)}" alt="">
          </div>
        </button>

        <div class="plTile__bottom">
          <div class="plTile__meta" style="min-width:0;">
            <p class="plTile__title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</p>
            <p class="plTile__sub">${songsCount} brani${owner}</p>
          </div>
          <div class="plTile__actions">
            <button class="iconMini" type="button" title="Dettagli" data-open-shared="${escapeHtml(p.id)}">ℹ</button>
          </div>
        </div>
      `;

      viewSharedGrid.appendChild(tile);
    }

    viewSharedGrid.querySelectorAll("[data-open-shared]").forEach(btn => {
      btn.addEventListener("click", () => openSharedPlaylistDetails(btn.getAttribute("data-open-shared"), communityId));
    });
  }

  function openSharedPlaylistDetails(playlistId, communityId) {
    if (!sharedDetails) return;

    const shared = getSharedPlaylistsForCommunity(communityId);
    const p = shared.find(x => x.id === String(playlistId));
    if (!p) return;

    const tags = (p.tags || []).length ? p.tags.map(t => `#${escapeHtml(t)}`).join(" ") : "—";
    const desc = p.desc ? escapeHtml(p.desc) : "Descrizione non inserita.";

    const songsHtml = (p.songs || []).length
      ? `<ul class="coSharedSongList">
          ${p.songs.map(s => `
            <li class="coSharedSong">
              <div class="coSharedSong__left">
                <p class="coSharedSong__name">${escapeHtml(s.title)}</p>
                <p class="coSharedSong__meta">${escapeHtml(s.artist)}${s.year ? " • " + escapeHtml(s.year) : ""}${s.genre ? " • " + escapeHtml(s.genre) : ""}</p>
              </div>
              <div class="coSharedSong__dur">${fmtDuration(s.durationSec)}</div>
            </li>
          `).join("")}
        </ul>`
      : `<p class="coSharedDetails__sub">Nessun brano nella playlist.</p>`;

    sharedDetails.innerHTML = `
      <div class="coSharedDetails__head">
        <div style="min-width:0;">
          <h5 class="coSharedDetails__title">${escapeHtml(p.title)}</h5>
          <p class="coSharedDetails__sub">${desc}<br><span style="opacity:.85">${tags}</span></p>
        </div>
        <button class="iconBtn" type="button" id="closeSharedDetailsBtn" aria-label="Chiudi">✕</button>
      </div>
      ${songsHtml}
    `;

    sharedDetails.hidden = false;

    document.getElementById("closeSharedDetailsBtn")?.addEventListener("click", () => {
      sharedDetails.hidden = true;
      sharedDetails.innerHTML = "";
    });
  }

  function openCommunityView(id) {
    communities = loadCommunities();
    const c = communities.find(x => x.id === id);
    if (!c) return;

    viewingId = id;

    const uid = getCurrentUserId();
    const joined = isMember(c, uid);
    const owner = isOwner(c, uid);

    const cover = communityCoverDataUri(c.title || "Community", c.coverVariant);

    viewCover && (viewCover.innerHTML = `<img src="${escapeHtml(cover)}" alt="">`);
    viewTitle && (viewTitle.textContent = c.title || "Community");
    viewDesc && (viewDesc.textContent = c.desc || "");
    viewKpis && (viewKpis.innerHTML = renderKpis(c));
    viewTags && (viewTags.innerHTML = renderTags(c.tags));

    // render playlist condivise
    renderSharedPlaylists(c.id);

    if (viewActions) {
      viewActions.innerHTML = "";

      if (owner) {
        viewActions.innerHTML = `
          <button class="btn secondary" type="button" id="viewEditBtn">Modifica</button>
          <button class="btn ghost" type="button" id="viewDeleteBtn">Elimina</button>
        `;

        document.getElementById("viewEditBtn")?.addEventListener("click", () => openModal("edit", c));
        document.getElementById("viewDeleteBtn")?.addEventListener("click", () => deleteCommunityById(c.id));

        viewHint && (viewHint.textContent = "Sei il creator: puoi modificare o eliminare questa community.");
      } else {
        viewActions.innerHTML = `
          <button class="btn ${joined ? "ghost" : "secondary"}" type="button" id="viewJoinBtn">
            ${joined ? "Lascia la community" : "Unisciti alla community"}
          </button>
        `;

        document.getElementById("viewJoinBtn")?.addEventListener("click", () => {
          toggleJoinCommunity(c.id);
          openCommunityView(c.id);
        });

        viewHint && (viewHint.textContent = joined
          ? "Sei già iscritto: puoi lasciare quando vuoi."
          : "Unisciti per partecipare.");
      }
    }

    openViewModal();
  }

  
  function toggleJoinCommunity(id) {
    const uid = getCurrentUserId();
    communities = loadCommunities();

    const idx = communities.findIndex(c => c.id === id);
    if (idx === -1) return;

    const c = communities[idx];

    if (isOwner(c, uid)) {
      alert("Sei il creator: non puoi lasciare la tua community (puoi eliminarla).");
      return;
    }

    const members = Array.isArray(c.members) ? [...c.members] : [];
    const i = members.indexOf(String(uid));
    const isLeaving = i >= 0;

    if (isLeaving) members.splice(i, 1);
    else members.push(String(uid));

    communities[idx] = { ...c, members, updatedAt: Date.now() };
    communities = saveCommunities(communities);

    if ((c.title || "").trim() === DEFAULT_COMMUNITY_TITLE && isLeaving) {
      localStorage.setItem(leftDefaultKey(uid), "1");
    }
    if ((c.title || "").trim() === DEFAULT_COMMUNITY_TITLE && !isLeaving) {
      localStorage.removeItem(leftDefaultKey(uid));
    }

    rerenderAll();
  }

  
  function refreshFromStorage() {
    communities = loadCommunities();
    rerenderAll();
  }

  window.addEventListener("sn4m:communities-changed", refreshFromStorage);
  window.addEventListener("storage", (e) => {
    if (e.key === COMMUNITIES_KEY) refreshFromStorage();
  });

  
  function init() {
    communities = ensureInitialCommunities();
    autoJoinDefaultCommunity();

    communities = loadCommunities();
    rerenderAll();

    filter?.addEventListener("input", rerenderAll);
    myFilter?.addEventListener("input", rerenderAll);
    createBtn?.addEventListener("click", () => openModal("create"));
  }

  init();
})();