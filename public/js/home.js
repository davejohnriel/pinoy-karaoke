// Home page logic

const createBtn = document.getElementById('createRoomBtn');
const joinBtn = document.getElementById('joinRoomBtn');
const createModal = document.getElementById('createModal');
const joinModal = document.getElementById('joinModal');
const closeCreate = document.getElementById('closeCreateModal');
const closeJoin = document.getElementById('closeJoinModal');

let currentRoom = null;

createBtn.addEventListener('click', async () => {
  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  try {
    const res = await fetch('/api/rooms', { method: 'POST' });
    const data = await res.json();
    currentRoom = data;

    document.getElementById('roomCodeDisplay').textContent = data.roomCode;
    document.getElementById('qrCodeImg').src = data.qrCode;
    document.getElementById('openPlayerBtn').href = `/player.html?room=${data.roomCode}`;
    document.getElementById('openControllerBtn').href = `/controller.html?room=${data.roomCode}`;

    createModal.classList.add('show');
  } catch (err) {
    alert('Failed to create room. Please try again.');
    console.error(err);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = '🎤 Create Room';
  }
});

joinBtn.addEventListener('click', () => {
  joinModal.classList.add('show');
  document.getElementById('joinCodeInput').focus();
});

closeCreate.addEventListener('click', () => createModal.classList.remove('show'));
closeJoin.addEventListener('click', () => joinModal.classList.remove('show'));

// Close on backdrop click
[createModal, joinModal].forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });
});

document.getElementById('copyCodeBtn').addEventListener('click', () => {
  if (currentRoom) {
    navigator.clipboard.writeText(currentRoom.roomCode);
    const btn = document.getElementById('copyCodeBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy Room Code', 2000);
  }
});

// Join logic
function joinRoom(role) {
  const code = document.getElementById('joinCodeInput').value.trim().toUpperCase();
  const nickname = document.getElementById('nicknameInput').value.trim() || 'Singer';

  if (!code || code.length < 4) {
    alert('Please enter a valid room code');
    return;
  }

  const url = role === 'player' 
    ? `/player.html?room=${code}` 
    : `/controller.html?room=${code}&name=${encodeURIComponent(nickname)}`;
  
  window.location.href = url;
}

document.getElementById('joinAsPlayer').addEventListener('click', () => joinRoom('player'));
document.getElementById('joinAsController').addEventListener('click', () => joinRoom('controller'));

// Auto-uppercase room code
document.getElementById('joinCodeInput').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});
