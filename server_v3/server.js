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

app.get('/ping', (req, res) => {
  res.status(200).send('Server is active');
});

startSelfPing();

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  

app.get('/', (req, res) => {
    res.send('Hello from the server!');
  });