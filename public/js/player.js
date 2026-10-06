// Player page logic

const params = new URLSearchParams(window.location.search);
const roomCode = (params.get('room') || '').toUpperCase();

if (!roomCode) {
  alert('No room code. Going home...');
  window.location.href = '/';
}

document.getElementById('roomBadge').textContent = roomCode;
document.getElementById('bigRoomCode').textContent = roomCode;

const socket = io();
let ytPlayer = null;
let currentVideoId = null;
let isPlayerReady = false;

// Join as player
socket.emit('join-room', {
  roomCode,
  role: 'player',
  nickname: 'Main Screen'
});

socket.on('error', (data) => {
  alert(data.message);
  window.location.href = '/';
});

socket.on('room-state', (state) => {
  updateQueue(state.queue);
  if (state.currentSong && state.isPlaying) {
    playSong(state.currentSong);
  }
});

socket.on('queue-updated', (data) => {
  updateQueue(data.queue);
});

socket.on('now-playing', (data) => {
  if (data.song) {
    playSong(data.song);
  } else {
    showWaiting();
  }
});

socket.on('show-score', (data) => {
  showScore(data);
});

socket.on('user-joined', (data) => {
  document.getElementById('controllerCount').textContent = 
    `${data.controllerCount} controller${data.controllerCount !== 1 ? 's' : ''}`;
});

socket.on('user-left', (data) => {
  document.getElementById('controllerCount').textContent = 
    `${data.controllerCount} controller${data.controllerCount !== 1 ? 's' : ''}`;
});

// YouTube API
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('youtubePlayer', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      fs: 1
    },
    events: {
      onReady: () => { isPlayerReady = true; },
      onStateChange: onPlayerStateChange
    }
  });
}

// Make sure API callback is global
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    socket.emit('song-ended');
  }
}

function playSong(song) {
  currentVideoId = song.videoId;
  
  document.getElementById('waitingScreen').classList.add('hidden');
  document.getElementById('playerWrapper').classList.remove('hidden');
  document.getElementById('nowPlayingBar').classList.remove('hidden');
  
  document.getElementById('nowTitle').textContent = song.title;
  document.getElementById('nowRequester').textContent = song.requestedBy || 'Someone';
  if (song.thumbnail) {
    document.getElementById('nowThumb').src = song.thumbnail;
  }

  if (isPlayerReady && ytPlayer) {
    ytPlayer.loadVideoById(song.videoId);
  } else {
    // Wait a bit for player
    const check = setInterval(() => {
      if (isPlayerReady && ytPlayer) {
        ytPlayer.loadVideoById(song.videoId);
        clearInterval(check);
      }
    }, 300);
  }
}

function showWaiting() {
  document.getElementById('waitingScreen').classList.remove('hidden');
  document.getElementById('playerWrapper').classList.add('hidden');
  document.getElementById('nowPlayingBar').classList.add('hidden');
  if (ytPlayer && isPlayerReady) {
    ytPlayer.stopVideo();
  }
}

function updateQueue(queue) {
  const list = document.getElementById('queueList');
  document.getElementById('queueCount').textContent = queue.length;

  if (!queue || queue.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 text-sm py-8">No songs yet. Add some!</p>';
    return;
  }

  list.innerHTML = queue.map((song, i) => `
    <div class="queue-item flex gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10">
      <div class="text-pinoy-yellow font-bold w-6 text-center">${i + 1}</div>
      <img src="${song.thumbnail || ''}" class="w-14 h-10 rounded object-cover bg-black" onerror="this.style.display='none'">
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm truncate">${escapeHtml(song.title)}</div>
        <div class="text-xs text-gray-400 truncate">by ${escapeHtml(song.requestedBy)}</div>
      </div>
    </div>
  `).join('');
}

function showScore(data) {
  document.getElementById('scoreValue').textContent = data.score;
  document.getElementById('scoreRating').textContent = data.rating;
  document.getElementById('scoreMessage').textContent = data.message;
  document.getElementById('scoreOverlay').classList.add('show');

  setTimeout(() => {
    document.getElementById('scoreOverlay').classList.remove('show');
  }, 5500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Controls
document.getElementById('skipBtn').addEventListener('click', () => {
  socket.emit('skip-song');
});

document.getElementById('playNextBtn').addEventListener('click', () => {
  socket.emit('play-next');
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
