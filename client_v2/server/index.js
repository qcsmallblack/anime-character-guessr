const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getRandomCharacter, getCharacterAppearances, getCharacterCV } = require('./services/animeService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://anime-character-guessr.onrender.com',
      'https://anime-character-guessr-fkt5cwjsc-kennylimzs-projects.vercel.app',
      'https://anime-character-guessr.vercel.app',
      'https://anime-character-guessr.netlify.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://anime-character-guessr.onrender.com',
    'https://anime-character-guessr-fkt5cwjsc-kennylimzs-projects.vercel.app',
    'https://anime-character-guessr.vercel.app',
    'https://anime-character-guessr.netlify.app'
  ],
  credentials: true
}));
app.use(express.json());

// Store game states for each socket connection
const gameStates = new Map();

async function initializeGameState(socket) {
  let attempts = 0;
  const maxAttempts = 3; // Prevent infinite loops

  while (attempts < maxAttempts) {
    try {
      const character = await getRandomCharacter();
      
      // Check if we got a valid character with appearances
      if (character.appearances.length > 0 && character.lastAppearanceDate !== -1) {
        const gameState = {
          answerCharacter: character,
          guessesLeft: 10
        };
        
        // Store game state for this socket
        gameStates.set(socket.id, gameState);
        
        socket.emit('game-ready', { message: 'Game is ready!' });
        console.log(character);
        return true;
      }
    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
    }
    
    attempts++;
    // Add a small delay between attempts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  socket.emit('error', { message: 'Failed to initialize game after multiple attempts' });
  return false;
}

io.on('connection', async (socket) => {
  console.log('A user connected:', socket.id);
  await initializeGameState(socket);

  socket.on('guess', async (guessData) => {
    console.log('Guess received:', guessData);
    const gameState = gameStates.get(socket.id);
    if (!gameState || gameState.guessesLeft <= 0) return;

    gameState.guessesLeft--;

    try {
      // Check if guess is correct by comparing character IDs
      const isCorrect = guessData.id === gameState.answerCharacter.id;

      if (isCorrect) {
        // Correct guess - game over
        socket.emit('guess-feedback', { 
          feedback: generateFeedback(gameState.answerCharacter, gameState.answerCharacter),
          guessesLeft: gameState.guessesLeft,
          gameEnd: true,
          result: 'win',
          answer: gameState.answerCharacter
        });
      } else if (gameState.guessesLeft <= 0) {
        // Game over - out of attempts
        guessData.cv = await getCharacterCV(guessData.id);
        const appearances = await getCharacterAppearances(guessData.id);
        guessData.appearances = appearances.appearances;
        guessData.lastAppearanceDate = appearances.lastAppearanceDate;
        guessData.lastAppearanceRating = appearances.lastAppearanceRating;
        guessData.metaTags = appearances.metaTags;
        socket.emit('guess-feedback', { 
          feedback: generateFeedback(guessData, gameState.answerCharacter),
          guessesLeft: gameState.guessesLeft,
          gameEnd: true,
          result: 'lose',
          answer: gameState.answerCharacter
        });
      } else {
        // Continue game - fetch appearances for feedback
        guessData.cv = await getCharacterCV(guessData.id);
        const appearances = await getCharacterAppearances(guessData.id);
        guessData.appearances = appearances.appearances;
        guessData.lastAppearanceDate = appearances.lastAppearanceDate;
        guessData.lastAppearanceRating = appearances.lastAppearanceRating;
        guessData.metaTags = appearances.metaTags;
        console.log('Feedback:', generateFeedback(guessData, gameState.answerCharacter));
        socket.emit('guess-feedback', { 
          feedback: generateFeedback(guessData, gameState.answerCharacter),
          guessesLeft: gameState.guessesLeft
        });
      }
    } catch (error) {
      console.error('Error processing guess:', error);
      socket.emit('error', { message: 'Failed to process guess' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up game state when user disconnects
    gameStates.delete(socket.id);
  });
});

function generateFeedback(guess, answerCharacter) {
  const result = {};

  result.gender = {
    guess: guess.gender,
    feedback: guess.gender === answerCharacter.gender ? 'yes' : 'no'
  };

  const popularityDiff = guess.popularity - answerCharacter.popularity;
  const fivePercent = answerCharacter.popularity * 0.05;
  const twentyPercent = answerCharacter.popularity * 0.2;
  let popularityFeedback;
  if (Math.abs(popularityDiff) <= fivePercent) {
    popularityFeedback = '=';
  } else if (popularityDiff > 0) {
    popularityFeedback = popularityDiff <= twentyPercent ? '+' : '++';
  } else {
    popularityFeedback = popularityDiff >= -twentyPercent ? '-' : '--';
  }
  result.popularity = {
    guess: guess.popularity,
    feedback: popularityFeedback
  };

  // Handle rating comparison
  const ratingDiff = guess.lastAppearanceRating - answerCharacter.lastAppearanceRating;
  const ratingFivePercent = answerCharacter.lastAppearanceRating * 0.02;
  const ratingTwentyPercent = answerCharacter.lastAppearanceRating * 0.1;
  let ratingFeedback;
  if (Math.abs(ratingDiff) <= ratingFivePercent) {
    ratingFeedback = '=';
  } else if (ratingDiff > 0) {
    ratingFeedback = ratingDiff <= ratingTwentyPercent ? '+' : '++';
  } else {
    ratingFeedback = ratingDiff >= -ratingTwentyPercent ? '-' : '--';
  }
  result.rating = {
    guess: guess.lastAppearanceRating,
    feedback: ratingFeedback
  };

  // Handle shared appearances
  const sharedAppearances = guess.appearances.filter(appearance => 
    answerCharacter.appearances.includes(appearance)
  );
  result.shared_appearances = {
    first: sharedAppearances[0] || '',
    count: sharedAppearances.length
  };

  // Handle meta tags
  const sharedMetaTags = guess.metaTags.filter(tag => 
    answerCharacter.metaTags.includes(tag)
  );
  result.metaTags = {
    guess: guess.metaTags,
    shared: sharedMetaTags
  };

  // Handle last appearance date comparison
  if (guess.lastAppearanceDate === -1 || answerCharacter.lastAppearanceDate === -1) {
    result.lastAppearanceDate = {
      guess: guess.lastAppearanceDate === -1 ? '?' : guess.lastAppearanceDate,
      feedback: guess.lastAppearanceDate === -1 && answerCharacter.lastAppearanceDate === -1 ? '=' : '?'
    };
  } else {
    const yearDiff = guess.lastAppearanceDate - answerCharacter.lastAppearanceDate;
    let yearFeedback;
    if (yearDiff === 0) {
      yearFeedback = '=';
    } else if (yearDiff > 0) {
      yearFeedback = yearDiff <= 1 ? '+' : '++';
    } else {
      yearFeedback = yearDiff >= -1 ? '-' : '--';
    }
    result.lastAppearanceDate = {
      guess: guess.lastAppearanceDate,
      feedback: yearFeedback
    };
  }

  result.cv = {
    guess: guess.cv,
    feedback: guess.cv === answerCharacter.cv ? 'yes' : 'no'
  };

  return result;
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
