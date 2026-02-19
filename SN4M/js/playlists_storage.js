
const PLAYLISTS_STORAGE_KEY = "sn4m_playlists";

function uid(prefix="pl"){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readPlaylists(){
  try{
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch{
    return [];
  }
}

function writePlaylists(list){
  localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(list));
  // evento custom per aggiornare la UI nella stessa tab (storage event non scatta nella stessa tab)
  window.dispatchEvent(new CustomEvent("sn4m:playlists-changed"));
}

// Helper: trova playlist per id
function findPlaylistById(id){
  return readPlaylists().find(p => p.id === id) || null;
}