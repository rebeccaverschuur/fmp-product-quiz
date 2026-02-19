// FMP Product Quiz — Unified Logic (Host + Player)
(function () {
  'use strict';

  const socket = io();
  let isHost = false;

  // All screens
  const screens = {
    landing: document.getElementById('landing'),
    waiting: document.getElementById('waiting'),
    pStarting: document.getElementById('pStarting'),
    answer: document.getElementById('answer'),
    answered: document.getElementById('answered'),
    feedback: document.getElementById('feedback'),
    pFinal: document.getElementById('pFinal'),
    lobby: document.getElementById('lobby'),
    hStarting: document.getElementById('hStarting'),
    question: document.getElementById('question'),
    results: document.getElementById('results'),
    leaderboard: document.getElementById('leaderboard'),
    hFinal: document.getElementById('hFinal'),
    noGame: document.getElementById('noGame')
  };

  // Shared elements
  const landing = {
    nameInput: document.getElementById('nameInput'),
    joinBtn: document.getElementById('joinBtn'),
    errorMsg: document.getElementById('errorMsg'),
    hostLink: document.getElementById('hostLink')
  };

  // Player elements
  const player = {
    waitingName: document.getElementById('waitingName'),
    questionCounter: document.getElementById('pQuestionCounter'),
    timer: document.getElementById('pTimer'),
    questionText: document.getElementById('pQuestionText'),
    options: document.getElementById('pOptions'),
    feedbackIcon: document.getElementById('feedbackIcon'),
    feedbackText: document.getElementById('feedbackText'),
    feedbackPoints: document.getElementById('feedbackPoints'),
    feedbackRank: document.getElementById('feedbackRank'),
    feedbackTotal: document.getElementById('feedbackTotal'),
    finalRank: document.getElementById('pFinalRank'),
    finalName: document.getElementById('pFinalName'),
    finalScore: document.getElementById('pFinalScore')
  };

  // Host elements
  const host = {
    quizTitle: document.getElementById('quizTitle'),
    quizSubtitle: document.getElementById('quizSubtitle'),
    playerCount: document.getElementById('playerCount'),
    playersGrid: document.getElementById('playersGrid'),
    startBtn: document.getElementById('startBtn'),
    questionProgress: document.getElementById('questionProgress'),
    questionCounter: document.getElementById('questionCounter'),
    answerCount: document.getElementById('answerCount'),
    answerTotal: document.getElementById('answerTotal'),
    timerProgress: document.getElementById('timerProgress'),
    timerNumber: document.getElementById('timerNumber'),
    questionText: document.getElementById('questionText'),
    optionsGrid: document.getElementById('optionsGrid'),
    resultsQuestionText: document.getElementById('resultsQuestionText'),
    resultsOptions: document.getElementById('resultsOptions'),
    resultsChart: document.getElementById('resultsChart'),
    leaderboardList: document.getElementById('leaderboardList'),
    nextBtn: document.getElementById('nextBtn'),
    podium: document.getElementById('podium'),
    finalScores: document.getElementById('finalScores'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    newGameBtn: document.getElementById('newGameBtn'),
    celebration: document.getElementById('celebration')
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionClasses = ['option-a', 'option-b', 'option-c', 'option-d'];

  let playerName = '';
  let playerTimerInterval = null;
  let hostTimerInterval = null;
  let hasAnswered = false;
  let currentQuestion = null;
  let totalQuestions = 0;

  // ---- Screen management ----

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
  }

  // ---- Landing page ----

  // Join as player
  landing.joinBtn.addEventListener('click', doJoin);
  landing.nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doJoin();
  });

  function doJoin() {
    var name = landing.nameInput.value.trim();
    if (!name) {
      landing.errorMsg.textContent = 'Please enter your name.';
      return;
    }
    landing.errorMsg.textContent = '';
    landing.joinBtn.disabled = true;
    landing.joinBtn.textContent = 'Joining...';
    socket.emit('player:join', { name: name });
  }

  // Switch to host mode
  landing.hostLink.addEventListener('click', function (e) {
    e.preventDefault();
    isHost = true;
    socket.emit('host:create');
  });

  // ---- HOST events ----

  socket.on('host:created', function (data) {
    if (!isHost) return;
    host.quizTitle.textContent = data.title;
    host.quizSubtitle.textContent = data.questionCount + ' questions';
    totalQuestions = data.questionCount;
    showScreen('lobby');
  });

  socket.on('host:playerJoined', function (data) {
    if (!isHost) return;
    host.playerCount.textContent = data.playerCount;
    renderPlayers(data.players);
    host.startBtn.disabled = false;
  });

  socket.on('host:playerLeft', function (data) {
    if (!isHost) return;
    host.playerCount.textContent = data.playerCount;
    renderPlayers(data.players);
    if (data.playerCount === 0) host.startBtn.disabled = true;
  });

  socket.on('host:playerList', function (players) {
    if (!isHost) return;
    host.playerCount.textContent = players.length;
    renderPlayers(players);
    if (players.length > 0) host.startBtn.disabled = false;
  });

  function renderPlayers(players) {
    host.playersGrid.innerHTML = '';
    players.forEach(function (p) {
      var chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.textContent = p.name;
      host.playersGrid.appendChild(chip);
    });
  }

  host.startBtn.addEventListener('click', function () {
    socket.emit('host:start');
  });

  socket.on('host:quizStarting', function () {
    if (!isHost) return;
    showScreen('hStarting');
  });

  socket.on('host:question', function (data) {
    if (!isHost) return;
    currentQuestion = data;
    stopHostTimer();

    // Progress dots
    host.questionProgress.innerHTML = '';
    for (var i = 0; i < data.total; i++) {
      var dot = document.createElement('div');
      dot.className = 'progress-dot';
      if (i < data.index) dot.classList.add('completed');
      if (i === data.index) dot.classList.add('current');
      host.questionProgress.appendChild(dot);
    }

    host.questionCounter.textContent = 'Question ' + (data.index + 1) + ' of ' + data.total;
    host.answerCount.textContent = '0';
    host.answerTotal.textContent = '0';
    host.questionText.textContent = data.question;

    host.optionsGrid.innerHTML = '';
    data.options.forEach(function (opt, i) {
      var block = document.createElement('div');
      block.className = 'option-block ' + optionClasses[i];
      block.innerHTML = '<span class="option-letter">' + optionLetters[i] + '</span>' +
        '<span>' + escapeHtml(opt) + '</span>' +
        '<span class="option-count"></span>';
      host.optionsGrid.appendChild(block);
    });

    showScreen('question');
    startHostTimer(data.timeLimit);
  });

  socket.on('host:answerCount', function (data) {
    if (!isHost) return;
    host.answerCount.textContent = data.count;
    host.answerTotal.textContent = data.total;
  });

  socket.on('host:results', function (data) {
    if (!isHost) return;
    stopHostTimer();
    if (!currentQuestion) return;

    host.resultsQuestionText.textContent = currentQuestion.question;

    host.resultsOptions.innerHTML = '';
    currentQuestion.options.forEach(function (opt, i) {
      var block = document.createElement('div');
      block.className = 'option-block ' + optionClasses[i];
      if (i === data.correct) {
        block.classList.add('correct');
      } else {
        block.classList.add('incorrect');
      }
      block.classList.add('show-count');
      block.innerHTML = '<span class="option-letter">' + optionLetters[i] + '</span>' +
        '<span>' + escapeHtml(opt) + '</span>' +
        '<span class="option-count">' + data.optionCounts[i] + '</span>';
      host.resultsOptions.appendChild(block);
    });

    var maxCount = Math.max.apply(null, data.optionCounts.concat([1]));
    host.resultsChart.innerHTML = '';
    data.optionCounts.forEach(function (count, i) {
      var wrapper = document.createElement('div');
      wrapper.className = 'chart-bar-wrapper';
      var countLabel = document.createElement('div');
      countLabel.className = 'chart-count';
      countLabel.textContent = count;
      var bar = document.createElement('div');
      bar.className = 'chart-bar bar-' + optionLetters[i].toLowerCase();
      bar.style.height = '0%';
      var label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = optionLetters[i];
      wrapper.appendChild(countLabel);
      wrapper.appendChild(bar);
      wrapper.appendChild(label);
      host.resultsChart.appendChild(wrapper);
      requestAnimationFrame(function () {
        setTimeout(function () {
          bar.style.height = (count / maxCount * 100) + '%';
        }, 100 + i * 100);
      });
    });

    showScreen('results');
  });

  socket.on('host:leaderboard', function (data) {
    if (!isHost) return;
    host.leaderboardList.innerHTML = '';

    data.leaderboard.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'leaderboard-item';
      if (i === 0) li.classList.add('top-1');
      if (i === 1) li.classList.add('top-2');
      if (i === 2) li.classList.add('top-3');
      li.innerHTML =
        '<div class="leaderboard-rank">' + p.rank + '</div>' +
        '<div class="leaderboard-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="leaderboard-score">' + p.score.toLocaleString() + '</div>';
      host.leaderboardList.appendChild(li);
    });

    if (data.questionIndex >= data.totalQuestions - 1) {
      host.nextBtn.textContent = 'Show Final Results';
    } else {
      host.nextBtn.textContent = 'Next Question';
    }

    showScreen('leaderboard');
  });

  host.nextBtn.addEventListener('click', function () {
    socket.emit('host:next');
  });

  socket.on('host:final', function (data) {
    if (!isHost) return;
    var lb = data.leaderboard;

    host.podium.innerHTML = '';
    var displayOrder = [
      { index: 1, place: 'second', label: '2nd' },
      { index: 0, place: 'first', label: '1st' },
      { index: 2, place: 'third', label: '3rd' }
    ];

    displayOrder.forEach(function (item) {
      var p = lb[item.index];
      if (!p) return;
      var div = document.createElement('div');
      div.className = 'podium-place';
      div.innerHTML =
        '<div class="podium-name">' + escapeHtml(p.name) + '</div>' +
        '<div class="podium-score">' + p.score.toLocaleString() + ' pts</div>' +
        '<div class="podium-block ' + item.place + '">' + item.label + '</div>';
      host.podium.appendChild(div);
    });

    host.finalScores.innerHTML = '';
    lb.forEach(function (p, i) {
      if (i < 3) return;
      var li = document.createElement('li');
      li.className = 'final-score-item';
      li.innerHTML =
        '<span class="rank">' + p.rank + '</span>' +
        '<span class="name">' + escapeHtml(p.name) + '</span>' +
        '<span class="score">' + p.score.toLocaleString() + '</span>';
      host.finalScores.appendChild(li);
    });

    createCelebration();
    showScreen('hFinal');
  });

  host.playAgainBtn.addEventListener('click', function () {
    socket.emit('host:playAgain');
  });

  host.newGameBtn.addEventListener('click', function () {
    socket.emit('host:newGame');
  });

  socket.on('host:reset', function (data) {
    if (!isHost) return;
    host.quizTitle.textContent = data.title;
    host.quizSubtitle.textContent = data.questionCount + ' questions';
    totalQuestions = data.questionCount;
    renderPlayers(data.players);
    host.playerCount.textContent = data.players.length;
    host.startBtn.disabled = data.players.length === 0;
    host.celebration.innerHTML = '';
    showScreen('lobby');
  });

  socket.on('host:error', function (data) {
    if (isHost) alert(data.message);
  });

  // Host spacebar to skip timer
  document.addEventListener('keydown', function (e) {
    if (isHost && e.code === 'Space' && screens.question.classList.contains('active')) {
      e.preventDefault();
      socket.emit('host:skipTimer');
    }
  });

  // ---- PLAYER events ----

  socket.on('player:joined', function (data) {
    if (isHost) return;
    playerName = data.name;
    player.waitingName.textContent = playerName;
    showScreen('waiting');
  });

  socket.on('player:error', function (data) {
    if (isHost) return;
    landing.errorMsg.textContent = data.message;
    landing.joinBtn.disabled = false;
    landing.joinBtn.textContent = 'Join Quiz';
  });

  socket.on('player:quizStarting', function () {
    if (isHost) return;
    showScreen('pStarting');
  });

  socket.on('player:question', function (data) {
    if (isHost) return;
    hasAnswered = false;
    stopPlayerTimer();

    player.questionCounter.textContent = 'Question ' + (data.index + 1) + ' of ' + data.total;
    player.questionText.textContent = data.question;

    player.options.innerHTML = '';
    data.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.className = 'player-option-btn ' + optionClasses[i];
      btn.innerHTML = '<span class="letter">' + optionLetters[i] + '</span>' + escapeHtml(opt);
      btn.addEventListener('click', function () { selectAnswer(i, btn); });
      player.options.appendChild(btn);
    });

    showScreen('answer');
    startPlayerTimer(data.timeLimit);
  });

  function selectAnswer(option, btn) {
    if (hasAnswered) return;
    hasAnswered = true;
    var buttons = player.options.querySelectorAll('.player-option-btn');
    buttons.forEach(function (b) {
      b.disabled = true;
      if (b === btn) b.classList.add('selected');
    });
    socket.emit('player:answer', { option: option });
  }

  socket.on('player:answerReceived', function () {
    if (isHost) return;
    stopPlayerTimer();
    showScreen('answered');
  });

  socket.on('player:feedback', function (data) {
    if (isHost) return;
    stopPlayerTimer();

    if (data.correct) {
      player.feedbackIcon.textContent = '\u2713';
      player.feedbackIcon.style.color = 'var(--correct-green)';
      player.feedbackText.textContent = 'Correct!';
      player.feedbackText.className = 'feedback-text correct';
      player.feedbackPoints.textContent = '+' + data.points.toLocaleString() + ' pts';
    } else {
      player.feedbackIcon.textContent = '\u2717';
      player.feedbackIcon.style.color = 'var(--incorrect-red)';
      player.feedbackText.textContent = 'Incorrect';
      player.feedbackText.className = 'feedback-text incorrect';
      player.feedbackPoints.textContent = '0 pts';
    }

    player.feedbackRank.textContent = 'Rank: ' + data.rank + ' of ' + data.totalPlayers;
    player.feedbackTotal.textContent = 'Total score: ' + data.totalScore.toLocaleString();
    showScreen('feedback');
  });

  socket.on('player:final', function (data) {
    if (isHost) return;
    stopPlayerTimer();
    var suffix = getOrdinalSuffix(data.rank);
    player.finalRank.textContent = data.rank + suffix;
    player.finalName.textContent = data.name;
    player.finalScore.textContent = data.score.toLocaleString() + ' points';
    showScreen('pFinal');
  });

  socket.on('player:reset', function () {
    if (isHost) return;
    showScreen('waiting');
  });

  socket.on('player:gameEnded', function () {
    if (isHost) return;
    showScreen('noGame');
  });

  // ---- Timers ----

  function startHostTimer(seconds) {
    var remaining = seconds;
    var circumference = 2 * Math.PI * 50;
    host.timerProgress.style.strokeDasharray = circumference;
    host.timerProgress.style.strokeDashoffset = '0';
    host.timerProgress.classList.remove('warning');
    host.timerNumber.classList.remove('warning');
    host.timerNumber.textContent = remaining;

    hostTimerInterval = setInterval(function () {
      remaining--;
      if (remaining < 0) remaining = 0;
      host.timerNumber.textContent = remaining;
      var offset = circumference * (1 - remaining / seconds);
      host.timerProgress.style.strokeDashoffset = offset;
      if (remaining <= 5) {
        host.timerProgress.classList.add('warning');
        host.timerNumber.classList.add('warning');
      }
      if (remaining <= 0) stopHostTimer();
    }, 1000);
  }

  function stopHostTimer() {
    if (hostTimerInterval) {
      clearInterval(hostTimerInterval);
      hostTimerInterval = null;
    }
  }

  function startPlayerTimer(seconds) {
    var remaining = seconds;
    player.timer.textContent = remaining;
    player.timer.classList.remove('warning');

    playerTimerInterval = setInterval(function () {
      remaining--;
      if (remaining < 0) remaining = 0;
      player.timer.textContent = remaining;
      if (remaining <= 5) player.timer.classList.add('warning');
      if (remaining <= 0) {
        stopPlayerTimer();
        if (!hasAnswered) {
          var buttons = player.options.querySelectorAll('.player-option-btn');
          buttons.forEach(function (b) { b.disabled = true; });
        }
      }
    }, 1000);
  }

  function stopPlayerTimer() {
    if (playerTimerInterval) {
      clearInterval(playerTimerInterval);
      playerTimerInterval = null;
    }
  }

  // ---- Helpers ----

  function createCelebration() {
    host.celebration.innerHTML = '';
    var colours = ['#FFD700', '#F37021', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];
    for (var i = 0; i < 60; i++) {
      var sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.left = Math.random() * 100 + '%';
      sparkle.style.backgroundColor = colours[Math.floor(Math.random() * colours.length)];
      sparkle.style.animationDelay = Math.random() * 2 + 's';
      sparkle.style.animationDuration = (2 + Math.random() * 2) + 's';
      sparkle.style.width = (4 + Math.random() * 8) + 'px';
      sparkle.style.height = sparkle.style.width;
      host.celebration.appendChild(sparkle);
    }
  }

  function getOrdinalSuffix(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Focus name input on load
  landing.nameInput.focus();
})();
