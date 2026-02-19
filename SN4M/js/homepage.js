
const profileImg = document.getElementById("profileImg");
const profileBox = document.querySelector(".profile");
const logoBtn = document.getElementById("logoBtn");

const DEFAULT_AVATAR = "media/default-avatar.jpg";

function ensureDemoUser() {
  if (localStorage.getItem("currentUser")) return;

  const demoUser = {
    id: "demo_user",
    username: "demo_user",
    email: "demo@sn4m.local",
    genres: ["Pop", "Rock"],
    favoriteArtists: "Muse, Arctic Monkeys"
  };

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

profileImg?.addEventListener("error", () => profileImg.src = DEFAULT_AVATAR);
profileBox?.addEventListener("click", () => window.location.href = "profile.html");
logoBtn?.addEventListener("click", () => window.location.href = "landing_page.html");

ensureDemoUser();
loadAvatar();


// ====== Helpers ======
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayPlaylistTitle(pl){
  const t = String(pl?.title || "Playlist");
  return t.replace(/\s*\(importata\)\s*$/i, "").trim();
}

function uid(prefix="pl"){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function msToMinSec(ms) {
  const tot = Math.floor((ms || 0) / 1000);
  const m = Math.floor(tot / 60);
  const s = tot % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}


const PLAYLISTS_STORAGE_KEY = "sn4m_playlists";

const PLAYLISTS_STORAGE_CANDIDATES = [
  "sn4m_playlists",
  "playlists",
  "sn4mPlaylists",
  "SN4M_playlists"
];

function normalizePlaylists(list){
  const arr = Array.isArray(list) ? list : [];
  const now = Date.now();

  return arr.map(p => {
    const tracks = Array.isArray(p.tracks) ? p.tracks : [];

    return {
      id: p.id || uid("pl"),
      ownerId: String(p.ownerId || p.owner || ""), 
      title: p.title || "Playlist",
      desc: p.desc || "Descrizione non inserita.",
      tags: Array.isArray(p.tags) ? p.tags : [],
      tagsCount: Number.isFinite(p.tagsCount)
        ? p.tagsCount
        : (Array.isArray(p.tags) ? p.tags.length : 0),
      tracks,
      tracksCount: Number.isFinite(p.tracksCount) ? p.tracksCount : tracks.length,
      createdAt:
        (typeof p.createdAt === "number" ? p.createdAt :
         typeof p.created_at === "number" ? p.created_at :
         typeof p.updatedAt === "number" ? p.updatedAt :
         typeof p.updated_at === "number" ? p.updated_at :
         now),
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : now,
      cover: p.cover || p.coverUrl || p.image || p.img || null,
      isImported: !!p.isImported,
      sharedCommunityIds: Array.isArray(p.sharedCommunityIds) ? p.sharedCommunityIds.map(String) : []
    };
  });
}

function readPlaylists(){
  const userKey = getUserPlaylistsKey();
  const myId = getCurrentUserKeyId();
  if (!myId) return [];

  // 1) per-utente
  try{
    const raw = localStorage.getItem(userKey);
    if (raw){
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.playlists) ? parsed.playlists : []);
      return normalizePlaylists(arr);
    }
  }catch{}

  // 2) fallback globale MA SOLO MIE
  try{
    const raw = localStorage.getItem("sn4m_playlists");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.playlists) ? parsed.playlists : []);
    return normalizePlaylists(arr).filter(p => String(p.ownerId) === String(myId));
  }catch{
    return [];
  }
}


function writePlaylists(list){
  const normalized = normalizePlaylists(list);

  const userKey = getUserPlaylistsKey();
  if (userKey) {
    //salva per-utente (la home deve vedere queste)
    localStorage.setItem(userKey, JSON.stringify(normalized));
  } else {
    // fallback (guest / nessun utente)
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(normalized));
  }

  window.dispatchEvent(new CustomEvent("sn4m:playlists-changed"));
  return normalized;
}


const heroPlCount = document.getElementById("heroPlCount");
const heroCmCount = document.getElementById("heroCmCount");
const heroShareCount = document.getElementById("heroShareCount");

// demo communities + shares (se non usi più demo, puoi togliere)
let demoCommunities = [
  { title: "Rock anni 90", desc: "Grunge, alternative, britpop e nostalgia.", members: 128, tagsCount: 3, joined: false },
  { title: "Rap Italiano", desc: "Classici + nuove uscite. Drill, trap e rap conscious.", members: 342, tagsCount: 5, joined: true },
  { title: "Jazz Lounge", desc: "Smooth jazz e chill per lavorare.", members: 76, tagsCount: 4, joined: false }
];

function updateHeroKpis(){
  const pls = readPlaylists();
  if (heroPlCount) heroPlCount.textContent = String(pls.length);
  if (heroCmCount) heroCmCount.textContent = String(demoCommunities.length);

  const totalShares = pls.reduce((sum, p) => {
    const n = Array.isArray(p.sharedCommunityIds) ? p.sharedCommunityIds.length : 0;
    return sum + n;
  }, 0);

  if (heroShareCount) heroShareCount.textContent = String(totalShares);
}



const homeLastPlaylistsGrid = document.getElementById("homeLastPlaylistsGrid");
const homeLastPlaylistsEmpty = document.getElementById("homeLastPlaylistsEmpty");

// prova a ricavare copertina da una track
function trackCoverUrl(t){
  return (
    t?.cover ||
    t?.image ||
    t?.img ||
    t?.album?.images?.[2]?.url ||
    t?.album?.images?.[1]?.url ||
    t?.album?.images?.[0]?.url ||
    t?.albumCover ||
    t?.coverUrl ||
    ""
  );
}

function getPlaylistCreatedMs(pl){
  if (typeof pl?.createdAt === "number" && pl.createdAt > 0) return pl.createdAt;

  const id = String(pl?.id || "");
  const parts = id.split("_");
  if (parts.length >= 3) {
    const base36 = parts[1];
    const ms = parseInt(base36, 36);
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return 0;
}

function getLast4Playlists(){
  const list = readPlaylists();
  if (!list.length) return [];
  return [...list].sort((a, b) => getPlaylistCreatedMs(b) - getPlaylistCreatedMs(a)).slice(0, 4);
}

/* ========= Playlist Modal (popup info) ========= */
function ensurePlaylistModalExists(){
  if (document.getElementById("playlistModal")) return;

  const modal = document.createElement("div");
  modal.id = "playlistModal";
  modal.className = "modalOverlay hidden";
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="plModalTitle">
      <button id="playlistModalClose" class="modalCloseBtn" type="button" aria-label="Chiudi">✕</button>

      <div class="plModalHead">
        <img id="plModalCover" class="plModalCover" src="" alt="Copertina playlist" />

        <div>
          <h2 id="plModalTitle" class="plModalTitle">Playlist</h2>
          <p id="plModalDesc" class="plModalDesc"></p>

          <div class="plModalMeta">
            <span id="plModalTracksCount" class="kpi">🎵 0 brani</span>
            <span id="plModalTags" class="kpi">🏷️ —</span>
            <span id="plModalPrivacy" class="kpi">🔒 Privata</span>
          </div>

          <div class="plModalActions">
            <button class="btn secondary" id="plModalOpenPageBtn" type="button">Apri in Playlist</button>
          </div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <h3 style="margin:0 0 10px 0; font-size:16px;">Brani</h3>
        <div id="plModalTracks" class="plModalTracks"></div>
        <div id="plModalEmptyTracks" class="empty" style="display:none; margin-top:10px;">
          <p>Nessun brano nella playlist.</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}
ensurePlaylistModalExists();

const playlistModal = document.getElementById("playlistModal");
const playlistModalClose = document.getElementById("playlistModalClose");

const plModalCover = document.getElementById("plModalCover");
const plModalTitle = document.getElementById("plModalTitle");
const plModalDesc = document.getElementById("plModalDesc");
const plModalTracksCount = document.getElementById("plModalTracksCount");
const plModalTags = document.getElementById("plModalTags");
const plModalPrivacy = document.getElementById("plModalPrivacy");
const plModalTracks = document.getElementById("plModalTracks");
const plModalEmptyTracks = document.getElementById("plModalEmptyTracks");
const plModalOpenPageBtn = document.getElementById("plModalOpenPageBtn");

function openPlaylistModal(){
  playlistModal?.classList.remove("hidden");
  playlistModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closePlaylistModal(){
  playlistModal?.classList.add("hidden");
  playlistModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

playlistModalClose?.addEventListener("click", closePlaylistModal);
playlistModal?.addEventListener("click", (e) => { if (e.target === playlistModal) closePlaylistModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && playlistModal && !playlistModal.classList.contains("hidden")) closePlaylistModal();
});

function playlistCoverFromTracks(pl){
  if (pl?.cover) return pl.cover;
  const t = (pl?.tracks || []).find(x => trackCoverUrl(x));
  return t ? trackCoverUrl(t) : "";
}

function renderPlaylistModal(pl){
  if (!pl) return;

  const cover = playlistCoverFromTracks(pl);
  if (plModalCover){
    plModalCover.src = cover || "";
    plModalCover.style.display = "block";
    plModalCover.alt = `Copertina playlist ${displayPlaylistTitle(pl)}`;

    if (!cover){
      plModalCover.src = "";
      plModalCover.style.background = "linear-gradient(135deg, rgba(160,79,226,.55), rgba(255,255,255,.06))";
    } else {
      plModalCover.style.background = "rgba(255,255,255,.06)";
    }
  }

  if (plModalTitle) plModalTitle.textContent = displayPlaylistTitle(pl);
  if (plModalDesc) plModalDesc.textContent = pl.desc || "Descrizione non inserita.";
  if (plModalTracksCount) plModalTracksCount.textContent = `🎵 ${Number(pl.tracksCount || (pl.tracks?.length || 0))} brani`;
  if (plModalTags) {
    const tags = Array.isArray(pl.tags) ? pl.tags : [];
    plModalTags.textContent = tags.length ? `🏷️ ${tags.join(", ")}` : "🏷️ —";
  }

  plModalOpenPageBtn?.addEventListener("click", () => {
    localStorage.setItem("sn4m_open_playlist_id", pl.id);
    window.location.href = "playlists.html";
  }, { once: true });

  const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];
  if (plModalTracks) plModalTracks.innerHTML = "";

  if (!tracks.length){
    if (plModalEmptyTracks) plModalEmptyTracks.style.display = "block";
  } else {
    if (plModalEmptyTracks) plModalEmptyTracks.style.display = "none";

    tracks.forEach((t) => {
      const row = document.createElement("div");
      row.className = "plTrackRow";

      const coverT = trackCoverUrl(t);
      const title = t?.title || t?.name || "Brano";
      const artist = t?.artist || (t?.artists ? t.artists.map(a => a.name).join(", ") : "") || "—";
      const dur = t?.duration_ms ? msToMinSec(t.duration_ms) : (t?.durationSec ? msToMinSec(t.durationSec * 1000) : "");

      row.innerHTML = `
        <div class="plTrackLeft">
          ${coverT ? `<img class="plTrackCover" src="${escapeHtml(coverT)}" alt="">`
                   : `<div class="plTrackCover" style="display:grid;place-items:center;">🎵</div>`}
          <div class="plTrackText">
            <div class="plTrackName">${escapeHtml(title)}</div>
            <div class="plTrackArtist">${escapeHtml(artist)}</div>
          </div>
        </div>
        <div style="color:rgba(255,255,255,.72); font-size:12px;">${escapeHtml(dur || "")}</div>
      `;

      plModalTracks.appendChild(row);
    });
  }

  const isPublic =
    (Array.isArray(pl.sharedCommunityIds) && pl.sharedCommunityIds.length > 0) ||
    pl.isImported === true ||
    /\(importata\)\s*$/i.test(String(pl.title || ""));

  if (plModalPrivacy) plModalPrivacy.textContent = isPublic ? "🔓 Pubblica" : "🔒 Privata";

  openPlaylistModal();
}

/* ========= Card Home con cover “vera” ========= */
function buildHomeCoverNode(pl){
  const wrap = document.createElement("div");
  wrap.className = "homePlCover";
  wrap.setAttribute("aria-hidden", "true");

  const covers = (pl.tracks || [])
    .map(trackCoverUrl)
    .filter(Boolean)
    .slice(0, 4);

  if (covers.length >= 2){
    const grid = document.createElement("div");
    grid.className = "homePlCoverGrid";

    const four = [];
    for (let i = 0; i < 4; i++){
      four.push(covers[i] || covers[covers.length - 1]);
    }

    four.forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      grid.appendChild(img);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  if (covers.length === 1){
    const img = document.createElement("img");
    img.src = covers[0];
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    wrap.appendChild(img);
    return wrap;
  }

  const fb = document.createElement("div");
  fb.className = "homePlCoverFallback";
  fb.textContent = (pl.title || "P").trim().slice(0,1).toUpperCase();
  wrap.appendChild(fb);
  return wrap;
}

function buildHomePlaylistCard(pl){
  const div = document.createElement("div");
  div.className = "homePlCard";
  div.dataset.plid = pl.id;

  const coverNode = buildHomeCoverNode(pl);

  const isPublic =
    (Array.isArray(pl.sharedCommunityIds) && pl.sharedCommunityIds.length > 0) ||
    pl.isImported === true ||
    /\(importata\)\s*$/i.test(String(pl.title || ""));

  const body = document.createElement("div");
  body.className = "homePlBody";
  body.innerHTML = `
    <div class="homePlTop">
      <h3 class="homePlTitle">${escapeHtml(displayPlaylistTitle(pl))}</h3>
      <span class="homePlPrivacy">${isPublic ? "Pubblica" : "Privata"}</span>
    </div>

    <p class="homePlDesc">${escapeHtml(pl.desc)}</p>

    <div class="homePlMeta">
      <span class="homePlPill">🎵 ${Number(pl.tracksCount || 0)} brani</span>
      <span class="homePlPill">🏷️ ${Number(pl.tagsCount || 0)} tag</span>
    </div>
  `;

  div.appendChild(coverNode);
  div.appendChild(body);

  div.addEventListener("click", () => {
    const list = readPlaylists();
    const found = list.find(x => String(x.id) === String(pl.id)) || pl;
    renderPlaylistModal(found);
  });

  return div;
}

function renderHomeLastPlaylists(){
  if (!homeLastPlaylistsGrid) return;

  const last4 = getLast4Playlists();
  homeLastPlaylistsGrid.innerHTML = "";

  if (!last4.length){
    if (homeLastPlaylistsEmpty) homeLastPlaylistsEmpty.hidden = false;
    updateHeroKpis();
    return;
  }

  if (homeLastPlaylistsEmpty) homeLastPlaylistsEmpty.hidden = true;

  last4.forEach(pl => homeLastPlaylistsGrid.appendChild(buildHomePlaylistCard(pl)));

  updateHeroKpis();
}

renderHomeLastPlaylists();
updateHeroKpis();



const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID";
const SPOTIFY_CLIENT_SECRET = "YOUR_SPOTIFY_CLIENT_SECRET";

const SPOTIFY_TOKEN_KEY = "sn4m_spotify_token";
const SPOTIFY_TOKEN_EXP_KEY = "sn4m_spotify_token_exp";

function getStoredSpotifyToken() {
  const token = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  const exp = parseInt(localStorage.getItem(SPOTIFY_TOKEN_EXP_KEY) || "0", 10);
  if (!token || !exp) return null;
  if (Date.now() > exp - 60_000) return null;
  return token;
}

async function fetchSpotifyToken() {
  const url = "https://accounts.spotify.com/api/token";
  const auth = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token Spotify fallito (${res.status}). ${text}`);
  }

  const data = await res.json();
  const expMs = Date.now() + data.expires_in * 1000;

  localStorage.setItem(SPOTIFY_TOKEN_KEY, data.access_token);
  localStorage.setItem(SPOTIFY_TOKEN_EXP_KEY, String(expMs));

  return data.access_token;
}

async function getSpotifyToken() {
  return getStoredSpotifyToken() || fetchSpotifyToken();
}

async function spotifySearchTracks(query) {
  const token = await getSpotifyToken();
  const url = `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ricerca Spotify fallita (${res.status}). ${text}`);
  }

  const data = await res.json();
  return data?.tracks?.items || [];
}



function ensureTrackModalExists(){
  if (document.getElementById("trackModal")) return;

  const modal = document.createElement("div");
  modal.id = "trackModal";
  modal.className = "modalOverlay hidden";
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="trackModalTitle">
      <button id="trackModalClose" class="modalCloseBtn" type="button" aria-label="Chiudi">✕</button>

      <div class="modalBody">
        <img id="trackModalCover" class="modalCover" src="" alt="Copertina brano" />

        <div class="modalInfo">
          <h2 id="trackModalTitle" class="modalTitle">Titolo</h2>
          <p id="trackModalArtist" class="modalLine">Cantante: —</p>
          <p id="trackModalGenre" class="modalLine">Genere: —</p>
          <p id="trackModalDuration" class="modalLine">Durata: —</p>
          <p id="trackModalYear" class="modalLine">Anno: —</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
ensureTrackModalExists();

const trackModal = document.getElementById("trackModal");
const trackModalClose = document.getElementById("trackModalClose");

const trackModalCover = document.getElementById("trackModalCover");
const trackModalTitle = document.getElementById("trackModalTitle");
const trackModalArtist = document.getElementById("trackModalArtist");
const trackModalGenre = document.getElementById("trackModalGenre");
const trackModalDuration = document.getElementById("trackModalDuration");
const trackModalYear = document.getElementById("trackModalYear");

function openTrackModal(){
  trackModal?.classList.remove("hidden");
  trackModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeTrackModal(){
  trackModal?.classList.add("hidden");
  trackModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

trackModalClose?.addEventListener("click", closeTrackModal);
trackModal?.addEventListener("click", (e) => { if (e.target === trackModal) closeTrackModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && trackModal && !trackModal.classList.contains("hidden")) closeTrackModal();
});

async function fetchArtistGenres(artistId){
  if (!artistId) return [];
  const token = await getSpotifyToken();

  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: "Bearer " + token },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.genres) ? data.genres : [];
}

async function showTrackPopup(track){
  const cover =
    track?.album?.images?.[0]?.url ||
    track?.album?.images?.[1]?.url ||
    track?.album?.images?.[2]?.url ||
    "";

  const title = track?.name || "—";
  const artistName = (track?.artists || []).map(a => a.name).join(", ") || "—";
  const duration = track?.duration_ms ? msToMinSec(track.duration_ms) : "—";
  const releaseDate = track?.album?.release_date || "";
  const year = releaseDate ? String(releaseDate).slice(0, 4) : "—";

  let genreText = "—";
  try{
    const firstArtistId = track?.artists?.[0]?.id;
    const genres = await fetchArtistGenres(firstArtistId);
    genreText = genres.length ? genres.slice(0, 3).join(", ") : "—";
  }catch{
    genreText = "—";
  }

  if (trackModalCover) { trackModalCover.src = cover; trackModalCover.alt = `Copertina di ${title}`; }
  if (trackModalTitle) trackModalTitle.textContent = title;
  if (trackModalArtist) trackModalArtist.textContent = `Cantante: ${artistName}`;
  if (trackModalGenre) trackModalGenre.textContent = `Genere: ${genreText}`;
  if (trackModalDuration) trackModalDuration.textContent = `Durata: ${duration}`;
  if (trackModalYear) trackModalYear.textContent = `Anno: ${year}`;

  openTrackModal();
}



const globalSearchInput = document.getElementById("globalSearch");
const globalSearchResults = document.getElementById("globalSearchResults");

function debounce(fn, delay = 300){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function closeGlobalResults(){
  if (!globalSearchResults) return;
  globalSearchResults.hidden = true;
  globalSearchResults.innerHTML = "";
}

function renderGlobalResults(tracks){
  if (!globalSearchResults) return;

  if (!tracks.length){
    globalSearchResults.innerHTML = `<div class="searchItem__empty">Nessun risultato.</div>`;
    globalSearchResults.hidden = false;
    return;
  }

  globalSearchResults.innerHTML = tracks.map((t, idx) => {
    const title = escapeHtml(t.name);
    const artist = escapeHtml((t.artists || []).map(a => a.name).join(", "));
    const album = escapeHtml(t.album?.name || "");
    const cover = t.album?.images?.[2]?.url || t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || "";

    return `
      <div class="searchItem" data-idx="${idx}">
        <div style="display:flex; gap:10px; align-items:center;">
          <img src="${escapeHtml(cover)}" alt="" style="width:38px;height:38px;border-radius:10px;object-fit:cover;background:rgba(255,255,255,.06)">
          <div>
            <div class="searchItem__title">${title}</div>
            <div class="searchItem__meta">${artist}${album ? " • " + album : ""}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  globalSearchResults.hidden = false;

  globalSearchResults.querySelectorAll(".searchItem").forEach((el) => {
    el.addEventListener("click", async () => {
      const idx = parseInt(el.getAttribute("data-idx") || "-1", 10);
      const track = tracks[idx];
      if (!track) return;

      if (globalSearchInput) {
        const title = track?.name || "";
        const artist = (track?.artists || []).map(a => a.name).join(", ");
        globalSearchInput.value = `${title} — ${artist}`;
      }

      closeGlobalResults();
      await showTrackPopup(track);
    });
  });
}

const doGlobalSearch = debounce(async () => {
  if (!globalSearchInput || !globalSearchResults) return;

  const q = globalSearchInput.value.trim();
  if (q.length < 2){
    closeGlobalResults();
    return;
  }

  globalSearchResults.hidden = false;
  globalSearchResults.innerHTML = `<div class="searchItem__empty">Cerco su Spotify…</div>`;

  try{
    const tracks = await spotifySearchTracks(q);
    renderGlobalResults(tracks);
  }catch(e){
    console.error(e);
    globalSearchResults.innerHTML = `<div class="searchItem__empty">Errore: ${escapeHtml(e.message)}</div>`;
    globalSearchResults.hidden = false;
  }
}, 350);

globalSearchInput?.addEventListener("input", doGlobalSearch);

document.addEventListener("click", (e) => {
  if (!globalSearchResults || !globalSearchInput) return;
  const clickedInside = globalSearchResults.contains(e.target) || globalSearchInput.contains(e.target);
  if (!clickedInside) closeGlobalResults();
});

globalSearchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGlobalResults();
});



window.addEventListener("sn4m:playlists-changed", () => {
  renderHomeLastPlaylists();
  updateHeroKpis();
  renderSharedSearch();
});

window.addEventListener("storage", (e) => {
  if (PLAYLISTS_STORAGE_CANDIDATES.includes(e.key) || (e.key || "").startsWith("sn4m_playlists")) {
    renderHomeLastPlaylists();
    updateHeroKpis();
    renderSharedSearch();
  }
});



const homeCommunityGrid = document.getElementById("homeCommunityGrid");
const homeCommunityEmpty = document.getElementById("homeCommunityEmpty");

function getMyHomeCommunities(){
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (!user) return [];

  const uidUser = String(user.id || user.username || user.email || "");
  if (!uidUser) return [];

  let communities = [];
  try{
    communities = JSON.parse(localStorage.getItem("sn4m_communities") || "[]");
  }catch{}

  return communities.filter(c =>
    Array.isArray(c.members) && c.members.map(String).includes(uidUser)
  );
}

function renderHomeCommunities(){
  if (!homeCommunityGrid) return;

  const list = getMyHomeCommunities();
  homeCommunityGrid.innerHTML = "";

  if (!list.length){
    homeCommunityEmpty.hidden = false;
    return;
  }
  homeCommunityEmpty.hidden = true;

  list.forEach(c => {
    const cover =
      c.cover ||
      c.coverUrl ||
      c.image ||
      `data:image/svg+xml;utf8,
      <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
        <rect width='200' height='200' rx='30' fill='%23a04fe2'/>
        <text x='50%' y='55%' text-anchor='middle'
          font-size='90' fill='white'>👥</text>
      </svg>`;

    const card = document.createElement("div");
    card.className = "homeCommunityCard";

    card.innerHTML = `
      <div class="homeCommunityCover">
        <img src="${cover}" alt="">
      </div>
      <div class="homeCommunityInfo">
        <p class="homeCommunityTitle">${escapeHtml(c.title)}</p>
        <p class="homeCommunityMeta">${(c.members || []).length} membri</p>
      </div>
    `;

    card.addEventListener("click", () => window.location.href = "community.html");
    homeCommunityGrid.appendChild(card);
  });
}

renderHomeCommunities();



const sharedTagQuery = document.getElementById("sharedTagQuery");
const sharedSongQuery = document.getElementById("sharedSongQuery");
const sharedList = document.getElementById("sharedList");
const sharedEmpty = document.getElementById("sharedEmpty");
const sharedScopeChip = document.getElementById("sharedScopeChip");

function getCurrentUserKeyId(){
  try{
    const u = JSON.parse(localStorage.getItem("currentUser") || "null");
    return String(u?.id || u?.username || u?.email || "");
  }catch{ return ""; }
}

function getUserPlaylistsKey(){
  const id = getCurrentUserKeyId();
  return id ? `sn4m_playlists_${id}` : "";
}

// legge playlist globali + tutte le chiavi per-utente (sn4m_playlists_*)
function loadAllPlaylistsEverywhere(){
  let all = [];

  // globale
  try{
    const g = JSON.parse(localStorage.getItem("sn4m_playlists") || "[]");
    if (Array.isArray(g)) all = all.concat(g);
  }catch{}

  // per-utente
  try{
    for (let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if (k && k.startsWith("sn4m_playlists_")){
        const arr = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(arr)) all = all.concat(arr);
      }
    }
  }catch{}

  const normalized = normalizePlaylists(all);

  // dedup
  const seen = new Set();
  const out = [];
  for (const p of normalized){
    if (!p.id || seen.has(String(p.id))) continue;
    seen.add(String(p.id));
    out.push(p);
  }
  return out;
}

function myCommunityIds(){
  return getMyHomeCommunities().map(c => String(c.id)).filter(Boolean);
}

function isSharedToAnyMine(pl, mineIds){
  const shared = Array.isArray(pl.sharedCommunityIds) ? pl.sharedCommunityIds.map(String) : [];
  return shared.some(cid => mineIds.includes(cid));
}

function playlistMatches(pl, tagQ, songQ){
  const tags = (Array.isArray(pl.tags) ? pl.tags : []).map(t => String(t).toLowerCase());
  const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];

  const tagOk = !tagQ || tags.some(t => t.includes(tagQ));

  const songOk = !songQ || tracks.some(tr => {
    const title = String(tr?.title ?? tr?.name ?? "").toLowerCase();
    const artist = String(tr?.artist ?? "").toLowerCase();
    return title.includes(songQ) || artist.includes(songQ);
  });

  return tagOk && songOk;
}

function totalDurationMs(pl){
  const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];
  let sum = 0;
  for (const t of tracks){
    if (Number.isFinite(t?.durationMs)) sum += t.durationMs;
    else if (Number.isFinite(t?.duration_ms)) sum += t.duration_ms;
    else if (Number.isFinite(t?.durationSec)) sum += t.durationSec * 1000;
  }
  return sum;
}

function renderSharedSearch(){
  if (!sharedList || !sharedEmpty || !sharedScopeChip) return;

  const mineIds = myCommunityIds();
  sharedScopeChip.textContent = mineIds.length ? `In ${mineIds.length} community` : `Nessuna community`;

  const tagQ = (sharedTagQuery?.value || "").trim().toLowerCase();
  const songQ = (sharedSongQuery?.value || "").trim().toLowerCase();

  const all = loadAllPlaylistsEverywhere();
  const visible = all.filter(pl => isSharedToAnyMine(pl, mineIds));
  const filtered = visible.filter(pl => playlistMatches(pl, tagQ, songQ));

  sharedList.innerHTML = "";

  if (!filtered.length){
    sharedEmpty.hidden = false;
    return;
  }
  sharedEmpty.hidden = true;

  filtered.forEach(pl => {
    const myId = getCurrentUserKeyId();
    const isMine = myId && String(pl.ownerId || pl.owner || "") === String(myId);

    const dur = totalDurationMs(pl);
    const durTxt = dur ? msToMinSec(dur) : "—";
    const tagsTxt = (Array.isArray(pl.tags) && pl.tags.length) ? pl.tags.join(", ") : "—";

    const tracks = Array.isArray(pl.tracks) ? pl.tracks : [];
    const tracksHtml = tracks.length
      ? tracks.map(t => {
          const title = t?.title || t?.name || "Brano";
          const artist = t?.artist || "—";
          const d =
            t?.duration_ms ? msToMinSec(t.duration_ms) :
            t?.durationMs ? msToMinSec(t.durationMs) :
            t?.durationSec ? msToMinSec(t.durationSec * 1000) : "";
          return `
            <div class="trackRow">
              <div class="trackMain">${escapeHtml(title)} — ${escapeHtml(artist)}</div>
              <div style="color:rgba(255,255,255,.72);font-size:12px;">${escapeHtml(d)}</div>
            </div>
          `;
        }).join("")
      : `<div class="trackRow"><div class="trackMain">Nessun brano</div><div></div></div>`;

    const item = document.createElement("div");
    item.className = "publicItem";
    item.innerHTML = `
      <div class="publicTop">
        <div>
          <h3 class="publicTitle">${escapeHtml(pl.title)}</h3>
          <p class="publicDesc">${escapeHtml(pl.desc || "Descrizione non inserita.")}</p>
        </div>
        <div class="chip">⏱ ${escapeHtml(durTxt)}</div>
      </div>

      <div class="kpis" style="margin-top:10px;">
        <span class="kpi">🏷️ ${escapeHtml(tagsTxt)}</span>
        <span class="kpi">🎵 ${tracks.length} brani</span>
      </div>

      <div class="publicTracks" style="max-height:220px; overflow:auto; padding-right:4px;">
        ${tracksHtml}
      </div>

      <div class="publicActions">
        <button class="btn secondary" type="button" data-shared-open="${escapeHtml(pl.id)}">Dettagli</button>

        ${
          isMine
            ? `<button class="btn ghost" type="button" disabled title="È già una tua playlist">Tua</button>`
            : `<button class="btn primary" type="button" data-shared-import="${escapeHtml(pl.id)}">Importa</button>`
        }
      </div>
    `;

    sharedList.appendChild(item);
  });
}

// UN SOLO LISTENER (detta la legge, niente duplicati)
if (sharedList) {
  sharedList.onclick = (e) => {
    const openBtn = e.target.closest("[data-shared-open]");
    const importBtn = e.target.closest("[data-shared-import]");
    if (!openBtn && !importBtn) return;

    // ---- DETTAGLI ----
    if (openBtn) {
      const id = openBtn.getAttribute("data-shared-open");
      const pl = loadAllPlaylistsEverywhere().find(x => String(x.id) === String(id));
      if (pl) renderPlaylistModal(pl);
      return;
    }

    // ---- IMPORTA ----
    const id = importBtn.getAttribute("data-shared-import");
    const src = loadAllPlaylistsEverywhere().find(x => String(x.id) === String(id));
    if (!src) return;

    const myId = getCurrentUserKeyId();
    if (!myId) return;

    // 1) se ownerId coincide -> è tua
    if (String(src.ownerId || src.owner || "") === String(myId)) {
      alert("Questa playlist è già tua: non puoi importarla.");
      return;
    }

    // 2) fallback: se id già presente nel tuo profilo (caso ownerId mancante)
    const perUserKey = `sn4m_playlists_${myId}`;
    let mine = [];
    try {
      mine = JSON.parse(localStorage.getItem(perUserKey) || "[]");
      if (!Array.isArray(mine)) mine = [];
    } catch { mine = []; }

    if (mine.some(p => String(p.id) === String(src.id))) {
      alert("Questa playlist è già tua: non puoi importarla.");
      return;
    }

    // crea copia nuova (nuovo id) privata
    const now = Date.now();
    const imported = {
      ...src,
      id: uid("pl"),
      ownerId: myId,                
      title: `${src.title} (importata)`,
      createdAt: now,
      updatedAt: now,
      isImported: true,
      sharedCommunityIds: []        
    };

    // salva nel profilo utente
    mine.unshift(imported);
    localStorage.setItem(perUserKey, JSON.stringify(normalizePlaylists(mine)));
    window.dispatchEvent(new CustomEvent("sn4m:playlists-changed"));

    alert("Playlist importata nel tuo profilo!");
  };
}

// listeners ricerca
sharedTagQuery?.addEventListener("input", renderSharedSearch);
sharedSongQuery?.addEventListener("input", renderSharedSearch);

// sync
window.addEventListener("sn4m:communities-changed", () => {
  renderHomeCommunities();
  renderSharedSearch();
});

// init
renderSharedSearch();