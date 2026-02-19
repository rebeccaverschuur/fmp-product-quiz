const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Load questions
function loadQuestions() {
  const filePath = path.join(__dirname, 'questions.json');
  if (!fs.existsSync(filePath)) {
    console.error('questions.json not found. Copy questions-example.json to questions.json to get started.');
    process.exit(1);
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

// Generate a 4-digit room code
function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Game state
let game = null;

function createGame() {
  const quiz = loadQuestions();
  return {
    roomCode: generateRoomCode(),
    quiz: quiz,
    state: 'lobby', // lobby, question, results, leaderboard, final
    currentQuestion: -1,
    players: new Map(), // socketId -> { name, score, answers[] }
    answers: new Map(), // socketId -> { option, timestamp }
    questionStartTime: null,
    questionTimer: null,
    hostSocket: null
  };
}

function getPlayerList() {
  const players = [];
  for (const [id, p] of game.players) {
    players.push({ id, name: p.name, score: p.score });
  }
  return players;
}

function getLeaderboard() {
  const players = getPlayerList();
  players.sort((a, b) => b.score - a.score);
  return players.map((p, i) => ({ ...p, rank: i + 1 }));
}

function calculateScore(timeTaken, timeLimit) {
  const basePoints = 1000;
  const maxBonus = 500;
  const fraction = Math.max(0, 1 - (timeTaken / timeLimit));
  const bonus = Math.round(maxBonus * fraction);
  return basePoints + bonus;
}

// Socket.IO events
io.on('connection', (socket) => {

  // Host creates/joins a game
  socket.on('host:create', () => {
    game = createGame();
    game.hostSocket = socket.id;
    socket.join('host');
    socket.emit('host:created', {
      roomCode: game.roomCode,
      title: game.quiz.title,
      questionCount: game.quiz.questions.length
    });
    console.log(`Game created with room code: ${game.roomCode}`);
  });

  // Host reconnects
  socket.on('host:reconnect', () => {
    if (!game) {
      socket.emit('host:error', { message: 'No active game. Please create a new one.' });
      return;
    }
    game.hostSocket = socket.id;
    socket.join('host');
    socket.emit('host:created', {
      roomCode: game.roomCode,
      title: game.quiz.title,
      questionCount: game.quiz.questions.length
    });
    socket.emit('host:playerList', getPlayerList());
    console.log('Host reconnected');
  });

  // Player joins
  socket.on('player:join', (data) => {
    if (!game) {
      socket.emit('player:error', { message: 'No quiz session is active. Ask the host to start one.' });
      return;
    }
    if (game.state !== 'lobby') {
      socket.emit('player:error', { message: 'Quiz has already started. Wait for the next round.' });
      return;
    }

    const name = (data.name || '').trim();
    if (!name) {
      socket.emit('player:error', { message: 'Please enter a name.' });
      return;
    }
    if (name.length > 20) {
      socket.emit('player:error', { message: 'Name must be 20 characters or less.' });
      return;
    }

    // Check for duplicate names
    for (const [, p] of game.players) {
      if (p.name.toLowerCase() === name.toLowerCase()) {
        socket.emit('player:error', { message: 'That name is already taken. Choose another.' });
        return;
      }
    }

    game.players.set(socket.id, {
      name: name,
      score: 0,
      answers: []
    });

    socket.join('players');
    socket.emit('player:joined', { name: name, playerCount: game.players.size });

    // Notify host
    io.to('host').emit('host:playerJoined', {
      name: name,
      playerCount: game.players.size,
      players: getPlayerList()
    });

    console.log(`Player joined: ${name} (${game.players.size} players)`);
  });

  // Host starts quiz
  socket.on('host:start', () => {
    if (!game || game.state !== 'lobby') return;
    if (game.players.size === 0) {
      socket.emit('host:error', { message: 'Need at least 1 player to start.' });
      return;
    }
    game.state = 'starting';
    io.to('host').emit('host:quizStarting');
    io.to('players').emit('player:quizStarting');

    // Brief countdown before first question
    setTimeout(() => {
      sendNextQuestion();
    }, 3000);
  });

  // Host advances to next question
  socket.on('host:next', () => {
    if (!game) return;
    if (game.state === 'leaderboard') {
      sendNextQuestion();
    }
  });

  // Host skips to results (end timer early)
  socket.on('host:skipTimer', () => {
    if (!game || game.state !== 'question') return;
    if (game.questionTimer) {
      clearTimeout(game.questionTimer);
      game.questionTimer = null;
    }
    endQuestion();
  });

  // Player submits answer
  socket.on('player:answer', (data) => {
    if (!game || game.state !== 'question') return;
    if (!game.players.has(socket.id)) return;
    if (game.answers.has(socket.id)) return; // Already answered

    const timeTaken = (Date.now() - game.questionStartTime) / 1000;
    game.answers.set(socket.id, {
      option: data.option,
      timeTaken: timeTaken
    });

    socket.emit('player:answerReceived');

    // Notify host of answer count
    io.to('host').emit('host:answerCount', {
      count: game.answers.size,
      total: game.players.size
    });

    // If all players have answered, end the question early
    if (game.answers.size >= game.players.size) {
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = null;
      }
      // Small delay so the last player sees their answer registered
      setTimeout(() => endQuestion(), 500);
    }
  });

  // Host starts a new quiz (play again)
  socket.on('host:playAgain', () => {
    if (!game) return;
    // Reset scores and state but keep players
    game.currentQuestion = -1;
    game.state = 'lobby';
    game.quiz = loadQuestions(); // Reload in case file changed
    for (const [, p] of game.players) {
      p.score = 0;
      p.answers = [];
    }
    io.to('host').emit('host:reset', {
      roomCode: game.roomCode,
      title: game.quiz.title,
      questionCount: game.quiz.questions.length,
      players: getPlayerList()
    });
    io.to('players').emit('player:reset');
  });

  // Host creates a brand new game
  socket.on('host:newGame', () => {
    game = createGame();
    game.hostSocket = socket.id;
    // Disconnect all players from rooms
    io.to('players').emit('player:gameEnded');
    socket.emit('host:created', {
      roomCode: game.roomCode,
      title: game.quiz.title,
      questionCount: game.quiz.questions.length
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (!game) return;
    if (game.players.has(socket.id)) {
      const player = game.players.get(socket.id);
      console.log(`Player disconnected: ${player.name}`);
      // Don't remove during active quiz — keep their score
      if (game.state === 'lobby') {
        game.players.delete(socket.id);
        io.to('host').emit('host:playerLeft', {
          name: player.name,
          playerCount: game.players.size,
          players: getPlayerList()
        });
      }
    }
  });
});

function sendNextQuestion() {
  if (!game) return;
  game.currentQuestion++;

  if (game.currentQuestion >= game.quiz.questions.length) {
    // Quiz is over
    game.state = 'final';
    const leaderboard = getLeaderboard();
    io.to('host').emit('host:final', { leaderboard });
    // Send each player their personal result
    for (const [socketId, player] of game.players) {
      const rank = leaderboard.findIndex(p => p.id === socketId) + 1;
      io.to(socketId).emit('player:final', {
        name: player.name,
        score: player.score,
        rank: rank,
        total: game.players.size
      });
    }
    return;
  }

  const q = game.quiz.questions[game.currentQuestion];
  const timeLimit = q.time || game.quiz.timePerQuestion || 15;

  game.state = 'question';
  game.answers = new Map();
  game.questionStartTime = Date.now();

  // Send question to host (with correct answer)
  io.to('host').emit('host:question', {
    index: game.currentQuestion,
    total: game.quiz.questions.length,
    question: q.question,
    options: q.options,
    correct: q.correct,
    timeLimit: timeLimit
  });

  // Send question to players (without correct answer)
  io.to('players').emit('player:question', {
    index: game.currentQuestion,
    total: game.quiz.questions.length,
    question: q.question,
    options: q.options,
    timeLimit: timeLimit
  });

  // Set timer
  game.questionTimer = setTimeout(() => {
    endQuestion();
  }, timeLimit * 1000);
}

function endQuestion() {
  if (!game || game.state !== 'question') return;
  game.state = 'results';

  const q = game.quiz.questions[game.currentQuestion];
  const timeLimit = q.time || game.quiz.timePerQuestion || 15;
  const correctIndex = q.correct;

  // Tally results
  const optionCounts = [0, 0, 0, 0];
  for (const [socketId, answer] of game.answers) {
    if (answer.option >= 0 && answer.option < 4) {
      optionCounts[answer.option]++;
    }
    const player = game.players.get(socketId);
    if (!player) continue;

    if (answer.option === correctIndex) {
      const points = calculateScore(answer.timeTaken, timeLimit);
      player.score += points;
      player.answers.push({ correct: true, points });
    } else {
      player.answers.push({ correct: false, points: 0 });
    }
  }

  // Players who didn't answer get 0
  for (const [socketId] of game.players) {
    if (!game.answers.has(socketId)) {
      const player = game.players.get(socketId);
      player.answers.push({ correct: false, points: 0 });
    }
  }

  // Send results to host
  io.to('host').emit('host:results', {
    correct: correctIndex,
    optionCounts: optionCounts,
    totalAnswers: game.answers.size,
    totalPlayers: game.players.size
  });

  // Send personal feedback to each player
  for (const [socketId, player] of game.players) {
    const answer = game.answers.get(socketId);
    const lastAnswer = player.answers[player.answers.length - 1];
    const leaderboard = getLeaderboard();
    const rank = leaderboard.findIndex(p => p.id === socketId) + 1;

    io.to(socketId).emit('player:feedback', {
      correct: lastAnswer.correct,
      points: lastAnswer.points,
      totalScore: player.score,
      rank: rank,
      totalPlayers: game.players.size,
      correctOption: correctIndex,
      selectedOption: answer ? answer.option : -1
    });
  }

  // After a pause, show leaderboard
  setTimeout(() => {
    if (!game) return;
    game.state = 'leaderboard';
    const leaderboard = getLeaderboard();
    io.to('host').emit('host:leaderboard', {
      leaderboard: leaderboard,
      questionIndex: game.currentQuestion,
      totalQuestions: game.quiz.questions.length
    });
  }, 4000);
}

// Start server
server.listen(PORT, () => {
  console.log(`\n  FMP Product Quiz Server`);
  console.log(`  =======================`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  \n  Press Ctrl+C to stop.\n`);
});
