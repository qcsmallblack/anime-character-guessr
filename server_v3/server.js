const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { startSelfPing } = require('./utils/selfPing');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const cors_options = {
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'https://anime-character-guessr.onrender.com',
        'https://anime-character-guessr.vercel.app',
        'https://anime-character-guessr.netlify.app'
      ],
      methods: ['GET', 'POST'],
      credentials: true
}

const io = new Server(server, {
  cors: cors_options
});

app.use(cors(cors_options));

// Store room data
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle room creation
  socket.on('createRoom', ({ roomId, username }) => {
    // Basic validation
    if (!username || username.trim().length === 0) {
      socket.emit('error', { message: 'Username cannot be empty' });
      return;
    }
    
    // Although the host is the first player, ensure room doesn't somehow exist
    if (rooms.has(roomId)) {
        socket.emit('error', { message: 'Room already exists unexpectedly' });
        return;
    }

    // Create new room with host
    rooms.set(roomId, {
      host: socket.id,
      players: [{
        id: socket.id,
        username,
        isHost: true
      }]
    });

    // Join socket to room
    socket.join(roomId);
    
    // Send room data back to host
    io.to(roomId).emit('updatePlayers', {
      players: rooms.get(roomId).players
    });

    console.log(`Room ${roomId} created by ${username}`);
  });

  // Handle room joining
  socket.on('joinRoom', ({ roomId, username }) => {
    // Basic validation
    if (!username || username.trim().length === 0) {
        socket.emit('error', { message: 'Username cannot be empty' });
        return;
    }

    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check for duplicate username (case-insensitive)
    const isUsernameTaken = room.players.some(
      player => player.username.toLowerCase() === username.toLowerCase()
    );

    if (isUsernameTaken) {
      socket.emit('error', { message: 'Username is already taken in this room' });
      return;
    }

    // Add player to room
    room.players.push({
      id: socket.id,
      username,
      isHost: false
    });

    // Join socket to room
    socket.join(roomId);

    // Send updated player list to all clients in room
    io.to(roomId).emit('updatePlayers', {
      players: room.players
    });

    console.log(`${username} joined room ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Find and remove player from their room
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // If host disconnected, delete room and notify others
        if (room.host === socket.id) {
          rooms.delete(roomId);
          // Notify remaining players the room is closed
          io.to(roomId).emit('roomClosed', { message: 'Host disconnected' });
          console.log(`Host ${disconnectedPlayer.username} disconnected. Room ${roomId} closed and disbanded.`);
        } else {
          // Otherwise just update player list for remaining players
          io.to(roomId).emit('updatePlayers', {
            players: room.players
          });
          console.log(`Player ${disconnectedPlayer.username} disconnected from room ${roomId}.`);
        }
        break; // Exit loop once player is found and handled
      }
    }
    
    console.log(`User ${socket.id} disconnected`); // General disconnect log
  });
});

app.get('/ping', (req, res) => {
  res.status(200).send('Server is active');
});

// startSelfPing();

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Hello from the server!');
});