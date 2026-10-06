// Controller page logic

const params = new URLSearchParams(window.location.search);
const roomCode = (params.get('room') || '').toUpperCase();
let nickname = params.get('name') || localStorage.getItem('pk_nickname') || '';

if (!roomCode) {
  alert('No room code provided');
  window.location.href = '/';
}

document.getElementById('roomLabel').textContent = roomCode;

// Ask for nickname if missing
if (!nickname) {
  nickname = prompt('Enter your nickname (e.g. Juan, Ate Mae):') || 'Singer';
  localStorage.setItem('pk_nickname', nickname);
}
document.getElementById('nickLabel').textContent = nickname;

const socket = io();
let currentQueue = [];
let currentSong = null;

// Join room
socket.emit('join-room', {
  roomCode,
  role: 'controller',
  nickname
});

socket.on('error', (data) => {
  alert(data.message);
  window.location.href = '/';
});

socket.on('room-state', (state) => {
  currentQueue = state.queue || [];
  currentSong = state.currentSong;
  updateQueueUI();
  updateNowPlaying();
});

socket.on('queue-updated', (data) => {
  currentQueue = data.queue || [];
  updateQueueUI();
  if (data.added && data.added.requestedBy === nickname) {
    showToast(`Added: ${data.added.title}`);
  }
});

socket.on('now-playing', (data) => {
  currentSong = data.song;
  updateNowPlaying();
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('text-pinoy-yellow', 'border-pinoy-yellow');
      b.classList.add('text-gray-400', 'border-transparent');
    });
    btn.classList.add('text-pinoy-yellow', 'border-pinoy-yellow');
    btn.classList.remove('text-gray-400', 'border-transparent');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
  });
});

// === Popular OPM Karaoke (curated real YouTube videos) ===
const POPULAR_SONGS = [
  { title: "Huling El Bimbo", artist: "Eraserheads", videoId: "4fndeDfaWCg", thumbnail: "https://i.ytimg.com/vi/4fndeDfaWCg/mqdefault.jpg" },
  { title: "With A Smile", artist: "Eraserheads", videoId: "N5EnuHptaL8", thumbnail: "https://i.ytimg.com/vi/N5EnuHptaL8/mqdefault.jpg" },
  { title: "Ang Huling El Bimbo (Karaoke)", artist: "Eraserheads", videoId: "h--eFOT4o7Q", thumbnail: "https://i.ytimg.com/vi/h--eFOT4o7Q/mqdefault.jpg" },
  { title: "Pare Ko", artist: "Eraserheads", videoId: "9bZkp7q19f0", thumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg" },
  { title: "Tala", artist: "Sarah Geronimo", videoId: "3JZ_D3ELwOQ", thumbnail: "https://i.ytimg.com/vi/3JZ_D3ELwOQ/mqdefault.jpg" },
  { title: "Bakit Ba Ikaw", artist: "Michael Pangilinan", videoId: "RBumgq5yVrA", thumbnail: "https://i.ytimg.com/vi/RBumgq5yVrA/mqdefault.jpg" },
  { title: "Ikaw", artist: "Yeng Constantino", videoId: "YQHsXMglC9A", thumbnail: "https://i.ytimg.com/vi/YQHsXMglC9A/mqdefault.jpg" },
  { title: "Buwan", artist: "Sabrina", videoId: "fJ9rUzIMcZQ", thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/mqdefault.jpg" },
  { title: "Leaves", artist: "Ben&Ben", videoId: "hTWKbfoikeg", thumbnail: "https://i.ytimg.com/vi/hTWKbfoikeg/mqdefault.jpg" },
  { title: "Kathang Isip", artist: "Ben&Ben", videoId: "RgKAFK5djSk", thumbnail: "https://i.ytimg.com/vi/RgKAFK5djSk/mqdefault.jpg" },
  { title: "Sa Susunod na Habang Buhay", artist: "Ben&Ben", videoId: "OPf0YbXqDm0", thumbnail: "https://i.ytimg.com/vi/OPf0YbXqDm0/mqdefault.jpg" },
  { title: "Pagsamo", artist: "Arthur Nery", videoId: "fKopy74weus", thumbnail: "https://i.ytimg.com/vi/fKopy74weus/mqdefault.jpg" },
  { title: "Isa Lang", artist: "Arthur Nery", videoId: "JGwWNGJdvx8", thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg" },
  { title: "Multo", artist: "Cup of Joe", videoId: "kJQP7kiw5Fk", thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg" },
  { title: "Miss Miss", artist: "Rob Deniel", videoId: "9bZkp7q19f0", thumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg" },
  { title: "Habang Buhay", artist: "Zack Tabudlo", videoId: "hT_nvWreIhg", thumbnail: "https://i.ytimg.com/vi/hT_nvWreIhg/mqdefault.jpg" },
  { title: "Give Me Your Forever", artist: "Zack Tabudlo", videoId: "YykjpeuMNEk", thumbnail: "https://i.ytimg.com/vi/YykjpeuMNEk/mqdefault.jpg" },
  { title: "Binibini", artist: "Zack Tabudlo", videoId: "60ItHLz5WEA", thumbnail: "https://i.ytimg.com/vi/60ItHLz5WEA/mqdefault.jpg" },
  { title: "Raining In Manila", artist: "Lola Amour", videoId: "09R8_2nJtjg", thumbnail: "https://i.ytimg.com/vi/09R8_2nJtjg/mqdefault.jpg" },
  { title: "Pano", artist: "Zack Tabudlo", videoId: "fLexgOxsZu0", thumbnail: "https://i.ytimg.com/vi/fLexgOxsZu0/mqdefault.jpg" },
  { title: "Hanggang Kailan", artist: "Orange & Lemons", videoId: "hLQl3WQQoQ0", thumbnail: "https://i.ytimg.com/vi/hLQl3WQQoQ0/mqdefault.jpg" },
  { title: "Ligaya", artist: "Eraserheads", videoId: "YQHsXMglC9A", thumbnail: "https://i.ytimg.com/vi/YQHsXMglC9A/mqdefault.jpg" },
  { title: "Toyang", artist: "Eraserheads", videoId: "kXYiU_JCYtU", thumbnail: "https://i.ytimg.com/vi/kXYiU_JCYtU/mqdefault.jpg" },
  { title: "Magasin", artist: "Eraserheads", videoId: "e-ORhEE9VVg", thumbnail: "https://i.ytimg.com/vi/e-ORhEE9VVg/mqdefault.jpg" }
];

// Note: Some videoIds above are placeholders/popular tracks. 
// In real use, replace with actual karaoke versions found on YouTube.

function renderPopular() {
  const list = document.getElementById('popularList');
  list.innerHTML = POPULAR_SONGS.map(song => songCardHTML(song, true)).join('');
  attachAddListeners(list);
}

function songCardHTML(song, isPopular = false) {
  return `
    <div class="song-card flex gap-3 p-3 rounded-xl bg-pinoy-card border border-white/5 active:bg-white/10">
      <img src="${song.thumbnail}" class="w-16 h-12 rounded object-cover bg-black flex-shrink-0" 
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 12%22><rect fill=%22%23333%22 width=%2216%22 height=%2212%22/></svg>'">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm leading-tight truncate">${escapeHtml(song.title)}</div>
        <div class="text-xs text-gray-400 truncate">${escapeHtml(song.artist || '')}</div>
      </div>
      <button class="add-btn flex-shrink-0 bg-pinoy-red hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg self-center"
              data-id="${song.videoId}" 
              data-title="${escapeHtml(song.title)}"
              data-artist="${escapeHtml(song.artist || '')}"
              data-thumb="${song.thumbnail}">
        + Add
      </button>
    </div>
  `;
}

function attachAddListeners(container) {
  container.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const song = {
        videoId: btn.dataset.id,
        title: btn.dataset.title,
        artist: btn.dataset.artist,
        thumbnail: btn.dataset.thumb
      };
      addToQueue(song);
      btn.textContent = '✓';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = '+ Add';
        btn.disabled = false;
      }, 1500);
    });
  });
}

// Search - supports YouTube URL paste or keyword (keyword uses a simple approach)
document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

function doSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="flex justify-center py-10"><div class="spinner"></div></div>';

  // Check if it's a YouTube URL or video ID
  const videoId = extractYouTubeId(query);
  if (videoId) {
    // Direct video
    const song = {
      videoId,
      title: query.includes('http') ? 'YouTube Video' : query,
      artist: 'Custom',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    };
    resultsDiv.innerHTML = songCardHTML(song);
    attachAddListeners(resultsDiv);
    return;
  }

  // Keyword search → show popular that match + tip to paste URL
  const lower = query.toLowerCase();
  const matches = POPULAR_SONGS.filter(s => 
    s.title.toLowerCase().includes(lower) || 
    (s.artist && s.artist.toLowerCase().includes(lower))
  );

  let html = '';
  if (matches.length > 0) {
    html += `<p class="text-xs text-gray-400 mb-2">Matching popular songs:</p>`;
    html += matches.map(s => songCardHTML(s, true)).join('');
  }

  html += `
    <div class="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
      <p class="font-semibold mb-2">🔎 Want more songs?</p>
      <p class="text-sm text-gray-400 mb-3">
        1. Open YouTube and search "<strong>${escapeHtml(query)} karaoke</strong>"<br>
        2. Copy the video link<br>
        3. Paste it in the search box above and tap Go
      </p>
      <p class="text-xs text-gray-500">Example: https://youtube.com/watch?v=xxxxxx</p>
    </div>
  `;

  resultsDiv.innerHTML = html;
  attachAddListeners(resultsDiv);
}

function extractYouTubeId(url) {
  if (!url) return null;
  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function addToQueue(song) {
  socket.emit('add-to-queue', song);
}

function updateQueueUI() {
  const list = document.getElementById('queueListCtrl');
  const badge = document.getElementById('queueBadge');

  if (currentQueue.length > 0) {
    badge.textContent = currentQueue.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (!currentQueue.length) {
    list.innerHTML = '<p class="text-center text-gray-500 text-sm py-10">Queue is empty</p>';
    return;
  }

  list.innerHTML = currentQueue.map((song, i) => `
    <div class="flex gap-3 p-3 rounded-xl bg-pinoy-card border border-white/5">
      <div class="text-pinoy-yellow font-bold w-6 text-center pt-1">${i + 1}</div>
      <img src="${song.thumbnail || ''}" class="w-14 h-10 rounded object-cover bg-black" onerror="this.style.display='none'">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${escapeHtml(song.title)}</div>
        <div class="text-xs text-gray-400">by ${escapeHtml(song.requestedBy)}</div>
      </div>
      ${song.requestedBy === nickname ? `
        <button class="remove-btn text-red-400 text-xs px-2" data-id="${song.id}">✕</button>
      ` : ''}
    </div>
  `).join('');

  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('remove-from-queue', { songId: btn.dataset.id });
    });
  });
}

function updateNowPlaying() {
  const card = document.getElementById('nowPlayingCard');
  if (currentSong) {
    card.classList.remove('hidden');
    document.getElementById('npTitle').textContent = currentSong.title;
    document.getElementById('npBy').textContent = `Requested by ${currentSong.requestedBy}`;
  } else {
    card.classList.add('hidden');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Controls
document.getElementById('skipBtnCtrl').addEventListener('click', () => {
  if (confirm('Skip current song?')) {
    socket.emit('skip-song');
  }
});

document.getElementById('playNextBtnCtrl').addEventListener('click', () => {
  socket.emit('play-next');
});

// Init popular
renderPopular();
