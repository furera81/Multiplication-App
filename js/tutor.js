(function () {
  'use strict';

  // ===== Constants =====
  const STORAGE_KEYS = {
    QUIZ:    'mathtutor_quiz',
    TROPHIES:'mathtutor_trophies',
    HISTORY: 'mathtutor_history',
  };

  // ===== Trophy Definitions =====
  const TROPHY_DEFS = [
    {
      id: 'first_quiz',
      icon: '🎓',
      name: 'First Steps',
      desc: 'Complete your first quiz',
      check: (hist) => hist.length >= 1,
    },
    {
      id: 'perfect_score',
      icon: '🏆',
      name: 'Perfect Score',
      desc: 'Get 100% on a quiz',
      check: (hist) => hist.some(h => h.accuracy === 100),
    },
    {
      id: 'score_80',
      icon: '⭐',
      name: 'Star Pupil',
      desc: 'Score 80% or higher',
      check: (hist) => hist.some(h => h.accuracy >= 80),
    },
    {
      id: 'score_90',
      icon: '🌟',
      name: 'Superstar',
      desc: 'Score 90% or higher',
      check: (hist) => hist.some(h => h.accuracy >= 90),
    },
    {
      id: 'three_quizzes',
      icon: '📚',
      name: 'Bookworm',
      desc: 'Complete 3 quizzes',
      check: (hist) => hist.length >= 3,
    },
    {
      id: 'ten_quizzes',
      icon: '🎒',
      name: 'Scholar',
      desc: 'Complete 10 quizzes',
      check: (hist) => hist.length >= 10,
    },
    {
      id: 'streak_5',
      icon: '🔥',
      name: 'On Fire',
      desc: 'Get 5 correct in a row',
      check: (hist) => hist.some(h => h.bestStreak >= 5),
    },
    {
      id: 'streak_10',
      icon: '💥',
      name: 'Unstoppable',
      desc: 'Get 10 correct in a row',
      check: (hist) => hist.some(h => h.bestStreak >= 10),
    },
    {
      id: 'fractions_ace',
      icon: '🍕',
      name: 'Fraction Master',
      desc: 'Ace a Fractions question',
      check: (hist) => hist.some(h => h.topics && h.topics.includes('Fractions')),
    },
    {
      id: 'word_ace',
      icon: '📖',
      name: 'Word Wizard',
      desc: 'Ace a Word Problems question',
      check: (hist) => hist.some(h => h.topics && h.topics.includes('Word Problems')),
    },
    {
      id: 'geo_ace',
      icon: '📐',
      name: 'Shape Shifter',
      desc: 'Ace a Geometry question',
      check: (hist) => hist.some(h => h.topics && h.topics.includes('Geometry')),
    },
    {
      id: 'three_perfect',
      icon: '💎',
      name: 'Diamond Mind',
      desc: 'Get 3 perfect scores',
      check: (hist) => hist.filter(h => h.accuracy === 100).length >= 3,
    },
    {
      id: 'comeback',
      icon: '💪',
      name: 'Comeback Kid',
      desc: 'Finish strong after getting the 1st question wrong',
      check: (hist) => hist.some(h => h.firstWrong && h.accuracy >= 70),
    },
    {
      id: 'speed_demon',
      icon: '⚡',
      name: 'Speed Demon',
      desc: 'Complete a quiz in under 3 minutes',
      check: (hist) => hist.some(h => h.timeSec < 180),
    },
    {
      id: 'all_topics',
      icon: '🧠',
      name: 'All-Rounder',
      desc: 'Complete quizzes covering all 3 topic types',
      check: (hist) => {
        const allTopics = new Set(hist.flatMap(h => h.topics || []));
        return allTopics.has('Fractions') && allTopics.has('Word Problems') && allTopics.has('Geometry');
      },
    },
  ];

  // ===== Encouragement Messages =====
  const PRAISE   = ['Awesome!','Great job!','You rock!','Brilliant!','Perfect!','Nailed it!','Superstar!','Amazing!'];
  const WRONG_MSG= ['Not quite!','Almost!','Oops!','So close!','Keep going!','Try again!'];

  // ===== State =====
  const state = {
    quiz: null,          // { title, questions }
    current: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    mistakes: [],
    answered: false,
    startTime: 0,
    firstWrongQ: false,
    seenTopics: new Set(),
  };

  // ===== Storage helpers =====
  function saveLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function loadLS(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (_) { return null; }
  }

  // ===== Trophy logic =====
  function loadTrophies() {
    return loadLS(STORAGE_KEYS.TROPHIES) || {};
  }

  function loadHistory() {
    return loadLS(STORAGE_KEYS.HISTORY) || [];
  }

  function checkNewTrophies(history, prevTrophies) {
    const newlyUnlocked = [];
    TROPHY_DEFS.forEach(def => {
      if (!prevTrophies[def.id] && def.check(history)) {
        newlyUnlocked.push(def);
      }
    });
    return newlyUnlocked;
  }

  function saveTrophies(unlocked) {
    saveLS(STORAGE_KEYS.TROPHIES, unlocked);
  }

  // ===== DOM =====
  const $ = (id) => document.getElementById(id);

  const screens = {
    home:    $('screen-home'),
    quiz:    $('screen-quiz'),
    results: $('screen-results'),
    trophies:$('screen-trophies'),
    teacher: $('screen-teacher'),
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo(0, 0);
  }

  // ===== Home Screen =====
  function renderHome() {
    const quiz = loadLS(STORAGE_KEYS.QUIZ);
    const btnStart = $('btn-start-quiz');

    if (quiz && quiz.questions && quiz.questions.length) {
      $('week-title').textContent = quiz.title || 'Weekly Quiz';
      $('week-desc').textContent  = `${quiz.questions.length} questions ready for you!`;

      const topics = [...new Set(quiz.questions.map(q => q.topic).filter(Boolean))];
      const meta = $('week-meta');
      meta.innerHTML = '';
      topics.forEach(t => {
        const tag = document.createElement('span');
        tag.className = 'week-meta-tag';
        tag.textContent = t;
        meta.appendChild(tag);
      });
      const qTag = document.createElement('span');
      qTag.className = 'week-meta-tag';
      qTag.textContent = `${quiz.questions.length} Questions`;
      meta.appendChild(qTag);

      btnStart.disabled = false;
    } else {
      $('week-title').textContent = 'No quiz loaded yet';
      $('week-desc').textContent  = 'Ask your teacher to load this week\'s questions.';
      $('week-meta').innerHTML    = '';
      btnStart.disabled = true;
    }
    showScreen('home');
  }

  // ===== Quiz =====
  function startQuiz() {
    const quiz = loadLS(STORAGE_KEYS.QUIZ);
    if (!quiz || !quiz.questions.length) return;

    state.quiz = quiz;
    state.current = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.correct = 0;
    state.mistakes = [];
    state.answered = false;
    state.startTime = Date.now();
    state.firstWrongQ = false;
    state.seenTopics = new Set();

    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.quiz.questions[state.current];
    state.answered = false;

    // Header stats
    const total = state.quiz.questions.length;
    $('q-progress').textContent = `${state.current + 1}/${total}`;
    $('q-score').textContent    = state.score;
    $('q-streak').textContent   = `🔥${state.streak}`;
    $('q-progress-bar').style.width = `${(state.current / total) * 100}%`;

    // Topic badge
    $('q-topic-badge').textContent = q.topic || 'Question';

    // Feedback reset
    const fb = $('q-feedback');
    fb.textContent = '';
    fb.className = 'q-feedback';

    // Question text
    $('q-question').textContent = q.q;

    // Choices (shuffle)
    const choices = shuffleArr([...q.choices]);
    const choiceWrap = $('q-choices');
    choiceWrap.innerHTML = '';
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c;
      btn.addEventListener('click', () => handleChoice(c, btn, q));
      choiceWrap.appendChild(btn);
    });

    // Hide hint area
    const hintWrap = $('q-hint-wrap');
    hintWrap.classList.add('hidden');
    $('q-hint-text').classList.add('hidden');
    $('btn-next').classList.add('hidden');
  }

  function handleChoice(selected, btnEl, q) {
    if (state.answered) return;
    state.answered = true;

    const isCorrect = String(selected).trim() === String(q.answer).trim();

    // Disable all choices, mark correct/wrong
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.style.pointerEvents = 'none';
      if (String(b.textContent).trim() === String(q.answer).trim()) {
        b.classList.add('correct');
      }
    });

    if (isCorrect) {
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      state.correct++;
      const pts = 10 + Math.min(state.streak, 10) * 2;
      state.score += pts;

      const fb = $('q-feedback');
      fb.textContent = pickRandom(PRAISE);
      fb.className = 'q-feedback correct';

      const sv = $('q-score');
      sv.classList.add('score-pop');
      setTimeout(() => sv.classList.remove('score-pop'), 300);

      // Track topic
      if (q.topic) state.seenTopics.add(q.topic);
    } else {
      btnEl.classList.add('wrong');
      state.streak = 0;
      if (state.current === 0) state.firstWrongQ = true;

      state.mistakes.push({
        q:      q.q,
        yours:  selected,
        answer: q.answer,
        hint:   q.hint || '',
      });

      const fb = $('q-feedback');
      fb.textContent = pickRandom(WRONG_MSG);
      fb.className = 'q-feedback wrong';
    }

    // Stats update
    $('q-score').textContent  = state.score;
    $('q-streak').textContent = `🔥${state.streak}`;

    // Show hint area
    const hintWrap = $('q-hint-wrap');
    hintWrap.classList.remove('hidden');
    $('q-hint-text').textContent = q.hint || 'No hint available for this question.';
    $('btn-next').classList.remove('hidden');
  }

  function nextQuestion() {
    state.current++;
    if (state.current >= state.quiz.questions.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  }

  function finishQuiz() {
    const total    = state.quiz.questions.length;
    const accuracy = Math.round((state.correct / total) * 100);
    const timeSec  = Math.round((Date.now() - state.startTime) / 1000);

    // Determine grade
    let grade, gradeClass, emoji, title, subtitle;
    if (accuracy === 100) {
      grade = 'A+'; gradeClass = 'grade-A'; emoji = '🏆';
      title = 'PERFECT!'; subtitle = 'You got every single one right!';
    } else if (accuracy >= 90) {
      grade = 'A'; gradeClass = 'grade-A'; emoji = '🌟';
      title = 'Outstanding!'; subtitle = 'Almost flawless — incredible work!';
    } else if (accuracy >= 80) {
      grade = 'B'; gradeClass = 'grade-B'; emoji = '⭐';
      title = 'Great Job!'; subtitle = 'You are a real math star!';
    } else if (accuracy >= 70) {
      grade = 'C+'; gradeClass = 'grade-B'; emoji = '👍';
      title = 'Good Work!'; subtitle = 'Keep practicing and you\'ll get there!';
    } else if (accuracy >= 60) {
      grade = 'C'; gradeClass = 'grade-C'; emoji = '💪';
      title = 'Nice Try!'; subtitle = 'Practice makes perfect!';
    } else if (accuracy >= 50) {
      grade = 'D'; gradeClass = 'grade-D'; emoji = '🤔';
      title = 'Keep Going!'; subtitle = 'Review the hints and try again!';
    } else {
      grade = 'F'; gradeClass = 'grade-F'; emoji = '🤗';
      title = 'Don\'t Give Up!'; subtitle = 'Every mistake is a learning moment!';
    }

    // Build history entry
    const entry = {
      date:      new Date().toISOString(),
      title:     state.quiz.title,
      accuracy,
      score:     state.score,
      correct:   state.correct,
      total,
      bestStreak:state.bestStreak,
      timeSec,
      firstWrong:state.firstWrongQ,
      topics:    [...state.seenTopics],
    };

    const history = loadHistory();
    history.push(entry);
    saveLS(STORAGE_KEYS.HISTORY, history);

    // Check trophies
    const prevTrophies = loadTrophies();
    const newTrophies  = checkNewTrophies(history, prevTrophies);
    const allTrophies  = { ...prevTrophies };
    newTrophies.forEach(t => { allTrophies[t.id] = (allTrophies[t.id] || 0) + 1; });
    saveTrophies(allTrophies);

    // Render results
    const gradeBadge = $('res-grade-badge');
    gradeBadge.textContent = grade;
    gradeBadge.className   = `grade-badge ${gradeClass}`;

    $('res-emoji').textContent    = emoji;
    $('res-title').textContent    = title;
    $('res-subtitle').textContent = subtitle;
    $('res-score').textContent    = state.score;
    $('res-correct').textContent  = `${state.correct}/${total}`;
    $('res-accuracy').textContent = `${accuracy}%`;
    $('res-streak').textContent   = state.bestStreak;

    // New trophies
    const ntWrap = $('new-trophies-wrap');
    if (newTrophies.length > 0) {
      ntWrap.classList.remove('hidden');
      const list = $('new-trophies-list');
      list.innerHTML = '';
      newTrophies.forEach(t => {
        const el = document.createElement('div');
        el.className = 'new-trophy-item';
        el.innerHTML = `<span class="new-trophy-icon">${t.icon}</span><span class="new-trophy-name">${t.name}</span>`;
        list.appendChild(el);
      });
    } else {
      ntWrap.classList.add('hidden');
    }

    // Mistakes
    const mWrap = $('res-mistakes-wrap');
    if (state.mistakes.length > 0) {
      mWrap.classList.remove('hidden');
      const mList = $('res-mistakes-list');
      mList.innerHTML = '';
      state.mistakes.forEach(m => {
        const div = document.createElement('div');
        div.className = 'mistake-card';
        div.innerHTML = `
          <div class="mistake-q">${escHtml(m.q)}</div>
          <div class="mistake-ans-row">
            Your answer: ${escHtml(String(m.yours))} &nbsp;|&nbsp;
            <span class="mistake-correct">Correct: ${escHtml(String(m.answer))}</span>
          </div>
          ${m.hint ? `<div class="q-hint-text" style="margin-top:8px">${escHtml(m.hint)}</div>` : ''}
        `;
        mList.appendChild(div);
      });
    } else {
      mWrap.classList.add('hidden');
    }

    showScreen('results');

    if (accuracy >= 80) launchConfetti();
  }

  // ===== Trophy Room =====
  function renderTrophies() {
    const unlocked = loadTrophies();
    const total    = Object.keys(unlocked).length;

    $('trophy-total').textContent = `${total} / ${TROPHY_DEFS.length} trophies collected`;

    const grid = $('trophy-grid');
    grid.innerHTML = '';
    TROPHY_DEFS.forEach(def => {
      const isUnlocked = !!unlocked[def.id];
      const count      = unlocked[def.id] || 0;

      const card = document.createElement('div');
      card.className = `trophy-card ${isUnlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <span class="trophy-card-icon">${def.icon}</span>
        <span class="trophy-card-name">${def.name}</span>
        <span class="trophy-card-desc">${def.desc}</span>
        ${count > 1 ? `<span class="trophy-card-count">x${count}</span>` : ''}
      `;
      grid.appendChild(card);
    });

    showScreen('trophies');
  }

  // ===== Teacher Panel =====
  const EXAMPLE_QUIZ = {
    title: 'Week 1 — Fractions, Word Problems & Geometry',
    questions: [
      {
        q: 'What is 1/2 + 1/4?',
        answer: '3/4',
        choices: ['1/2', '3/4', '1/3', '2/4'],
        hint: 'To add fractions with different denominators, find a common denominator. 1/2 = 2/4, so 2/4 + 1/4 = 3/4.',
        topic: 'Fractions',
      },
      {
        q: 'Simplify the fraction 6/8.',
        answer: '3/4',
        choices: ['3/4', '2/3', '1/2', '6/8'],
        hint: 'Divide both numerator and denominator by their GCF (2). 6÷2 = 3, 8÷2 = 4, so 6/8 = 3/4.',
        topic: 'Fractions',
      },
      {
        q: 'Sarah has 24 apples. She gives 1/3 of them to her friend. How many apples does she have left?',
        answer: '16',
        choices: ['8', '16', '12', '18'],
        hint: '1/3 of 24 = 8. She gives away 8 apples, so she keeps 24 - 8 = 16.',
        topic: 'Word Problems',
      },
      {
        q: 'A rectangle has a length of 8 cm and a width of 5 cm. What is its area?',
        answer: '40 cm²',
        choices: ['40 cm²', '26 cm²', '13 cm²', '45 cm²'],
        hint: 'Area of a rectangle = length × width = 8 × 5 = 40 cm².',
        topic: 'Geometry',
      },
      {
        q: 'What is 3/5 of 25?',
        answer: '15',
        choices: ['10', '15', '20', '12'],
        hint: 'To find 3/5 of 25: divide 25 by 5 (= 5), then multiply by 3 (= 15).',
        topic: 'Fractions',
      },
    ],
  };

  function renderTeacher() {
    const saved = loadLS(STORAGE_KEYS.QUIZ);
    if (saved) {
      $('week-title-input').value = saved.title || '';
      $('questions-input').value  = JSON.stringify(saved.questions, null, 2);
    }
    showScreen('teacher');
  }

  function saveTeacherQuiz() {
    const title    = $('week-title-input').value.trim() || 'Weekly Quiz';
    const rawText  = $('questions-input').value.trim();
    const errorEl  = $('teacher-error');

    if (!rawText) {
      errorEl.textContent = 'Please paste your questions JSON.';
      errorEl.classList.remove('hidden');
      return;
    }

    let questions;
    try {
      questions = JSON.parse(rawText);
    } catch (e) {
      errorEl.textContent = 'Invalid JSON — please check your formatting. Error: ' + e.message;
      errorEl.classList.remove('hidden');
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      errorEl.textContent = 'Questions must be a non-empty JSON array [ ... ]';
      errorEl.classList.remove('hidden');
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.q) {
        errorEl.textContent = `Question ${i + 1} is missing the "q" field.`;
        errorEl.classList.remove('hidden');
        return;
      }
      if (!q.answer) {
        errorEl.textContent = `Question ${i + 1} is missing the "answer" field.`;
        errorEl.classList.remove('hidden');
        return;
      }
      if (!Array.isArray(q.choices) || q.choices.length < 2) {
        errorEl.textContent = `Question ${i + 1} must have a "choices" array with at least 2 options.`;
        errorEl.classList.remove('hidden');
        return;
      }
      const answers = q.choices.map(c => String(c).trim());
      if (!answers.includes(String(q.answer).trim())) {
        errorEl.textContent = `Question ${i + 1}: the "answer" value must match one of the "choices" exactly.\nAnswer: "${q.answer}"\nChoices: ${answers.join(', ')}`;
        errorEl.classList.remove('hidden');
        return;
      }
    }

    errorEl.classList.add('hidden');
    saveLS(STORAGE_KEYS.QUIZ, { title, questions });
    renderHome();
  }

  // ===== Helpers =====
  function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ===== Confetti =====
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#6c5ce7','#00cec9','#fdcb6e','#e17055','#00b894','#a29bfe','#f9ca24'];
    const pieces = [];
    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: pickRandom(colors),
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 3,
        rot: Math.random() * 360,
        rotS: (Math.random() - 0.5) * 12,
      });
    }

    let frame = 0;
    (function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.rotS;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (frame < 160) requestAnimationFrame(animate);
      else canvas.remove();
    })();
  }

  // ===== Event Listeners =====
  $('btn-start-quiz').addEventListener('click', startQuiz);

  $('btn-trophies').addEventListener('click', renderTrophies);

  $('btn-teacher').addEventListener('click', renderTeacher);

  $('btn-quit-quiz').addEventListener('click', renderHome);

  $('btn-hint').addEventListener('click', () => {
    const ht = $('q-hint-text');
    const isHidden = ht.classList.contains('hidden');
    ht.classList.toggle('hidden', !isHidden);
    $('btn-hint').textContent = isHidden ? '💡 Hide Hint' : '💡 Show Hint';
  });

  $('btn-next').addEventListener('click', nextQuestion);

  $('btn-retry').addEventListener('click', startQuiz);
  $('btn-home-from-results').addEventListener('click', renderHome);

  $('btn-back-from-trophies').addEventListener('click', renderHome);
  $('btn-back-from-teacher').addEventListener('click', renderHome);

  $('btn-save-questions').addEventListener('click', saveTeacherQuiz);

  $('btn-clear-quiz').addEventListener('click', () => {
    if (confirm('Clear the current quiz? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEYS.QUIZ);
      $('week-title-input').value = '';
      $('questions-input').value  = '';
      renderHome();
    }
  });

  $('btn-load-example').addEventListener('click', () => {
    $('week-title-input').value = EXAMPLE_QUIZ.title;
    $('questions-input').value  = JSON.stringify(EXAMPLE_QUIZ.questions, null, 2);
    $('teacher-error').classList.add('hidden');
  });

  // ===== Init =====
  renderHome();
})();
