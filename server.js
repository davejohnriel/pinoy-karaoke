const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Needed so req.protocol / host are correct behind Railway's proxy (HTTPS QR codes)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// In-memory rooms store
const rooms = new Map();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Generate a short room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create room
app.post('/api/rooms', async (req, res) => {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = {
    id: code,
    hostId: null,
    queue: [],
    currentSong: null,
    isPlaying: false,
    players: new Set(),
    controllers: new Set(),
    scores: [],
    createdAt: Date.now()
  };

  rooms.set(code, room);

  // Generate QR code data URL (points to join page)
  const joinUrl = `${req.protocol}://${req.get('host')}/join.html?room=${code}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(joinUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });
  } catch (e) {
    console.error('QR generation failed', e);
  }

  res.json({
    roomCode: code,
    joinUrl,
    qrCode: qrDataUrl
  });
});

// Get room info
app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomCode: room.id,
    queueLength: room.queue.length,
    currentSong: room.currentSong,
    isPlaying: room.isPlaying,
    playerCount: room.players.size,
    controllerCount: room.controllers.size
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ roomCode, role, nickname }) => {
    const code = (roomCode || '').toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit('error', { message: 'Room not found. Check the code.' });
      return;
    }

    socket.join(code);
    socket.roomCode = code;
    socket.role = role;
    socket.nickname = nickname || 'Singer';

    if (role === 'player') {
      room.players.add(socket.id);
      if (!room.hostId) room.hostId = socket.id;
    } else {
      room.controllers.add(socket.id);
    }

    // Send current state
    socket.emit('room-state', {
      roomCode: code,
      queue: room.queue,
      currentSong: room.currentSong,
      isPlaying: room.isPlaying,
      scores: room.scores.slice(-10)
    });

    // Notify others
    io.to(code).emit('user-joined', {
      nickname: socket.nickname,
      role,
      controllerCount: room.controllers.size,
      playerCount: room.players.size
    });

    console.log(`${socket.nickname} joined ${code} as ${role}`);
  });

  socket.on('add-to-queue', (song) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    const queueItem = {
      id: uuidv4(),
      title: song.title,
      artist: song.artist || 'Unknown',
      videoId: song.videoId,
      thumbnail: song.thumbnail,
      requestedBy: socket.nickname,
      addedAt: Date.now()
    };

    room.queue.push(queueItem);

    io.to(socket.roomCode).emit('queue-updated', {
      queue: room.queue,
      added: queueItem
    });
  });

  socket.on('remove-from-queue', ({ songId }) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    room.queue = room.queue.filter(s => s.id !== songId);
    io.to(socket.roomCode).emit('queue-updated', { queue: room.queue });
  });

  socket.on('skip-song', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    // Move to next
    playNext(room, socket.roomCode);
  });

  socket.on('play-next', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    playNext(room, socket.roomCode);
  });

  socket.on('song-ended', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;

    // Generate a fun Pinoy-style score
    const score = generateScore();
    const lastSong = room.currentSong;

    if (lastSong) {
      room.scores.unshift({
        song: lastSong.title,
        singer: lastSong.requestedBy,
        score: score.value,
        rating: score.rating,
        message: score.message,
        timestamp: Date.now()
      });
      // Keep only last 20
      if (room.scores.length > 20) room.scores.pop();
    }

    io.to(socket.roomCode).emit('show-score', {
      score: score.value,
      rating: score.rating,
      message: score.message,
      song: lastSong
    });

    // Auto play next after delay
    setTimeout(() => {
      playNext(room, socket.roomCode);
    }, 6000);
  });

  socket.on('reorder-queue', ({ fromIndex, toIndex }) => {
    const room = rooms.get(socket.roomCode);
    if (!room || fromIndex < 0 || toIndex < 0) return;

    const item = room.queue.splice(fromIndex, 1)[0];
    room.queue.splice(toIndex, 0, item);
    io.to(socket.roomCode).emit('queue-updated', { queue: room.queue });
  });

  socket.on('clear-queue', () => {
    const room = rooms.get(socket.roomCode);
    if (!room) return;
    room.queue = [];
    io.to(socket.roomCode).emit('queue-updated', { queue: [] });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode);
    if (room) {
      room.players.delete(socket.id);
      room.controllers.delete(socket.id);

      io.to(socket.roomCode).emit('user-left', {
        nickname: socket.nickname,
        controllerCount: room.controllers.size,
        playerCount: room.players.size
      });

      // Clean empty rooms after 1 hour
      if (room.players.size === 0 && room.controllers.size === 0) {
        setTimeout(() => {
          if (rooms.has(socket.roomCode) &&
              rooms.get(socket.roomCode).players.size === 0 &&
              rooms.get(socket.roomCode).controllers.size === 0) {
            rooms.delete(socket.roomCode);
            console.log('Room cleaned:', socket.roomCode);
          }
        }, 60 * 60 * 1000);
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

function playNext(room, roomCode) {
  if (room.queue.length === 0) {
    room.currentSong = null;
    room.isPlaying = false;
    io.to(roomCode).emit('now-playing', { song: null, isPlaying: false });
    return;
  }

  const nextSong = room.queue.shift();
  room.currentSong = nextSong;
  room.isPlaying = true;

  io.to(roomCode).emit('queue-updated', { queue: room.queue });
  io.to(roomCode).emit('now-playing', {
    song: nextSong,
    isPlaying: true
  });
}

function generateScore() {
  // Fun Pinoy-style scoring (not real pitch detection)
  const roll = Math.random();
  let value, rating, message;

  if (roll > 0.92) {
    value = 95 + Math.floor(Math.random() * 6);
    rating = 'LEGENDARY';
    message = 'Walang kamatayan!!! 🔥🔥🔥';
  } else if (roll > 0.75) {
    value = 88 + Math.floor(Math.random() * 7);
    rating = 'EXCELLENT';
    message = 'Ang galing mo naman! 👏';
  } else if (roll > 0.5) {
    value = 75 + Math.floor(Math.random() * 13);
    rating = 'GREAT';
    message = 'Ayos! Continue singing! 🎤';
  } else if (roll > 0.25) {
    value = 60 + Math.floor(Math.random() * 15);
    rating = 'GOOD';
    message = 'Nice try, barkada! 💪';
  } else {
    value = 40 + Math.floor(Math.random() * 20);
    rating = 'OKAY';
    message = 'Practice more, next time better! 😅';
  }

  return { value, rating, message };
}

// Clean old rooms every 30 mins
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 4 * 60 * 60 * 1000 &&
        room.players.size === 0 && room.controllers.size === 0) {
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🎤 Pinoy Karaoke server running at http://localhost:${PORT}`);
});
