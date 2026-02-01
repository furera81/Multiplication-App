(function () {
  'use strict';

  // ================================================================
  //  EXERCISE DATABASE
  // ================================================================
  const EXERCISES = {
    crunches: {
      name: 'Crunches',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Keep your lower back pressed into the floor</span> throughout the movement.',
        'Lift using your abs, not your neck. Imagine a tennis ball under your chin.',
        'Exhale as you crunch up, inhale on the way down.',
      ],
      video: 'https://www.youtube.com/embed/MKmrqcoCZ-M',
      figure: 'crunch',
    },
    plank: {
      name: 'Plank Hold',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Keep your body in a straight line</span> from head to heels.',
        'Engage your core by pulling your belly button toward your spine.',
        'Don\'t let your hips sag or pike up.',
      ],
      video: 'https://www.youtube.com/embed/yeKv5oX_6GY',
      figure: 'plank',
    },
    legRaises: {
      name: 'Leg Raises',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Press your lower back firmly into the ground</span> as you lower your legs.',
        'Move slowly and controlled \u2014 don\'t use momentum.',
        'If too hard, bend your knees slightly.',
      ],
      video: 'https://www.youtube.com/embed/JB2oyawG9KI',
      figure: 'legraise',
    },
    flutterKicks: {
      name: 'Flutter Kicks',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Keep your lower back glued to the floor.</span>',
        'Small, controlled kicks \u2014 about 6 inches of movement.',
        'Place hands under your glutes for extra support if needed.',
      ],
      video: 'https://www.youtube.com/embed/ANVdMDaYRts',
      figure: 'flutter',
    },
    deadBugs: {
      name: 'Dead Bugs',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Move opposite arm and leg simultaneously</span> while keeping your back flat.',
        'Exhale as you extend, inhale as you return.',
        'Go slowly \u2014 control is everything in this exercise.',
      ],
      video: 'https://www.youtube.com/embed/4XLEnwUr1d8',
      figure: 'deadbug',
    },
    toeTouches: {
      name: 'Toe Touches',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Reach straight up toward your toes</span>, lifting your shoulder blades off the ground.',
        'Keep your legs vertical \u2014 perpendicular to the floor.',
        'Squeeze your abs at the top of each rep.',
      ],
      video: 'https://www.youtube.com/embed/9CVeFFJiMWo',
      figure: 'toetouch',
    },
    bicycleCrunches: {
      name: 'Bicycle Crunches',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Rotate your torso to bring elbow to opposite knee.</span>',
        'Fully extend the non-working leg each rep.',
        'Don\'t pull on your neck \u2014 let your obliques do the work.',
      ],
      video: 'https://www.youtube.com/embed/9FGilxCbdz8',
      figure: 'bicycle',
    },
    russianTwists: {
      name: 'Russian Twists',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Rotate from your ribcage, not just your arms.</span>',
        'Lean back at about 45 degrees, feet off the ground for extra challenge.',
        'Tap the floor on each side with your hands.',
      ],
      video: 'https://www.youtube.com/embed/wkD8rjkodUI',
      figure: 'russiantwist',
    },
    mountainClimbers: {
      name: 'Mountain Climbers',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Drive your knees toward your chest rapidly</span> while keeping your hips down.',
        'Maintain a strong plank position throughout.',
        'Land on the balls of your feet, not your toes.',
      ],
      video: 'https://www.youtube.com/embed/nmwgirgXLYM',
      figure: 'mountainclimber',
    },
    vUps: {
      name: 'V-Ups',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Lift your legs and torso simultaneously</span> to form a V shape.',
        'Reach your hands toward your feet at the top.',
        'Lower back down slowly \u2014 don\'t just drop.',
      ],
      video: 'https://www.youtube.com/embed/iP2fjvG0g3w',
      figure: 'vup',
    },
    reverseCrunches: {
      name: 'Reverse Crunches',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Curl your hips off the floor</span> by contracting your lower abs.',
        'Don\'t swing your legs \u2014 use slow, controlled movement.',
        'Keep your upper back and head on the ground.',
      ],
      video: 'https://www.youtube.com/embed/hyv14e2QDq0',
      figure: 'reversecrunch',
    },
    walkouts: {
      name: 'Ab Walkouts',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Walk your hands out to a full plank</span> then walk them back.',
        'Keep your core tight and avoid letting your hips sag.',
        'Go as far out as you can while maintaining form.',
      ],
      video: 'https://www.youtube.com/embed/hsg9VYGcBa0',
      figure: 'walkout',
    },
    windshieldWipers: {
      name: 'Windshield Wipers',
      duration: 45,
      tips: [
        '<span class="tip-emphasis">Rotate your legs side to side</span> in a controlled arc.',
        'Keep your shoulders flat on the ground.',
        'Bend your knees to make it easier, straighten for harder.',
      ],
      video: 'https://www.youtube.com/embed/W4GkDBCaEWA',
      figure: 'windshieldwiper',
    },
    lSitHold: {
      name: 'L-Sit Hold',
      duration: 30,
      tips: [
        '<span class="tip-emphasis">Press through your palms and lift your body</span> with legs extended forward.',
        'Keep your legs parallel to the floor.',
        'If too hard, do a tucked version with knees bent.',
      ],
      video: 'https://www.youtube.com/embed/IUZJoSP66HI',
      figure: 'lsit',
    },
  };

  // ================================================================
  //  WORKOUT SETS
  // ================================================================
  const WORKOUT_SETS = {
    A: {
      title: 'Core Foundations',
      badge: 'Beginner',
      rounds: 2,
      restBetweenExercises: 15,
      restBetweenRounds: 30,
      exercises: ['crunches', 'plank', 'legRaises', 'flutterKicks', 'deadBugs', 'toeTouches'],
    },
    B: {
      title: 'Twist & Burn',
      badge: 'Intermediate',
      rounds: 2,
      restBetweenExercises: 15,
      restBetweenRounds: 30,
      exercises: ['bicycleCrunches', 'russianTwists', 'mountainClimbers', 'vUps', 'plank', 'reverseCrunches'],
    },
    C: {
      title: 'Iron Core',
      badge: 'Advanced',
      rounds: 3,
      restBetweenExercises: 10,
      restBetweenRounds: 20,
      exercises: ['walkouts', 'windshieldWipers', 'vUps', 'mountainClimbers', 'lSitHold', 'bicycleCrunches'],
    },
  };

  // ================================================================
  //  SVG FIGURE GENERATOR
  // ================================================================
  function makeFigureSVG(type) {
    const svgs = {
      crunch: `<svg class="figure-svg anim-crunch" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <g class="torso">
          <circle class="head" cx="90" cy="60" r="14"/>
          <line class="body-part" x1="90" y1="74" x2="90" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="75" y1="95" x2="105" y2="95"/>
          <line class="body-part emphasis emphasis-pulse" x1="75" y1="110" x2="105" y2="110"/>
          <line class="body-part" x1="90" y1="80" x2="60" y2="60"/>
          <line class="body-part" x1="90" y1="80" x2="120" y2="60"/>
        </g>
        <line class="body-part" x1="90" y1="130" x2="60" y2="175"/>
        <line class="body-part" x1="90" y1="130" x2="120" y2="175"/>
      </svg>`,

      plank: `<svg class="figure-svg anim-plank" viewBox="0 0 180 200">
        <line class="body-part ground" x1="10" y1="160" x2="170" y2="160"/>
        <g class="plank-body">
          <circle class="head" cx="148" cy="105" r="12"/>
          <line class="body-part" x1="140" y1="115" x2="35" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="65" y1="118" x2="110" y2="112"/>
          <line class="body-part" x1="140" y1="115" x2="150" y2="155"/>
          <line class="body-part" x1="35" y1="130" x2="25" y2="155"/>
          <line class="body-part" x1="35" y1="130" x2="45" y2="155"/>
        </g>
      </svg>`,

      legraise: `<svg class="figure-svg anim-legraise" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <circle class="head" cx="90" cy="50" r="14"/>
        <line class="body-part" x1="90" y1="64" x2="90" y2="140"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="115" x2="102" y2="115"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="130" x2="102" y2="130"/>
        <line class="body-part" x1="90" y1="80" x2="55" y2="65"/>
        <line class="body-part" x1="90" y1="80" x2="125" y2="65"/>
        <g class="legs">
          <line class="body-part" x1="90" y1="140" x2="70" y2="180"/>
          <line class="body-part" x1="90" y1="140" x2="110" y2="180"/>
        </g>
      </svg>`,

      flutter: `<svg class="figure-svg anim-flutter" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <circle class="head" cx="90" cy="50" r="14"/>
        <line class="body-part" x1="90" y1="64" x2="90" y2="145"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="120" x2="102" y2="120"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="135" x2="102" y2="135"/>
        <line class="body-part" x1="90" y1="80" x2="55" y2="65"/>
        <line class="body-part" x1="90" y1="80" x2="125" y2="65"/>
        <g class="leg-left">
          <line class="body-part" x1="90" y1="145" x2="80" y2="180"/>
        </g>
        <g class="leg-right">
          <line class="body-part" x1="90" y1="145" x2="100" y2="180"/>
        </g>
      </svg>`,

      deadbug: `<svg class="figure-svg anim-deadbug" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <circle class="head" cx="90" cy="55" r="14"/>
        <line class="body-part" x1="90" y1="69" x2="90" y2="140"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="100" x2="102" y2="100"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="115" x2="102" y2="115"/>
        <g class="left-side">
          <line class="body-part" x1="90" y1="82" x2="55" y2="55"/>
          <line class="body-part" x1="90" y1="140" x2="65" y2="175"/>
        </g>
        <g class="right-side">
          <line class="body-part" x1="90" y1="82" x2="125" y2="55"/>
          <line class="body-part" x1="90" y1="140" x2="115" y2="175"/>
        </g>
      </svg>`,

      toetouch: `<svg class="figure-svg anim-toetouch" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <g class="upper">
          <circle class="head" cx="90" cy="50" r="14"/>
          <line class="body-part" x1="90" y1="64" x2="90" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="95" x2="102" y2="95"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="110" x2="102" y2="110"/>
          <line class="body-part" x1="90" y1="80" x2="65" y2="55"/>
          <line class="body-part" x1="90" y1="80" x2="115" y2="55"/>
        </g>
        <g class="lower">
          <line class="body-part" x1="90" y1="130" x2="75" y2="175"/>
          <line class="body-part" x1="90" y1="130" x2="105" y2="175"/>
        </g>
      </svg>`,

      bicycle: `<svg class="figure-svg anim-bicycle" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <g class="torso">
          <circle class="head" cx="90" cy="55" r="14"/>
          <line class="body-part" x1="90" y1="69" x2="90" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="75" y1="100" x2="105" y2="100"/>
          <line class="body-part emphasis emphasis-pulse" x1="75" y1="115" x2="105" y2="115"/>
          <line class="body-part" x1="90" y1="82" x2="60" y2="62"/>
          <line class="body-part" x1="90" y1="82" x2="120" y2="62"/>
        </g>
        <g class="leg-left">
          <line class="body-part" x1="90" y1="145" x2="65" y2="175"/>
        </g>
        <g class="leg-right">
          <line class="body-part" x1="90" y1="145" x2="115" y2="175"/>
        </g>
      </svg>`,

      russiantwist: `<svg class="figure-svg anim-russiantwist" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <g class="torso">
          <circle class="head" cx="90" cy="55" r="14"/>
          <line class="body-part" x1="90" y1="69" x2="90" y2="135"/>
          <line class="body-part emphasis emphasis-pulse" x1="72" y1="100" x2="108" y2="100"/>
          <line class="body-part emphasis emphasis-pulse" x1="72" y1="115" x2="108" y2="115"/>
          <line class="body-part" x1="90" y1="90" x2="50" y2="100"/>
          <line class="body-part" x1="90" y1="90" x2="130" y2="100"/>
        </g>
        <line class="body-part" x1="90" y1="135" x2="65" y2="175"/>
        <line class="body-part" x1="90" y1="135" x2="115" y2="175"/>
      </svg>`,

      mountainclimber: `<svg class="figure-svg anim-mountainclimber" viewBox="0 0 180 200">
        <line class="body-part ground" x1="10" y1="165" x2="170" y2="165"/>
        <circle class="head" cx="145" cy="85" r="12"/>
        <line class="body-part" x1="138" y1="95" x2="55" y2="120"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="104" x2="120" y2="96"/>
        <line class="body-part" x1="138" y1="95" x2="155" y2="80"/>
        <line class="body-part" x1="138" y1="95" x2="130" y2="75"/>
        <g class="leg-left">
          <line class="body-part" x1="55" y1="120" x2="35" y2="160"/>
        </g>
        <g class="leg-right">
          <line class="body-part" x1="55" y1="120" x2="75" y2="160"/>
        </g>
      </svg>`,

      vup: `<svg class="figure-svg anim-vup" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <g class="upper">
          <circle class="head" cx="90" cy="50" r="14"/>
          <line class="body-part" x1="90" y1="64" x2="90" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="95" x2="102" y2="95"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="110" x2="102" y2="110"/>
          <line class="body-part" x1="90" y1="78" x2="65" y2="50"/>
          <line class="body-part" x1="90" y1="78" x2="115" y2="50"/>
        </g>
        <g class="lower">
          <line class="body-part" x1="90" y1="130" x2="75" y2="175"/>
          <line class="body-part" x1="90" y1="130" x2="105" y2="175"/>
        </g>
      </svg>`,

      reversecrunch: `<svg class="figure-svg anim-reversecrunch" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <circle class="head" cx="90" cy="50" r="14"/>
        <line class="body-part" x1="90" y1="64" x2="90" y2="140"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="118" x2="102" y2="118"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="133" x2="102" y2="133"/>
        <line class="body-part" x1="90" y1="80" x2="55" y2="65"/>
        <line class="body-part" x1="90" y1="80" x2="125" y2="65"/>
        <g class="legs">
          <line class="body-part" x1="90" y1="140" x2="70" y2="175"/>
          <line class="body-part" x1="90" y1="140" x2="110" y2="175"/>
        </g>
      </svg>`,

      walkout: `<svg class="figure-svg anim-walkout" viewBox="0 0 180 200">
        <line class="body-part ground" x1="10" y1="165" x2="170" y2="165"/>
        <circle class="head" cx="55" cy="90" r="12"/>
        <line class="body-part" x1="60" y1="100" x2="110" y2="130"/>
        <line class="body-part emphasis emphasis-pulse" x1="72" y1="108" x2="98" y2="122"/>
        <g class="arms">
          <line class="body-part" x1="60" y1="100" x2="30" y2="160"/>
          <line class="body-part" x1="60" y1="100" x2="50" y2="160"/>
        </g>
        <line class="body-part" x1="110" y1="130" x2="130" y2="160"/>
        <line class="body-part" x1="110" y1="130" x2="100" y2="160"/>
      </svg>`,

      windshieldwiper: `<svg class="figure-svg anim-windshieldwiper" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="180" x2="160" y2="180"/>
        <circle class="head" cx="90" cy="50" r="14"/>
        <line class="body-part" x1="90" y1="64" x2="90" y2="140"/>
        <line class="body-part emphasis emphasis-pulse" x1="78" y1="100" x2="102" y2="100"/>
        <line class="body-part" x1="90" y1="80" x2="50" y2="70"/>
        <line class="body-part" x1="90" y1="80" x2="130" y2="70"/>
        <g class="legs">
          <line class="body-part" x1="90" y1="140" x2="70" y2="180"/>
          <line class="body-part" x1="90" y1="140" x2="110" y2="180"/>
        </g>
      </svg>`,

      lsit: `<svg class="figure-svg anim-lsit" viewBox="0 0 180 200">
        <line class="body-part ground" x1="20" y1="170" x2="160" y2="170"/>
        <g class="plank-body">
          <circle class="head" cx="90" cy="60" r="14"/>
          <line class="body-part" x1="90" y1="74" x2="90" y2="130"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="100" x2="102" y2="100"/>
          <line class="body-part emphasis emphasis-pulse" x1="78" y1="115" x2="102" y2="115"/>
          <line class="body-part" x1="90" y1="130" x2="75" y2="165"/>
          <line class="body-part" x1="90" y1="130" x2="105" y2="165"/>
          <line class="body-part" x1="90" y1="130" x2="50" y2="130"/>
          <line class="body-part" x1="90" y1="130" x2="130" y2="130"/>
        </g>
      </svg>`,
    };

    return svgs[type] || svgs.crunch;
  }

  // ================================================================
  //  DOM REFS
  // ================================================================
  const $ = (s) => document.querySelector(s);
  const screens = {
    home: $('#screen-home'),
    detail: $('#screen-detail'),
    active: $('#screen-active'),
    complete: $('#screen-complete'),
  };
  const modal = $('#modal-exercise');

  // ================================================================
  //  STATE
  // ================================================================
  let currentSet = null;
  let timerInterval = null;
  let isPaused = false;
  let workoutPlan = []; // flat list of { type:'work'|'rest', exercise?, duration, label }
  let planIndex = 0;
  let secondsLeft = 0;
  let totalWorkoutSeconds = 0;
  let elapsedSeconds = 0;

  // ================================================================
  //  SCREEN NAVIGATION
  // ================================================================
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ================================================================
  //  HOME -> DETAIL
  // ================================================================
  document.querySelectorAll('.workout-card').forEach((card) => {
    card.addEventListener('click', () => {
      const setKey = card.dataset.set;
      currentSet = WORKOUT_SETS[setKey];
      openDetail(setKey);
    });
  });

  function openDetail(setKey) {
    const set = WORKOUT_SETS[setKey];
    $('#detail-title').textContent = set.title;
    $('#detail-badge').textContent = set.badge;
    $('#detail-meta').textContent = `10 min \u2022 ${set.exercises.length} exercises \u2022 ${set.rounds} rounds`;

    // badge color
    const badge = $('#detail-badge');
    badge.style.background = '';
    badge.style.color = '';
    if (set.badge === 'Intermediate') {
      badge.style.background = 'rgba(254,202,87,.15)';
      badge.style.color = '#feca57';
    } else if (set.badge === 'Advanced') {
      badge.style.background = 'rgba(72,219,251,.15)';
      badge.style.color = '#48dbfb';
    }

    // build exercise list
    const list = $('#exercise-list');
    list.innerHTML = '';
    set.exercises.forEach((key, i) => {
      const ex = EXERCISES[key];
      const card = document.createElement('button');
      card.className = 'exercise-card';
      card.innerHTML = `
        <span class="exercise-num">${i + 1}</span>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-duration">${ex.duration}s work</div>
        </div>
        <span class="exercise-arrow">&rsaquo;</span>
      `;
      card.addEventListener('click', () => openExerciseModal(key));
      list.appendChild(card);
    });

    showScreen('detail');
  }

  // back button
  $('#btn-back').addEventListener('click', () => showScreen('home'));

  // ================================================================
  //  EXERCISE MODAL
  // ================================================================
  function openExerciseModal(key) {
    const ex = EXERCISES[key];
    $('#modal-title').textContent = ex.name;
    $('#modal-figure').innerHTML = makeFigureSVG(ex.figure);
    $('#modal-tips').innerHTML = ex.tips.map((t) => `<p>${t}</p>`).join('');
    $('#modal-video').innerHTML = `<iframe src="${ex.video}" title="${ex.name} demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    modal.classList.add('open');
  }

  $('#modal-close').addEventListener('click', () => {
    modal.classList.remove('open');
    $('#modal-video').innerHTML = ''; // stop video
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('open');
      $('#modal-video').innerHTML = '';
    }
  });

  // ================================================================
  //  BUILD WORKOUT PLAN
  // ================================================================
  function buildPlan(set) {
    const plan = [];
    for (let r = 0; r < set.rounds; r++) {
      set.exercises.forEach((key, i) => {
        const ex = EXERCISES[key];
        plan.push({
          type: 'work',
          exerciseKey: key,
          duration: ex.duration,
          label: ex.name,
          round: r + 1,
        });
        // rest between exercises (not after last exercise of last round)
        const isLastExInLastRound = r === set.rounds - 1 && i === set.exercises.length - 1;
        if (!isLastExInLastRound) {
          const isLastExInRound = i === set.exercises.length - 1;
          const restTime = isLastExInRound ? set.restBetweenRounds : set.restBetweenExercises;
          const nextKey = isLastExInRound ? set.exercises[0] : set.exercises[i + 1];
          plan.push({
            type: 'rest',
            duration: restTime,
            label: 'Rest',
            nextExercise: EXERCISES[nextKey].name,
            round: isLastExInRound ? r + 2 : r + 1,
          });
        }
      });
    }
    return plan;
  }

  // ================================================================
  //  START WORKOUT
  // ================================================================
  $('#btn-start-workout').addEventListener('click', () => {
    if (!currentSet) return;
    workoutPlan = buildPlan(currentSet);
    planIndex = 0;
    elapsedSeconds = 0;
    totalWorkoutSeconds = workoutPlan.reduce((s, p) => s + p.duration, 0);
    isPaused = false;
    $('#btn-pause').textContent = 'Pause';
    showScreen('active');
    startSegment();
  });

  function startSegment() {
    if (planIndex >= workoutPlan.length) {
      finishWorkout();
      return;
    }

    const seg = workoutPlan[planIndex];
    secondsLeft = seg.duration;

    // update UI
    const roundTotal = currentSet.rounds;
    const roundNum = seg.round || 1;
    $('#active-round').textContent = `Round ${Math.min(roundNum, roundTotal)} / ${roundTotal}`;
    $('#active-exercise-name').textContent = seg.label;

    if (seg.type === 'work') {
      const ex = EXERCISES[seg.exerciseKey];
      $('#active-figure').innerHTML = makeFigureSVG(ex.figure);
      $('#active-status').textContent = 'Work';
      $('#active-status').classList.remove('rest-phase');
      // find next
      const nextSeg = workoutPlan[planIndex + 1];
      if (nextSeg && nextSeg.type === 'rest') {
        const afterRest = workoutPlan[planIndex + 2];
        $('#active-next').textContent = afterRest ? `Next: ${afterRest.label}` : '';
      } else {
        $('#active-next').textContent = '';
      }
    } else {
      // rest
      $('#active-figure').innerHTML = `<svg class="figure-svg" viewBox="0 0 180 200">
        <text x="90" y="110" text-anchor="middle" fill="#feca57" font-size="48" font-weight="bold">REST</text>
      </svg>`;
      $('#active-status').textContent = 'Rest';
      $('#active-status').classList.add('rest-phase');
      $('#active-next').textContent = seg.nextExercise ? `Up next: ${seg.nextExercise}` : '';
    }

    updateTimerDisplay();
    updateProgressBar();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (isPaused) return;
      secondsLeft--;
      elapsedSeconds++;
      updateTimerDisplay();
      updateProgressBar();

      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        planIndex++;
        startSegment();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    $('#active-timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateProgressBar() {
    const pct = Math.min((elapsedSeconds / totalWorkoutSeconds) * 100, 100);
    $('#active-progress').style.width = pct + '%';
  }

  // Pause / Resume
  $('#btn-pause').addEventListener('click', () => {
    isPaused = !isPaused;
    $('#btn-pause').textContent = isPaused ? 'Resume' : 'Pause';
  });

  // Quit
  $('#btn-quit-workout').addEventListener('click', () => {
    clearInterval(timerInterval);
    showScreen('home');
  });

  // ================================================================
  //  FINISH
  // ================================================================
  function finishWorkout() {
    clearInterval(timerInterval);
    const totalMin = Math.floor(totalWorkoutSeconds / 60);
    const totalSec = totalWorkoutSeconds % 60;
    $('#complete-time').textContent = `${totalMin}:${totalSec.toString().padStart(2, '0')}`;
    const exerciseCount = workoutPlan.filter((s) => s.type === 'work').length;
    $('#complete-exercises').textContent = exerciseCount;
    showScreen('complete');
  }

  $('#btn-done').addEventListener('click', () => showScreen('home'));

})();
