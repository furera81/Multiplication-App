(function () {
  'use strict';

  // ===== State =====
  const state = {
    operation: null,
    difficulty: 'easy',
    totalQuestions: 10,
    currentQuestion: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    mistakes: [],
    currentAnswer: null,
    answered: false,
    questions: [],
  };

  // ===== Difficulty ranges =====
  const RANGES = {
    addition: {
      easy:   { min: 1, max: 20 },
      medium: { min: 10, max: 100 },
      hard:   { min: 50, max: 999 },
    },
    subtraction: {
      easy:   { min: 1, max: 20 },
      medium: { min: 10, max: 100 },
      hard:   { min: 50, max: 999 },
    },
    multiplication: {
      easy:   { min: 1, max: 10 },
      medium: { min: 2, max: 12 },
      hard:   { min: 5, max: 20 },
    },
    division: {
      easy:   { min: 1, max: 10 },
      medium: { min: 2, max: 12 },
      hard:   { min: 3, max: 20 },
    },
  };

  const ENCOURAGEMENTS = [
    'Awesome!', 'Great job!', 'You rock!', 'Superstar!',
    'Brilliant!', 'Nice one!', 'Wow!', 'Keep it up!',
    'Amazing!', 'Fantastic!', 'Perfect!', 'Nailed it!',
  ];

  const WRONG_MESSAGES = [
    'Not quite!', 'Try harder next time!', 'Almost!',
    'Oops!', 'So close!', 'Keep going!',
  ];

  // ===== DOM refs =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    start: $('#screen-start'),
    game: $('#screen-game'),
    results: $('#screen-results'),
  };

  const els = {
    opBtns: $$('.op-btn'),
    diffBtns: $$('.diff-btn'),
    countBtns: $$('.count-btn'),
    btnStart: $('#btn-start'),
    btnQuit: $('#btn-quit'),
    btnPlayAgain: $('#btn-play-again'),
    btnHome: $('#btn-home'),
    score: $('#score'),
    progress: $('#progress'),
    streak: $('#streak'),
    progressBar: $('#progress-bar'),
    question: $('#question'),
    feedbackArea: $('#feedback-area'),
    answerOptions: $('#answer-options'),
    resultsEmoji: $('#results-emoji'),
    resultsTitle: $('#results-title'),
    resultsSubtitle: $('#results-subtitle'),
    resultScore: $('#result-score'),
    resultCorrect: $('#result-correct'),
    resultAccuracy: $('#result-accuracy'),
    resultBestStreak: $('#result-best-streak'),
    resultsReview: $('#results-review'),
    mistakesList: $('#mistakes-list'),
  };

  // ===== Helpers =====
  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ===== Question Generation =====
  function generateQuestion(op) {
    const actualOp = op === 'mixed'
      ? pickRandom(['addition', 'subtraction', 'multiplication', 'division'])
      : op;

    const range = RANGES[actualOp][state.difficulty];
    let a, b, answer, symbol, questionText;

    switch (actualOp) {
      case 'addition':
        a = rand(range.min, range.max);
        b = rand(range.min, range.max);
        answer = a + b;
        symbol = '+';
        questionText = `${a} + ${b} = ?`;
        break;

      case 'subtraction':
        a = rand(range.min, range.max);
        b = rand(range.min, a); // ensure non-negative result
        answer = a - b;
        symbol = '−';
        questionText = `${a} − ${b} = ?`;
        break;

      case 'multiplication':
        a = rand(range.min, range.max);
        b = rand(range.min, range.max);
        answer = a * b;
        symbol = '×';
        questionText = `${a} × ${b} = ?`;
        break;

      case 'division':
        b = rand(range.min, range.max);
        answer = rand(range.min, range.max);
        a = b * answer; // ensure clean division
        symbol = '÷';
        questionText = `${a} ÷ ${b} = ?`;
        break;
    }

    return { a, b, answer, symbol, questionText, operation: actualOp };
  }

  function generateWrongAnswers(correctAnswer, operation) {
    const wrongs = new Set();
    const maxAttempts = 100;
    let attempts = 0;

    while (wrongs.size < 3 && attempts < maxAttempts) {
      attempts++;
      let wrong;
      const offset = rand(1, Math.max(5, Math.abs(Math.floor(correctAnswer * 0.3))));
      if (Math.random() > 0.5) {
        wrong = correctAnswer + offset;
      } else {
        wrong = correctAnswer - offset;
      }
      // Don't allow negative answers for easy difficulty or very small values
      if (wrong < 0) wrong = correctAnswer + rand(1, 10);
      if (wrong !== correctAnswer && wrong >= 0) {
        wrongs.add(wrong);
      }
    }

    // Fallback if we couldn't generate enough
    while (wrongs.size < 3) {
      wrongs.add(correctAnswer + wrongs.size + 1);
    }

    return [...wrongs];
  }

  // ===== Screen Navigation =====
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ===== Game Logic =====
  function startGame() {
    state.currentQuestion = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correctCount = 0;
    state.mistakes = [];
    state.answered = false;
    state.questions = [];

    // Pre-generate all questions
    for (let i = 0; i < state.totalQuestions; i++) {
      state.questions.push(generateQuestion(state.operation));
    }

    updateGameUI();
    showScreen('game');
    showQuestion();
  }

  function showQuestion() {
    state.answered = false;
    const q = state.questions[state.currentQuestion];
    els.question.textContent = q.questionText;
    els.feedbackArea.textContent = '';
    els.feedbackArea.className = 'feedback-area';

    // Generate answer buttons
    const wrongAnswers = generateWrongAnswers(q.answer, q.operation);
    const allAnswers = shuffle([q.answer, ...wrongAnswers]);

    els.answerOptions.innerHTML = '';
    allAnswers.forEach((ans) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = ans;
      btn.addEventListener('click', () => handleAnswer(ans, btn));
      els.answerOptions.appendChild(btn);
    });

    state.currentAnswer = q.answer;
    updateGameUI();
  }

  function handleAnswer(selected, btnEl) {
    if (state.answered) return;
    state.answered = true;

    const q = state.questions[state.currentQuestion];
    const isCorrect = selected === q.answer;

    // Highlight buttons
    const allBtns = els.answerOptions.querySelectorAll('.answer-btn');
    allBtns.forEach((btn) => {
      btn.style.pointerEvents = 'none';
      if (parseInt(btn.textContent) === q.answer) {
        btn.classList.add('correct');
      }
    });

    if (isCorrect) {
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      state.correctCount++;

      // Score: base 10 + streak bonus
      const points = 10 + Math.min(state.streak, 10) * 2;
      state.score += points;

      els.feedbackArea.textContent = pickRandom(ENCOURAGEMENTS);
      els.feedbackArea.className = 'feedback-area feedback-correct';

      // Animate score
      els.score.classList.add('score-pop');
      setTimeout(() => els.score.classList.remove('score-pop'), 300);

      // Animate streak
      if (state.streak >= 3) {
        els.streak.classList.add('streak-fire');
        setTimeout(() => els.streak.classList.remove('streak-fire'), 300);
      }
    } else {
      btnEl.classList.add('wrong');
      state.streak = 0;

      state.mistakes.push({
        question: q.questionText,
        yourAnswer: selected,
        correctAnswer: q.answer,
      });

      els.feedbackArea.textContent = pickRandom(WRONG_MESSAGES);
      els.feedbackArea.className = 'feedback-area feedback-wrong';
    }

    updateGameUI();

    // Move to next question after delay
    setTimeout(() => {
      state.currentQuestion++;
      if (state.currentQuestion >= state.totalQuestions) {
        showResults();
      } else {
        showQuestion();
      }
    }, 1200);
  }

  function updateGameUI() {
    els.score.textContent = state.score;
    els.progress.textContent = `${state.currentQuestion + 1}/${state.totalQuestions}`;
    els.streak.textContent = state.streak;
    els.progressBar.style.width = `${((state.currentQuestion) / state.totalQuestions) * 100}%`;
  }

  // ===== Results =====
  function showResults() {
    const accuracy = Math.round((state.correctCount / state.totalQuestions) * 100);

    // Set emoji and title based on performance
    if (accuracy === 100) {
      els.resultsEmoji.textContent = '\u{1F3C6}';
      els.resultsTitle.textContent = 'PERFECT!';
      els.resultsSubtitle.textContent = 'You got every single one right!';
    } else if (accuracy >= 80) {
      els.resultsEmoji.textContent = '\u{1F31F}';
      els.resultsTitle.textContent = 'Amazing!';
      els.resultsSubtitle.textContent = 'You are a math superstar!';
    } else if (accuracy >= 60) {
      els.resultsEmoji.textContent = '\u{1F44D}';
      els.resultsTitle.textContent = 'Good Job!';
      els.resultsSubtitle.textContent = 'Keep practicing and you\'ll be even better!';
    } else if (accuracy >= 40) {
      els.resultsEmoji.textContent = '\u{1F4AA}';
      els.resultsTitle.textContent = 'Nice Try!';
      els.resultsSubtitle.textContent = 'Practice makes perfect!';
    } else {
      els.resultsEmoji.textContent = '\u{1F917}';
      els.resultsTitle.textContent = 'Keep Going!';
      els.resultsSubtitle.textContent = 'Every try makes you stronger!';
    }

    els.resultScore.textContent = state.score;
    els.resultCorrect.textContent = `${state.correctCount}/${state.totalQuestions}`;
    els.resultAccuracy.textContent = `${accuracy}%`;
    els.resultBestStreak.textContent = state.bestStreak;

    // Show mistakes
    if (state.mistakes.length > 0) {
      els.resultsReview.classList.add('has-mistakes');
      els.mistakesList.innerHTML = '';
      state.mistakes.forEach((m) => {
        const item = document.createElement('div');
        item.className = 'mistake-item';
        item.innerHTML = `
          <span class="mistake-question">${escapeHtml(m.question.replace(' = ?', ''))}</span>
          <span class="mistake-answer">
            You: ${escapeHtml(String(m.yourAnswer))} |
            <span class="correct-ans">Answer: ${escapeHtml(String(m.correctAnswer))}</span>
          </span>
        `;
        els.mistakesList.appendChild(item);
      });
    } else {
      els.resultsReview.classList.remove('has-mistakes');
    }

    showScreen('results');

    // Confetti for good scores
    if (accuracy >= 80) {
      launchConfetti();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Simple confetti =====
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#e17055', '#00b894', '#a29bfe'];
    const particles = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: rand(6, 12),
        h: rand(4, 8),
        color: pickRandom(colors),
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let frame = 0;
    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.vy += 0.05;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frame < 150) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    animate();
  }

  // ===== Event Listeners =====

  // Operation selection
  els.opBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.opBtns.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.operation = btn.dataset.op;
      els.btnStart.disabled = false;
    });
  });

  // Difficulty selection
  els.diffBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.diffBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.diff;
    });
  });

  // Question count selection
  els.countBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.countBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.totalQuestions = parseInt(btn.dataset.count);
    });
  });

  // Start game
  els.btnStart.addEventListener('click', startGame);

  // Quit game
  els.btnQuit.addEventListener('click', () => {
    showScreen('start');
  });

  // Play again (same settings)
  els.btnPlayAgain.addEventListener('click', startGame);

  // Home
  els.btnHome.addEventListener('click', () => {
    showScreen('start');
  });

  // ===== PWA Service Worker Registration =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Service worker registration failed — app still works fine
      });
    });
  }
})();
