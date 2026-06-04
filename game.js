// Flappy Platanus — Platanus Hack 26
// Tap para volar. Esquiva los nopales. ¡Llega hasta el atardecer chilango!

const W = 800;
const H = 600;
const FLOOR_Y = 540;
const STORAGE_KEY = 'flappy-platano-cdmx-26-scores';
const STORAGE_NAME_KEY = 'flappy-platano-cdmx-26-current-name';
const MAX_SCORES = 8;
const NAME_LEN = 10;

const PIPE_GAP = 178;
const PIPE_W = 70;
const PIPE_SPEED = 210;
const PIPE_SPACING = 310;
const GRAVITY = 1550;
const FLAP_VY = -440;
const MAX_FALL = 620;
const PLAYER_X = W * 0.3;
const PLAYER_R = 18;

const COLORS = {
  skyTop: 0xfc6b3b,
  skyMid: 0xffa256,
  skyLow: 0xffd28a,
  sun: 0xfff2a8,
  sunRing: 0xffd66e,

  volcanoBase: 0x35223f,
  volcanoMid: 0x4c305d,
  volcanoSnow: 0xf6ebff,
  cloud: 0xffe4c2,

  cityFar: 0x261733,
  cityNear: 0x12091a,
  cityWindow: 0xffd866,
  torreAccent: 0xff7e62,

  ground: 0x7a4a26,
  groundTop: 0xa0682f,
  grass: 0x5a8c1a,
  grassDark: 0x365214,

  banana: 0xffe34d,
  bananaHi: 0xfff39a,
  bananaShadow: 0xd9a91c,
  bananaTip: 0x3b2914,
  hat: 0x8a5a2a,
  hatTop: 0xa97636,
  hatBand: 0xd24545,
  eyeWhite: 0xffffff,
  eyePupil: 0x111111,
  cheek: 0xff8c8c,

  cactus: 0x4faa3a,
  cactusDark: 0x2c6b22,
  cactusEdge: 0x1d4516,
  cactusSpine: 0xfff0c0,
  cactusFlower: 0xff5b8a,
  cactusFlowerCore: 0xfff36a,

  white: 0xffffff,
  red: 0xff5b6b,
  accent: 0xffe34d,
  accentDim: 0xc9b03a,
  cell: 0x1c0e26,
  frame: 0x583b6a,
  overlay: 0x06030c,
  shadow: 0x000000,
};

const LETTER_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', '.', '-'],
  ['DEL', 'END', 'SKIP'],
];

// DO NOT replace existing keys — they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u', ' '],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) {
    KEY_TO_ARCADE[normKey(k)] = code;
  }
}

const FLAP_BTNS = ['P1_1', 'P2_1', 'P1_2', 'P2_2', 'P1_U', 'P2_U'];
const START_BTNS = ['START1', 'START2'];
const CONFIRM_BTNS = ['P1_1', 'P2_1', 'P1_2', 'P2_2', 'START1', 'START2'];

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#fc6b3b',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
  scene: { create, update },
};

new Phaser.Game(config);

function create() {
  const s = this;
  s.S = {
    phase: 'loading',
    score: 0,
    best: 0,
    scores: [],
    currentName: null,
    saveStatus: 'Cargando récords...',
    musicStarted: false,
    name: { letters: [], row: 0, col: 0, moveCd: 0, confirmCd: 0, lastMove: { x: 0, y: 0 } },
    menu: { cursor: 0, cooldown: 0, lastAxis: 0 },
    pipes: [],
    nextPipeAt: 0,
    speed: PIPE_SPEED,
    groundOffset: 0,
    cloudOffset: 0,
    elapsed: 0,
    deathFrozen: false,
    flashAlpha: 0,
    shake: 0,
    pulse: 0,
    autoSaved: false,
  };

  buildSky(s);
  buildBackdrop(s);
  s.pipeLayer = s.add.container(0, 0);
  s.pipeLayer.setDepth(4);
  buildGround(s);
  s.fxLayer = s.add.container(0, 0);
  s.fxLayer.setDepth(6);
  buildPlayer(s);
  buildHud(s);
  buildMenu(s);
  buildLeaderboardScreen(s);
  buildControlsScreen(s);
  buildGameOverUi(s);
  buildPauseScreen(s);
  buildReadyOverlay(s);
  buildFlash(s);
  buildControls(s);

  showMenu(s);

  loadScores()
    .then((sc) => {
      s.S.scores = sc;
      s.S.best = sc[0] && sc[0].score ? sc[0].score : 0;
      s.S.saveStatus = 'Presiona PLAY para volar.';
      refreshMenuBoard(s);
      refreshBestText(s);
    })
    .catch(() => {
      s.S.scores = [];
      s.S.saveStatus = 'Storage offline — los récords no se guardarán.';
      refreshMenuBoard(s);
    });

  loadCurrentName().then((name) => {
    s.S.currentName = name;
    setupMenuButtons(s);
  });
}

function update(time, deltaMs) {
  const s = this;
  if (!s.S) return;
  const dt = Math.min(deltaMs, 50) / 1000;
  const phase = s.S.phase;

  s.S.elapsed += dt;
  s.S.pulse = (Math.sin(s.S.elapsed * 3) + 1) / 2;

  animateSun(s);
  animateClouds(s, dt);
  decayShake(s, dt);
  decayFlash(s, dt);

  if (phase === 'menu') {
    handleMenu(s, time);
    idleBananaBob(s);
    return;
  }

  if (phase === 'leaderboard' || phase === 'controls') {
    if (consumeBtn(s, CONFIRM_BTNS)) {
      hideOverlays(s);
      showMenu(s);
    }
    return;
  }

  if (phase === 'ready') {
    idleBananaBob(s);
    if (consumeBtn(s, FLAP_BTNS)) {
      beginFlight(s, time);
    } else if (consumeBtn(s, START_BTNS)) {
      hideOverlays(s);
      showMenu(s);
    }
    return;
  }

  if (phase === 'playing') {
    if (consumeBtn(s, FLAP_BTNS)) flap(s);
    updatePlayer(s, dt);
    updatePipes(s, dt, time);
    scrollGround(s, dt);
    checkCollisions(s);
    if (consumeBtn(s, START_BTNS)) togglePause(s);
    return;
  }

  if (phase === 'paused') {
    if (consumeBtn(s, START_BTNS)) togglePause(s);
    return;
  }

  if (phase === 'dying') {
    updatePlayer(s, dt);
    s.player.rotation += dt * 6;
    if (s.player.y >= FLOOR_Y - PLAYER_R - 2) {
      s.player.y = FLOOR_Y - PLAYER_R - 2;
      if (!s.S.deathFrozen) {
        s.S.deathFrozen = true;
        s.player.vy = 0;
        s.time.delayedCall(380, () => openGameOver(s));
      }
    }
    return;
  }

  if (phase === 'gameover') {
    const needsNameEntry = scoreQualifies(s) && !s.S.currentName;
    if (!needsNameEntry) {
      if (consumeBtn(s, FLAP_BTNS)) {
        enterReady(s);
      } else if (consumeBtn(s, START_BTNS)) {
        hideOverlays(s);
        showMenu(s);
      }
      return;
    }
    handleNameEntry(s, time);
    return;
  }

  if (phase === 'saved') {
    if (consumeBtn(s, CONFIRM_BTNS)) {
      hideOverlays(s);
      showMenu(s);
    }
  }
}

// ---------- WORLD BUILDERS ----------

function buildSky(s) {
  // Sunset gradient using stacked rectangles
  s.skyTop = s.add.rectangle(W / 2, 90, W, 180, COLORS.skyTop).setDepth(0);
  s.skyMid = s.add.rectangle(W / 2, 250, W, 140, COLORS.skyMid).setDepth(0);
  s.skyLow = s.add.rectangle(W / 2, 380, W, 140, COLORS.skyLow).setDepth(0);

  // Sun with halo
  s.sunRing = s.add.circle(W * 0.78, 150, 100, COLORS.sunRing, 0.25).setDepth(0);
  s.sun = s.add.circle(W * 0.78, 150, 70, COLORS.sun, 1).setDepth(0);

  // Stars / sparkles (more visible at night)
  s.stars = [];
  for (let i = 0; i < 28; i += 1) {
    const sx = Phaser.Math.Between(20, W - 20);
    const sy = Phaser.Math.Between(10, 220);
    const baseAlpha = Phaser.Math.FloatBetween(0.4, 0.9);
    const dot = s.add.circle(sx, sy, Phaser.Math.FloatBetween(0.8, 1.8), COLORS.white, 0);
    dot.setDepth(0);
    s.stars.push({ obj: dot, baseAlpha });
  }

  // Clouds container — depth between sky and backdrop
  s.cloudLayer = s.add.container(0, 0);
  s.cloudLayer.setDepth(1);
  s.clouds = [];
  for (let i = 0; i < 5; i += 1) {
    const cx = (i * 200) + Phaser.Math.Between(0, 80);
    const cy = Phaser.Math.Between(60, 200);
    const cloud = makeCloud(s, cx, cy, Phaser.Math.FloatBetween(0.7, 1.2));
    s.cloudLayer.add(cloud);
    s.clouds.push({ obj: cloud, baseY: cy });
  }
}

function makeCloud(s, x, y, scale) {
  const c = s.add.container(x, y);
  const pieces = [
    s.add.ellipse(-26, 4, 44, 22, COLORS.cloud, 0.92),
    s.add.ellipse(0, -4, 56, 32, COLORS.cloud, 0.95),
    s.add.ellipse(24, 4, 40, 22, COLORS.cloud, 0.92),
    s.add.ellipse(12, -10, 30, 18, COLORS.cloud, 0.95),
  ];
  c.add(pieces);
  c.setScale(scale);
  return c;
}

function buildBackdrop(s) {
  s.backdrop = s.add.container(0, 0);
  s.backdrop.setDepth(2);

  // Far volcanoes — Popo + Izta
  drawVolcano(s, 110, FLOOR_Y, 230, 220, COLORS.volcanoBase, COLORS.volcanoSnow);
  drawVolcano(s, 230, FLOOR_Y, 170, 160, COLORS.volcanoMid, COLORS.volcanoSnow);
  drawVolcano(s, 600, FLOOR_Y, 200, 200, COLORS.volcanoBase, COLORS.volcanoSnow);
  drawVolcano(s, 720, FLOOR_Y, 150, 150, COLORS.volcanoMid, COLORS.volcanoSnow);

  // Far city silhouette (low backdrop)
  drawDistantCity(s, COLORS.cityFar, FLOOR_Y - 22, 0.7);

  // Iconic CDMX skyline (near layer)
  drawCatedralMetro(s, 110);
  drawBellasArtes(s, 250);
  drawTorreLatino(s, 380);
  drawAngelIndependencia(s, 510);
  drawMonumentoRev(s, 670);

  // Filler buildings between landmarks
  drawFillerBuildings(s);
}

function drawVolcano(s, x, baseY, width, height, fill, snow) {
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(x - width / 2, baseY);
  g.lineTo(x, baseY - height);
  g.lineTo(x + width / 2, baseY);
  g.closePath();
  g.fillPath();
  // Snow cap
  g.fillStyle(snow, 0.95);
  g.beginPath();
  g.moveTo(x - width * 0.18, baseY - height * 0.7);
  g.lineTo(x - width * 0.05, baseY - height * 0.78);
  g.lineTo(x, baseY - height);
  g.lineTo(x + width * 0.04, baseY - height * 0.78);
  g.lineTo(x + width * 0.18, baseY - height * 0.7);
  g.lineTo(x + width * 0.1, baseY - height * 0.65);
  g.lineTo(x, baseY - height * 0.7);
  g.lineTo(x - width * 0.08, baseY - height * 0.65);
  g.closePath();
  g.fillPath();
  s.backdrop.add(g);
}

function drawDistantCity(s, color, baseY, alpha) {
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(color, alpha);
  let x = 0;
  while (x < W + 20) {
    const wB = Phaser.Math.Between(28, 60);
    const hB = Phaser.Math.Between(28, 70);
    g.fillRect(x, baseY - hB, wB, hB);
    x += wB + Phaser.Math.Between(-2, 4);
  }
  g.fillStyle(COLORS.cityWindow, 0.35);
  for (let i = 0; i < 50; i += 1) {
    g.fillRect(Phaser.Math.Between(2, W - 4), Phaser.Math.Between(baseY - 60, baseY - 8), 2, 2);
  }
  s.backdrop.add(g);
}

function drawCatedralMetro(s, cx) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  // Nave body
  const bw = 76;
  const bh = 44;
  g.fillRect(cx - bw / 2, baseY - bh, bw, bh);
  // Gable roof line
  g.fillTriangle(cx - bw / 2, baseY - bh, cx, baseY - bh - 10, cx + bw / 2, baseY - bh);
  // Central dome (cupola)
  g.fillCircle(cx, baseY - bh - 4, 12);
  g.fillRect(cx - 12, baseY - bh - 4, 24, 8);
  g.fillRect(cx - 1, baseY - bh - 26, 2, 10);
  // Twin bell towers
  g.fillRect(cx - bw / 2 + 2, baseY - bh - 44, 16, 44);
  g.fillRect(cx + bw / 2 - 18, baseY - bh - 44, 16, 44);
  // Tower tops (smaller stage)
  g.fillRect(cx - bw / 2 + 4, baseY - bh - 54, 12, 12);
  g.fillRect(cx + bw / 2 - 16, baseY - bh - 54, 12, 12);
  // Crosses
  g.fillRect(cx - bw / 2 + 9, baseY - bh - 64, 2, 12);
  g.fillRect(cx - bw / 2 + 5, baseY - bh - 60, 10, 2);
  g.fillRect(cx + bw / 2 - 11, baseY - bh - 64, 2, 12);
  g.fillRect(cx + bw / 2 - 15, baseY - bh - 60, 10, 2);
  // Window light + door
  g.fillStyle(COLORS.skyLow, 0.5);
  g.fillRect(cx - 4, baseY - 16, 8, 16);
  g.fillStyle(COLORS.cityWindow, 0.75);
  g.fillRect(cx - 6, baseY - bh + 8, 3, 5);
  g.fillRect(cx + 3, baseY - bh + 8, 3, 5);
  s.backdrop.add(g);
}

function drawBellasArtes(s, cx) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  // Base body
  const bw = 104;
  const bh = 38;
  g.fillRect(cx - bw / 2, baseY - bh, bw, bh);
  // Arched colonnade detail
  g.fillStyle(COLORS.skyLow, 0.5);
  for (let i = 0; i < 4; i += 1) {
    const ax = cx - bw / 2 + 10 + i * 22;
    g.fillRect(ax, baseY - 22, 12, 22);
  }
  // Side mini-domes
  g.fillStyle(COLORS.cityNear, 1);
  g.fillCircle(cx - 38, baseY - bh, 11);
  g.fillCircle(cx + 38, baseY - bh, 11);
  g.fillRect(cx - 49, baseY - bh, 22, 6);
  g.fillRect(cx + 27, baseY - bh, 22, 6);
  // Main central dome — amber (the famous Bellas Artes dome)
  g.fillStyle(0xc06a2a, 1);
  g.fillCircle(cx, baseY - bh - 4, 24);
  g.fillRect(cx - 24, baseY - bh - 4, 48, 8);
  // Dome highlight
  g.fillStyle(0xe89035, 0.85);
  g.fillCircle(cx - 6, baseY - bh - 10, 9);
  // Pinnacle
  g.fillStyle(COLORS.cityNear, 1);
  g.fillRect(cx - 1, baseY - bh - 38, 2, 14);
  g.fillCircle(cx, baseY - bh - 40, 3);
  s.backdrop.add(g);
}

function drawTorreLatino(s, cx) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  // Lower body
  g.fillRect(cx - 16, baseY - 130, 32, 130);
  // Mid section narrower
  g.fillRect(cx - 12, baseY - 170, 24, 40);
  // Upper section
  g.fillRect(cx - 8, baseY - 196, 16, 26);
  // Antenna
  g.fillRect(cx - 1, baseY - 240, 2, 44);
  // Crown light
  g.fillStyle(COLORS.torreAccent, 1);
  g.fillRect(cx - 3, baseY - 244, 6, 4);
  // Windows
  g.fillStyle(COLORS.cityWindow, 0.7);
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      g.fillRect(cx - 11 + col * 8, baseY - 126 + row * 7, 2, 3);
    }
  }
  s.backdrop.add(g);
}

function drawAngelIndependencia(s, cx) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  // Square pedestal base
  g.fillRect(cx - 22, baseY - 24, 44, 24);
  // Tiered base
  g.fillRect(cx - 14, baseY - 38, 28, 14);
  // Tall slim column
  g.fillRect(cx - 5, baseY - 132, 10, 94);
  // Column flutings (slim highlights)
  g.fillStyle(COLORS.skyLow, 0.25);
  g.fillRect(cx - 4, baseY - 130, 1, 90);
  g.fillRect(cx + 3, baseY - 130, 1, 90);
  // Column capital
  g.fillStyle(COLORS.cityNear, 1);
  g.fillRect(cx - 8, baseY - 138, 16, 6);
  // Angel statue base
  g.fillStyle(0xfdc850, 1);
  g.fillRect(cx - 3, baseY - 144, 6, 6);
  // Angel body
  g.fillCircle(cx, baseY - 150, 3);
  g.fillRect(cx - 2, baseY - 150, 4, 6);
  // Angel wings (two angled triangles)
  g.fillTriangle(cx - 2, baseY - 152, cx - 14, baseY - 156, cx - 3, baseY - 144);
  g.fillTriangle(cx + 2, baseY - 152, cx + 14, baseY - 156, cx + 3, baseY - 144);
  // Raised laurel/arms
  g.fillRect(cx - 1, baseY - 158, 2, 6);
  s.backdrop.add(g);
}

function drawMonumentoRev(s, cx) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  // Wide base
  const bw = 96;
  g.fillRect(cx - bw / 2, baseY - 28, bw, 28);
  // Four art-deco corner pillars
  const pillarPositions = [cx - bw / 2 + 6, cx - 22, cx + 8, cx + bw / 2 - 20];
  for (const px of pillarPositions) {
    g.fillRect(px, baseY - 72, 14, 44);
    g.fillRect(px - 2, baseY - 78, 18, 8);
  }
  // Big central dome
  g.fillCircle(cx, baseY - 72, 28);
  g.fillRect(cx - 28, baseY - 72, 56, 8);
  // Dome ribs (subtle stripes)
  g.fillStyle(COLORS.skyLow, 0.25);
  g.fillRect(cx - 18, baseY - 92, 1, 22);
  g.fillRect(cx - 6, baseY - 96, 1, 26);
  g.fillRect(cx + 6, baseY - 96, 1, 26);
  g.fillRect(cx + 18, baseY - 92, 1, 22);
  // Spire
  g.fillStyle(COLORS.cityNear, 1);
  g.fillRect(cx - 2, baseY - 118, 4, 18);
  // Top ball
  g.fillCircle(cx, baseY - 120, 4);
  // Lighted windows under dome
  g.fillStyle(COLORS.cityWindow, 0.6);
  for (let i = 0; i < 5; i += 1) {
    g.fillRect(cx - 18 + i * 9, baseY - 22, 2, 6);
  }
  s.backdrop.add(g);
}

function drawFillerBuildings(s) {
  const baseY = FLOOR_Y - 4;
  const g = s.add.graphics();
  g.setDepth(2);
  g.fillStyle(COLORS.cityNear, 1);
  const gaps = [
    { x: 30, w: 30, h: 64 },
    { x: 180, w: 22, h: 50 },
    { x: 320, w: 26, h: 62 },
    { x: 440, w: 28, h: 78 },
    { x: 580, w: 22, h: 54 },
    { x: 740, w: 28, h: 70 },
    { x: 60, w: 18, h: 38 },
    { x: 770, w: 20, h: 44 },
  ];
  for (const b of gaps) {
    g.fillRect(b.x - b.w / 2, baseY - b.h, b.w, b.h);
  }
  g.fillStyle(COLORS.cityWindow, 0.6);
  for (const b of gaps) {
    for (let row = 0; row < Math.floor(b.h / 9); row += 1) {
      for (let col = 0; col < Math.floor(b.w / 6); col += 1) {
        if (Math.random() < 0.35) {
          g.fillRect(b.x - b.w / 2 + 2 + col * 6, baseY - b.h + 4 + row * 9, 2, 3);
        }
      }
    }
  }
  s.backdrop.add(g);
}

function buildGround(s) {
  // Ground base
  s.groundBase = s.add.rectangle(W / 2, FLOOR_Y + (H - FLOOR_Y) / 2, W, H - FLOOR_Y, COLORS.ground);
  s.groundBase.setDepth(5);
  s.groundTopLine = s.add.rectangle(W / 2, FLOOR_Y, W, 6, COLORS.groundTop);
  s.groundTopLine.setDepth(5);

  // Grass tufts that scroll
  s.grassLayer = s.add.container(0, 0);
  s.grassLayer.setDepth(5);
  s.grasses = [];
  for (let i = 0; i < 24; i += 1) {
    const gx = (i * 50) + Phaser.Math.Between(-8, 8);
    const gy = FLOOR_Y - 2;
    const tuft = s.add.triangle(gx, gy, -6, 0, 0, -10, 6, 0, COLORS.grass);
    s.grassLayer.add(tuft);
    s.grasses.push(tuft);
  }
  // Dirt details
  s.dirtLayer = s.add.container(0, 0);
  s.dirtLayer.setDepth(5);
  s.dirts = [];
  for (let i = 0; i < 20; i += 1) {
    const dx = (i * 60) + Phaser.Math.Between(0, 20);
    const dy = FLOOR_Y + Phaser.Math.Between(10, H - FLOOR_Y - 10);
    const dot = s.add.circle(dx, dy, Phaser.Math.Between(1, 3), COLORS.grassDark, 0.6);
    s.dirtLayer.add(dot);
    s.dirts.push(dot);
  }
}

function scrollGround(s, dt) {
  const dx = s.S.speed * dt;
  s.S.groundOffset = (s.S.groundOffset + dx) % 50;
  for (let i = 0; i < s.grasses.length; i += 1) {
    s.grasses[i].x -= dx;
    if (s.grasses[i].x < -10) s.grasses[i].x += 50 * s.grasses.length;
  }
  for (let i = 0; i < s.dirts.length; i += 1) {
    s.dirts[i].x -= dx * 0.92;
    if (s.dirts[i].x < -10) s.dirts[i].x += 60 * s.dirts.length;
  }
}

function animateClouds(s, dt) {
  const cloudSpeed = 22;
  for (const c of s.clouds) {
    c.obj.x -= cloudSpeed * dt;
    if (c.obj.x < -80) c.obj.x = W + 80;
    c.obj.y = c.baseY + Math.sin(s.S.elapsed * 0.8 + c.obj.x * 0.01) * 3;
  }
}

function animateSun(s) {
  const k = 1 + Math.sin(s.S.elapsed * 1.4) * 0.04;
  s.sunRing.setScale(k);
}

// ---------- PLAYER ----------

function buildPlayer(s) {
  const c = s.add.container(PLAYER_X, H / 2);
  c.setDepth(8);

  // Banana body — diagonal crescent (Platanus brand orientation)
  const g = s.add.graphics();
  const cy = 22;
  const rOut = 34;
  const rIn = 22;
  const angL = Math.PI * 1.12;
  const angR = Math.PI * 1.88;
  const STEPS = 22;
  const tilt = 0.5; // ~+28.6° — banana tilts so left tip goes up-left (stem at top)
  const cT = Math.cos(tilt);
  const sT = Math.sin(tilt);

  const rotateXY = (x, y) => [x * cT - y * sT, x * sT + y * cT];

  const crescentPoly = (rO, rI) => {
    const v = [];
    for (let i = 0; i <= STEPS; i += 1) {
      const a = angL + ((angR - angL) * i) / STEPS;
      const [rx, ry] = rotateXY(Math.cos(a) * rO, cy + Math.sin(a) * rO);
      v.push(rx, ry);
    }
    for (let i = STEPS; i >= 0; i -= 1) {
      const a = angL + ((angR - angL) * i) / STEPS;
      const [rx, ry] = rotateXY(Math.cos(a) * rI, cy + Math.sin(a) * rI);
      v.push(rx, ry);
    }
    return v;
  };

  const fillPoly = (verts, color, alpha) => {
    g.fillStyle(color, alpha == null ? 1 : alpha);
    g.beginPath();
    g.moveTo(verts[0], verts[1]);
    for (let i = 2; i < verts.length; i += 2) {
      g.lineTo(verts[i], verts[i + 1]);
    }
    g.closePath();
    g.fillPath();
  };

  // Outline → main body → highlight → shadow
  fillPoly(crescentPoly(rOut + 2, rIn - 2), COLORS.bananaTip, 1);
  fillPoly(crescentPoly(rOut, rIn), COLORS.banana, 1);
  fillPoly(crescentPoly(rOut - 3, rOut - 9), COLORS.bananaHi, 0.95);
  fillPoly(crescentPoly(rIn + 5, rIn), COLORS.bananaShadow, 0.85);

  // Compute the tip positions in the tilted frame
  const [tipLX, tipLY] = rotateXY(Math.cos(angL) * rOut, cy + Math.sin(angL) * rOut);
  const [tipRX, tipRY] = rotateXY(Math.cos(angR) * rOut, cy + Math.sin(angR) * rOut);

  // Lower-right tip — small darker nub
  g.fillStyle(COLORS.bananaTip, 1);
  g.fillCircle(tipRX, tipRY, 2.5);

  // Top-left "corona" — the visible stem cap (this is the Platanus signature)
  // Extend the stem outward from the tip
  const stemDir = Math.atan2(tipLY, tipLX); // direction from origin to tip
  const stemExtX = tipLX + Math.cos(stemDir) * 5;
  const stemExtY = tipLY + Math.sin(stemDir) * 5;
  g.lineStyle(0);
  g.fillStyle(COLORS.bananaTip, 1);
  g.fillCircle(tipLX, tipLY, 4.5);
  g.fillCircle(stemExtX, stemExtY, 3.5);
  // A tiny lighter highlight on the stem
  g.fillStyle(COLORS.hatTop, 0.7);
  g.fillCircle(tipLX + 0.5, tipLY - 1, 1.5);

  c.add(g);

  // Face — positioned on the upper-right body (the "head" end of the tilted banana)
  const cheek = s.add.ellipse(13, 9, 9, 3, COLORS.cheek, 0.75);
  const eyeWhite = s.add.circle(10, 2, 5, COLORS.eyeWhite, 1);
  const eyePupil = s.add.circle(11.2, 3, 2.8, COLORS.eyePupil, 1);
  const eyeShine = s.add.circle(12.4, 1.5, 1.1, COLORS.eyeWhite, 1);

  const mouth = s.add.graphics();
  mouth.lineStyle(2, COLORS.eyePupil, 1);
  mouth.beginPath();
  mouth.arc(15, 8, 4, Math.PI * 0.08, Math.PI * 0.92, false);
  mouth.strokePath();

  // Tiny sombrero — sits on top of the banana body, between stem and face
  const hatBrim = s.add.ellipse(-7, -14, 28, 5, COLORS.hat, 1);
  const hatBrimTop = s.add.ellipse(-7, -15.5, 26, 3, COLORS.hatTop, 1);
  const hatCrown = s.add.rectangle(-7, -19, 12, 7, COLORS.hat, 1);
  const hatCrownTop = s.add.ellipse(-7, -22.5, 12, 3.5, COLORS.hatTop, 1);
  const hatBand = s.add.rectangle(-7, -17, 12, 2, COLORS.hatBand, 1);

  c.add([
    cheek, eyeWhite, eyePupil, eyeShine, mouth,
    hatBrim, hatBrimTop, hatCrown, hatCrownTop, hatBand,
  ]);
  c.setSize(72, 56);

  s.player = c;
  s.player.vy = 0;
  s.player.alive = true;
  s.player.lastFlap = -999;
}

function idleBananaBob(s) {
  s.player.y = H / 2 + Math.sin(s.S.elapsed * 3) * 12;
  s.player.rotation = Math.sin(s.S.elapsed * 3) * 0.08;
}

function updatePlayer(s, dt) {
  s.player.vy = Math.min(s.player.vy + GRAVITY * dt, MAX_FALL);
  s.player.y += s.player.vy * dt;
  if (s.player.y < 16) {
    s.player.y = 16;
    s.player.vy = 0;
  }
  // Rotate based on velocity, but clamped
  const targetRot = Phaser.Math.Clamp(s.player.vy / 600, -0.6, 1.2);
  s.player.rotation += (targetRot - s.player.rotation) * dt * 6;
}

function flap(s) {
  s.player.vy = FLAP_VY;
  playSound(s, 'flap');
  spawnFlapBurst(s);
}

function spawnFlapBurst(s) {
  for (let i = 0; i < 4; i += 1) {
    const p = s.add.circle(s.player.x - 14, s.player.y + 6, 2, COLORS.bananaHi, 0.9);
    p.setDepth(7);
    s.tweens.add({
      targets: p,
      x: p.x - Phaser.Math.Between(12, 32),
      y: p.y + Phaser.Math.Between(-6, 10),
      alpha: 0,
      duration: 380,
      onComplete: () => p.destroy(),
    });
  }
}

// ---------- PIPES (nopales) ----------

function beginFlight(s, time) {
  hideOverlays(s);
  destroyAllPipes(s);
  s.S.nextPipeAt = time;
  s.S.score = 0;
  s.S.speed = PIPE_SPEED;
  s.S.deathFrozen = false;
  s.S.previousBest = s.S.best;
  s.S.beatBestThisRun = false;
  s.player.y = H / 2;
  s.player.vy = FLAP_VY * 0.7;
  s.player.rotation = -0.2;
  s.player.alive = true;
  refreshScoreText(s);
  updateSky(s);
  startAmbientMusic(s);
  s.S.phase = 'playing';
}

function updatePipes(s, dt, time) {
  // Spawn
  while (s.S.nextPipeAt <= time) {
    spawnPipe(s);
    s.S.nextPipeAt += (PIPE_SPACING / s.S.speed) * 1000;
  }

  // Move + remove + score
  for (let i = s.S.pipes.length - 1; i >= 0; i -= 1) {
    const pipe = s.S.pipes[i];
    pipe.top.x -= s.S.speed * dt;
    pipe.bot.x -= s.S.speed * dt;
    pipe.zoneX = pipe.top.x;

    if (!pipe.scored && pipe.zoneX + PIPE_W / 2 < PLAYER_X) {
      pipe.scored = true;
      addScore(s);
    }

    if (pipe.zoneX < -PIPE_W) {
      pipe.top.destroy();
      pipe.bot.destroy();
      s.S.pipes.splice(i, 1);
    }
  }

  // Speed up slowly with score
  s.S.speed = PIPE_SPEED + Math.min(s.S.score * 3, 110);
}

function spawnPipe(s) {
  const gap = Math.max(PIPE_GAP - Math.floor(s.S.score / 4) * 4, 130);
  const minCenter = 110 + gap / 2;
  const maxCenter = FLOOR_Y - 30 - gap / 2;
  const center = Phaser.Math.Between(minCenter, maxCenter);
  const x = W + PIPE_W;
  const topHeight = center - gap / 2;
  const botY = center + gap / 2;
  const botHeight = FLOOR_Y - botY;

  const OBSTACLE_TYPES = ['cactus', 'cactus', 'trompo', 'sombreros'];
  const type = OBSTACLE_TYPES[Phaser.Math.Between(0, OBSTACLE_TYPES.length - 1)];

  const top = makeObstacle(s, x, topHeight / 2, PIPE_W, topHeight, true, type);
  const bot = makeObstacle(s, x, botY + botHeight / 2, PIPE_W, botHeight, false, type);
  s.pipeLayer.add(top);
  s.pipeLayer.add(bot);

  s.S.pipes.push({
    top,
    bot,
    topHeight,
    botY,
    scored: false,
    zoneX: x,
  });
}

function makeCactus(s, x, y, w, h, flipped) {
  const c = s.add.container(x, y);
  // Main body
  const body = s.add.rectangle(0, 0, w, h, COLORS.cactus);
  body.setStrokeStyle(3, COLORS.cactusEdge, 1);

  // Inner shadow stripe
  const inner = s.add.rectangle(-w * 0.18, 0, w * 0.18, h - 8, COLORS.cactusDark, 0.8);

  // Side arm if tall enough
  c.add([body, inner]);

  if (h > 80) {
    const armSide = Math.random() < 0.5 ? -1 : 1;
    const armY = flipped ? h * 0.2 : -h * 0.2;
    const armW = 16;
    const armH = 26;
    const arm = s.add.rectangle(armSide * (w / 2 + armW / 2 - 4), armY, armW, armH, COLORS.cactus);
    arm.setStrokeStyle(3, COLORS.cactusEdge, 1);
    const armTop = s.add.rectangle(
      armSide * (w / 2 + armW / 2 - 4),
      armY - (flipped ? -armH / 2 - 6 : armH / 2 + 6),
      armW,
      14,
      COLORS.cactus,
    );
    armTop.setStrokeStyle(3, COLORS.cactusEdge, 1);
    c.add([arm, armTop]);
  }

  // Spines
  for (let i = 0; i < Math.floor(h / 18); i += 1) {
    const sy = -h / 2 + 14 + i * 18;
    const spineL = s.add.rectangle(-w / 2 + 8, sy, 6, 1, COLORS.cactusSpine);
    const spineR = s.add.rectangle(w / 2 - 8, sy, 6, 1, COLORS.cactusSpine);
    c.add([spineL, spineR]);
  }

  // Flower at the open end
  const flowerSide = flipped ? h / 2 - 4 : -h / 2 + 4;
  const flower = s.add.circle(0, flowerSide, 7, COLORS.cactusFlower);
  const flowerCore = s.add.circle(0, flowerSide, 3, COLORS.cactusFlowerCore);
  c.add([flower, flowerCore]);

  return c;
}

function makeTrompo(s, x, y, w, h, flipped) {
  // Taco al pastor — vertical spit (trompo) with red meat layers, pineapple + onion
  const c = s.add.container(x, y);
  // Vertical spit
  c.add(s.add.rectangle(0, 0, 6, h, 0x4a2a14));

  // Stacked meat layers (the trompo itself)
  const layerH = 16;
  const layerCount = Math.max(2, Math.floor((h - 22) / layerH));
  const meatColors = [0xc0331c, 0xa02818, 0xd44530, 0xb02818];
  const startY = -h / 2 + 14;
  for (let i = 0; i < layerCount; i += 1) {
    const ly = startY + i * layerH;
    const taper = Math.abs(i - layerCount / 2) * 2;
    const lw = w - 16 - taper;
    const meat = s.add.ellipse(0, ly, lw, layerH - 2, meatColors[i % meatColors.length]);
    meat.setStrokeStyle(2, 0x3a1208, 0.85);
    c.add(meat);
    // Char specks
    if (i % 2 === 0) {
      c.add(s.add.circle(Phaser.Math.Between(-8, 8), ly + 1, 1.5, 0x2a0804, 0.7));
    }
  }

  // Pineapple + onion on the open end
  const openY = flipped ? h / 2 - 4 : -h / 2 + 4;
  const dir = flipped ? -1 : 1;
  // Onion (cebolla) — small white sphere
  const onion = s.add.circle(0, openY + dir * 10, 5, 0xfdfbf0);
  onion.setStrokeStyle(1, 0x9a9a78, 0.7);
  c.add(onion);
  // Pineapple body (piña)
  const pina = s.add.circle(0, openY, 9, 0xf4c842);
  pina.setStrokeStyle(2, 0xa07020, 1);
  c.add(pina);
  // Pineapple texture
  c.add(s.add.rectangle(-3, openY, 1, 7, 0xa07020));
  c.add(s.add.rectangle(3, openY, 1, 7, 0xa07020));
  c.add(s.add.rectangle(0, openY - 2, 6, 1, 0xa07020));

  return c;
}

function makeSombreros(s, x, y, w, h, flipped) {
  // Stack of sombreros on a thin pole
  const c = s.add.container(x, y);
  c.add(s.add.rectangle(0, 0, 4, h, 0x3a1808));

  const sombH = 26;
  const sombCount = Math.max(1, Math.floor((h - 6) / sombH));
  const palettes = [
    { hat: 0x8a5a2a, top: 0xa97636, band: 0xd24545 },
    { hat: 0x6a4020, top: 0x8a5a2a, band: 0xff5b8a },
    { hat: 0x9a6a3a, top: 0xb98646, band: 0xe89035 },
  ];
  const startY = -h / 2 + 10;
  for (let i = 0; i < sombCount; i += 1) {
    const sy = startY + i * sombH;
    const pal = palettes[i % palettes.length];
    const brim = s.add.ellipse(0, sy + 8, w - 4, 7, pal.hat);
    brim.setStrokeStyle(2, 0x2a0a04, 0.6);
    const brimTop = s.add.ellipse(0, sy + 6, w - 6, 4, pal.top);
    const crown = s.add.rectangle(0, sy - 2, 26, 14, pal.hat);
    crown.setStrokeStyle(2, 0x2a0a04, 0.6);
    const crownTop = s.add.ellipse(0, sy - 8, 26, 5, pal.top);
    const band = s.add.rectangle(0, sy, 26, 3, pal.band);
    c.add([brim, brimTop, crown, crownTop, band]);
  }

  return c;
}

function makeObstacle(s, x, y, w, h, flipped, type) {
  if (type === 'trompo') return makeTrompo(s, x, y, w, h, flipped);
  if (type === 'sombreros') return makeSombreros(s, x, y, w, h, flipped);
  return makeCactus(s, x, y, w, h, flipped);
}

// ---------- COLLISIONS ----------

function checkCollisions(s) {
  const px = s.player.x;
  const py = s.player.y;

  if (py >= FLOOR_Y - PLAYER_R) {
    s.player.y = FLOOR_Y - PLAYER_R;
    return die(s, 'ground');
  }

  for (const pipe of s.S.pipes) {
    const cx = pipe.top.x;
    if (Math.abs(cx - px) > PIPE_W / 2 + PLAYER_R) continue;

    // Top cactus rect: top.x ± PIPE_W/2, y in [0, topHeight]
    if (rectCircle(cx - PIPE_W / 2, 0, PIPE_W, pipe.topHeight, px, py, PLAYER_R - 3)) {
      return die(s, 'cactus');
    }
    if (rectCircle(cx - PIPE_W / 2, pipe.botY, PIPE_W, FLOOR_Y - pipe.botY, px, py, PLAYER_R - 3)) {
      return die(s, 'cactus');
    }
  }
}

function rectCircle(rx, ry, rw, rh, cx, cy, cr) {
  const nx = Phaser.Math.Clamp(cx, rx, rx + rw);
  const ny = Phaser.Math.Clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}

function die(s, cause) {
  if (s.S.phase !== 'playing') return;
  s.S.phase = 'dying';
  s.player.alive = false;
  s.player.vy = -260;
  playSound(s, 'hit');
  triggerShake(s, 18);
  triggerFlash(s);
  for (let i = 0; i < 14; i += 1) {
    const p = s.add.rectangle(s.player.x, s.player.y, 5, 5, COLORS.banana);
    p.setDepth(9);
    const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.Between(40, 110);
    s.tweens.add({
      targets: p,
      x: p.x + Math.cos(ang) * dist,
      y: p.y + Math.sin(ang) * dist,
      angle: Phaser.Math.Between(-180, 180),
      alpha: 0,
      duration: 500 + Math.random() * 300,
      onComplete: () => p.destroy(),
    });
  }
}

// ---------- HUD ----------

function buildHud(s) {
  s.hud = {};
  s.hud.scoreShadow = s.add
    .text(W / 2 + 3, 73, '0', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#301818',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(11)
    .setVisible(false);
  s.hud.score = s.add
    .text(W / 2, 70, '0', {
      fontFamily: 'monospace',
      fontSize: '72px',
      color: '#ffe34d',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(11)
    .setVisible(false);

  s.hud.best = s.add
    .text(W - 18, 24, 'BEST 00', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#fff8c4',
      fontStyle: 'bold',
    })
    .setOrigin(1, 0)
    .setDepth(11)
    .setVisible(true);
}

function refreshScoreText(s) {
  s.hud.score.setText(String(s.S.score));
  s.hud.scoreShadow.setText(String(s.S.score));
}

function refreshBestText(s) {
  s.hud.best.setText(`BEST ${String(s.S.best).padStart(2, '0')}`);
}

function showHud(s) {
  s.hud.score.setVisible(true);
  s.hud.scoreShadow.setVisible(true);
}

function hideHud(s) {
  s.hud.score.setVisible(false);
  s.hud.scoreShadow.setVisible(false);
}

function addScore(s) {
  s.S.score += 1;
  refreshScoreText(s);
  if (s.S.score > s.S.best) {
    s.S.best = s.S.score;
    refreshBestText(s);
  }
  if (
    !s.S.beatBestThisRun &&
    s.S.previousBest > 0 &&
    s.S.score > s.S.previousBest
  ) {
    s.S.beatBestThisRun = true;
    spawnConfetti(s);
    playSound(s, 'newbest');
  }
  updateSky(s);
  pulseScore(s);
  playSound(s, 'point');
}

function pulseScore(s) {
  s.tweens.killTweensOf(s.hud.score);
  s.hud.score.setScale(1);
  s.tweens.add({
    targets: [s.hud.score, s.hud.scoreShadow],
    scaleX: 1.18,
    scaleY: 1.18,
    duration: 90,
    yoyo: true,
  });
}

// ---------- FLASH + SHAKE ----------

function buildFlash(s) {
  s.flash = s.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0);
  s.flash.setDepth(40);
}

function triggerFlash(s) {
  s.S.flashAlpha = 0.7;
  s.flash.setAlpha(s.S.flashAlpha);
}

function decayFlash(s, dt) {
  if (s.S.flashAlpha > 0) {
    s.S.flashAlpha = Math.max(0, s.S.flashAlpha - dt * 3);
    s.flash.setAlpha(s.S.flashAlpha);
  }
}

function triggerShake(s, amount) {
  s.S.shake = amount;
}

function decayShake(s, dt) {
  if (s.S.shake > 0) {
    s.S.shake = Math.max(0, s.S.shake - dt * 60);
    s.cameras.main.setScroll(
      (Math.random() - 0.5) * s.S.shake,
      (Math.random() - 0.5) * s.S.shake,
    );
  } else {
    s.cameras.main.setScroll(0, 0);
  }
}

// ---------- MENUS ----------

function buildMenu(s) {
  s.menu = {};
  const c = s.add.container(0, 0);
  c.setDepth(20);
  s.menu.container = c;

  const bg = s.add.rectangle(W / 2, H / 2, W, H, COLORS.overlay, 0.55);
  c.add(bg);

  // Title — big stacked banner
  const titleA = s.add
    .text(W / 2, 110, 'FLAPPY PLATANUS', {
      fontFamily: 'monospace',
      fontSize: '46px',
      color: '#ffe34d',
      fontStyle: 'bold',
      stroke: '#3b2914',
      strokeThickness: 8,
    })
    .setOrigin(0.5);
  const titleB = s.add
    .text(W / 2, 158, '— CDMX —', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#3b2914',
      strokeThickness: 4,
    })
    .setOrigin(0.5);
  c.add(titleA);
  c.add(titleB);
  s.tweens.add({
    targets: titleA,
    scale: 1.03,
    duration: 1100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  s.menu.buttons = [];
  // Buttons are built dynamically in setupMenuButtons() based on currentName
  setupMenuButtons(s);

  c.add(
    s.add
      .text(W / 2, 408, 'MEJORES VUELOS', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffe34d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
  s.menu.board = s.add
    .text(W / 2, 432, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fff8c4',
      align: 'center',
      lineSpacing: 4,
    })
    .setOrigin(0.5, 0);
  c.add(s.menu.board);

  c.add(
    s.add
      .text(W / 2, H - 26, '↕ MOVER       BOTÓN / START CONFIRMAR', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#fff8c4',
      })
      .setOrigin(0.5),
  );

  c.setVisible(false);
}

function showMenu(s) {
  s.S.phase = 'menu';
  s.S.menu = { cursor: 0, cooldown: 0, lastAxis: 0 };
  s.menu.container.setVisible(true);
  refreshMenuBoard(s);
  refreshBestText(s);
  updateMenuHighlight(s);
  hideHud(s);
  s.player.alpha = 1;
  s.player.rotation = 0;
}

function refreshMenuBoard(s) {
  if (!s.menu) return;
  const lines = s.S.scores.length
    ? s.S.scores.slice(0, 5).map((e, i) =>
        `${String(i + 1).padStart(2, '0')}  ${e.name.slice(0, 10).padEnd(10, ' ')}  ${String(e.score).padStart(3, ' ')}`,
      )
    : ['NO HAY VUELOS REGISTRADOS'];
  s.menu.board.setText(lines.join('\n'));
}

function setupMenuButtons(s) {
  // Destroy old buttons if any
  if (s.menu.buttons && s.menu.buttons.length) {
    for (const b of s.menu.buttons) {
      b.bg.destroy();
      b.label.destroy();
    }
  }
  s.menu.buttons = [];

  let defs;
  if (s.S.currentName) {
    defs = [
      { text: `JUGAR COMO ${s.S.currentName}`, action: 'play' },
      { text: 'JUGADOR NUEVO', action: 'newplayer' },
      { text: 'LEADERBOARD', action: 'leaderboard' },
      { text: 'CONTROLS', action: 'controls' },
    ];
  } else {
    defs = [
      { text: 'PLAY', action: 'play' },
      { text: 'LEADERBOARD', action: 'leaderboard' },
      { text: 'CONTROLS', action: 'controls' },
    ];
  }

  const yStart = defs.length === 4 ? 218 : 240;
  const ySpacing = defs.length === 4 ? 42 : 50;
  const fontSize = defs.length === 4 ? '19px' : '22px';
  for (let i = 0; i < defs.length; i += 1) {
    const y = yStart + i * ySpacing;
    const bgB = s.add.rectangle(W / 2, y, 340, 38, COLORS.cell, 0.95);
    bgB.setStrokeStyle(3, COLORS.frame, 1);
    const lab = s.add
      .text(W / 2, y, defs[i].text, {
        fontFamily: 'monospace',
        fontSize,
        color: '#fff8c4',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    s.menu.container.add(bgB);
    s.menu.container.add(lab);
    s.menu.buttons.push({ bg: bgB, label: lab, action: defs[i].action });
  }
  if (s.S.menu) {
    s.S.menu.cursor = Math.min(s.S.menu.cursor || 0, s.menu.buttons.length - 1);
  }
  if (s.menu.container.visible) updateMenuHighlight(s);
}

function updateMenuHighlight(s) {
  const cursor = s.S.menu.cursor;
  s.menu.buttons.forEach(({ bg, label }, i) => {
    const active = i === cursor;
    bg.setFillStyle(active ? COLORS.accent : COLORS.cell, active ? 1 : 0.95);
    bg.setStrokeStyle(3, active ? COLORS.white : COLORS.frame, 1);
    label.setColor(active ? '#2a1f10' : '#fff8c4');
  });
}

function handleMenu(s, time) {
  const m = s.S.menu;
  const axisY = getVAxis(s);

  if (time >= m.cooldown && axisY !== 0 && m.lastAxis !== axisY) {
    m.cursor = Phaser.Math.Wrap(m.cursor + axisY, 0, s.menu.buttons.length);
    m.cooldown = time + 160;
    updateMenuHighlight(s);
    playSound(s, 'click');
  }
  m.lastAxis = axisY === 0 ? 0 : axisY;

  if (consumeBtn(s, CONFIRM_BTNS)) {
    playSound(s, 'select');
    startAmbientMusic(s);
    const action = s.menu.buttons[m.cursor].action;
    if (action === 'play') {
      enterReady(s);
    } else if (action === 'newplayer') {
      s.S.currentName = null;
      saveCurrentName('');
      setupMenuButtons(s);
      enterReady(s);
    } else if (action === 'leaderboard') {
      showLeaderboard(s);
    } else if (action === 'controls') {
      showControls(s);
    }
  }
}

function buildLeaderboardScreen(s) {
  s.lbScreen = {};
  const c = s.add.container(0, 0);
  c.setDepth(22);
  s.lbScreen.container = c;
  c.add(s.add.rectangle(W / 2, H / 2, W, H, COLORS.overlay, 0.92));
  c.add(
    s.add
      .text(W / 2, 80, 'LEADERBOARD', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffe34d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
  c.add(
    s.add
      .text(W / 2, 116, 'MEJORES VUELOS PLATANEROS', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#fff8c4',
      })
      .setOrigin(0.5),
  );
  s.lbScreen.list = s.add
    .text(W / 2, 170, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#fff8c4',
      align: 'center',
      lineSpacing: 10,
    })
    .setOrigin(0.5, 0);
  c.add(s.lbScreen.list);
  c.add(
    s.add
      .text(W / 2, H - 28, 'BOTÓN / START PARA REGRESAR', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#a8a06a',
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
}

function showLeaderboard(s) {
  const lines = s.S.scores.length
    ? s.S.scores.map((e, i) =>
        `${String(i + 1).padStart(2, '0')}  ${e.name.slice(0, 10).padEnd(10, ' ')}  ${String(e.score).padStart(3, ' ')}`,
      )
    : ['NO HAY VUELOS REGISTRADOS'];
  s.lbScreen.list.setText(lines.join('\n'));
  s.menu.container.setVisible(false);
  s.lbScreen.container.setVisible(true);
  s.S.phase = 'leaderboard';
}

function buildControlsScreen(s) {
  s.ctScreen = {};
  const c = s.add.container(0, 0);
  c.setDepth(22);
  s.ctScreen.container = c;
  c.add(s.add.rectangle(W / 2, H / 2, W, H, COLORS.overlay, 0.92));
  c.add(
    s.add
      .text(W / 2, 100, 'CONTROLES', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffe34d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );

  const lines = [
    'CUALQUIER BOTÓN  ·  VOLAR',
    '',
    'P1   BOTÓN 1 / 2 / JOY ↑',
    'P2   BOTÓN 1 / 2 / JOY ↑',
    '',
    'START   PAUSAR / REGRESAR',
    '',
    'OBJETIVO',
    'PASA ENTRE LOS NOPALES SIN MORIR.',
    'CADA NOPAL = 1 PUNTO.',
  ];
  c.add(
    s.add
      .text(W / 2, 180, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#fff8c4',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0),
  );
  c.add(
    s.add
      .text(W / 2, H - 28, 'BOTÓN / START PARA REGRESAR', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#a8a06a',
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
}

function showControls(s) {
  s.menu.container.setVisible(false);
  s.ctScreen.container.setVisible(true);
  s.S.phase = 'controls';
}

function hideOverlays(s) {
  s.menu.container.setVisible(false);
  s.lbScreen.container.setVisible(false);
  s.ctScreen.container.setVisible(false);
  s.gameOver.container.setVisible(false);
  s.pause.container.setVisible(false);
  s.ready.container.setVisible(false);
}

// ---------- READY (pre-flight) ----------

function enterReady(s) {
  hideOverlays(s);
  s.S.phase = 'ready';
  destroyAllPipes(s);
  s.S.score = 0;
  s.player.y = H / 2;
  s.player.vy = 0;
  s.player.rotation = 0;
  refreshScoreText(s);
  showHud(s);
  s.ready.container.setVisible(true);
}

function destroyAllPipes(s) {
  for (const pipe of s.S.pipes) {
    pipe.top.destroy();
    pipe.bot.destroy();
  }
  s.S.pipes = [];
}

function buildReadyOverlay(s) {
  s.ready = {};
  const c = s.add.container(0, 0);
  c.setDepth(15);
  s.ready.container = c;
  s.ready.bigText = s.add
    .text(W / 2, H / 2 - 60, '¡VUELA FOUNDER!', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffe34d',
      fontStyle: 'bold',
      stroke: '#3b2914',
      strokeThickness: 6,
    })
    .setOrigin(0.5);
  s.ready.hint = s.add
    .text(W / 2, H / 2 + 50, 'PRESIONA BOTÓN PARA INICIAR', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#3b2914',
      strokeThickness: 3,
    })
    .setOrigin(0.5);
  c.add(s.ready.bigText);
  c.add(s.ready.hint);
  s.tweens.add({
    targets: s.ready.hint,
    alpha: 0.4,
    duration: 600,
    yoyo: true,
    repeat: -1,
  });
}

// ---------- PAUSE ----------

function buildPauseScreen(s) {
  s.pause = {};
  const c = s.add.container(0, 0);
  c.setDepth(25);
  s.pause.container = c;
  c.add(s.add.rectangle(W / 2, H / 2, W, H, COLORS.overlay, 0.7));
  c.add(
    s.add
      .text(W / 2, H / 2 - 24, 'PAUSA', {
        fontFamily: 'monospace',
        fontSize: '52px',
        color: '#ffe34d',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
  c.add(
    s.add
      .text(W / 2, H / 2 + 34, 'START PARA CONTINUAR', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#fff8c4',
      })
      .setOrigin(0.5),
  );
  c.setVisible(false);
}

function togglePause(s) {
  if (s.S.phase === 'playing') {
    s.S.phase = 'paused';
    s.pause.container.setVisible(true);
  } else if (s.S.phase === 'paused') {
    s.S.phase = 'playing';
    s.pause.container.setVisible(false);
  }
}

// ---------- GAME OVER + NAME ENTRY ----------

function buildGameOverUi(s) {
  s.gameOver = {};
  const c = s.add.container(0, 0);
  c.setDepth(30);
  s.gameOver.container = c;
  c.add(s.add.rectangle(W / 2, H / 2, W, H, COLORS.overlay, 0.85));

  s.gameOver.title = s.add
    .text(W / 2, 60, '¡SE CAYÓ EL PLÁTANO!', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#ff5b6b',
      fontStyle: 'bold',
      stroke: '#3b2914',
      strokeThickness: 4,
    })
    .setOrigin(0.5);
  c.add(s.gameOver.title);

  s.gameOver.scoreLabel = s.add
    .text(W / 2, 100, 'PUNTOS', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fff8c4',
    })
    .setOrigin(0.5);
  s.gameOver.scoreValue = s.add
    .text(W / 2, 134, '0', {
      fontFamily: 'monospace',
      fontSize: '46px',
      color: '#ffe34d',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  s.gameOver.bestNote = s.add
    .text(W / 2, 174, 'BEST 00', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#fff8c4',
    })
    .setOrigin(0.5);
  s.gameOver.newBest = s.add
    .text(W / 2, 174, '¡NUEVO RÉCORD!', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffe34d',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setVisible(false);
  c.add([s.gameOver.scoreLabel, s.gameOver.scoreValue, s.gameOver.bestNote, s.gameOver.newBest]);

  s.gameOver.nameLabel = s.add
    .text(W / 2, 210, 'INGRESA INICIALES', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#fff8c4',
    })
    .setOrigin(0.5);
  s.gameOver.nameValue = s.add
    .text(W / 2, 248, '__________', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#3b2914',
      strokeThickness: 5,
    })
    .setOrigin(0.5);
  s.gameOver.instructions = s.add
    .text(W / 2, 282, 'JOYSTICK MUEVE  ·  BOTÓN ESCRIBE  ·  END GUARDA  ·  SKIP SALE', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#a8a06a',
    })
    .setOrigin(0.5);
  s.gameOver.retryHint = s.add
    .text(W / 2, 248, 'PULSA BOTÓN PARA REINTENTAR\nSTART PARA REGRESAR AL MENÚ', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#fff8c4',
      align: 'center',
      lineSpacing: 6,
    })
    .setOrigin(0.5);
  s.gameOver.retryHint.setVisible(false);
  c.add([s.gameOver.nameLabel, s.gameOver.nameValue, s.gameOver.instructions, s.gameOver.retryHint]);

  s.gameOver.gridLabels = [];
  for (let row = 0; row < LETTER_GRID.length; row += 1) {
    const rowVals = LETTER_GRID[row];
    const rowWidth = rowVals.length * 56;
    for (let col = 0; col < rowVals.length; col += 1) {
      const value = rowVals[col];
      const cx = W / 2 - rowWidth / 2 + 28 + col * 56;
      const cy = 320 + row * 28;
      const cell = s.add.rectangle(cx, cy, value.length > 1 ? 64 : 42, 24, COLORS.cell, 0.95);
      cell.setStrokeStyle(2, COLORS.frame, 0.8);
      const label = s.add
        .text(cx, cy, value, {
          fontFamily: 'monospace',
          fontSize: value.length > 1 ? '14px' : '18px',
          color: '#fff8c4',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      s.gameOver.gridLabels.push({ cell, label, row, col, value });
      c.add(cell);
      c.add(label);
    }
  }

  s.gameOver.saveStatus = s.add
    .text(W / 2, H - 24, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffe34d',
    })
    .setOrigin(0.5);
  c.add(s.gameOver.saveStatus);

  c.setVisible(false);
}

function openGameOver(s) {
  s.S.phase = 'gameover';
  s.gameOver.container.setVisible(true);
  s.gameOver.scoreValue.setText(String(s.S.score));
  const newBest = s.S.score > 0 && s.S.score >= (s.S.scores[0]?.score || 0);
  s.gameOver.bestNote.setVisible(!newBest);
  s.gameOver.bestNote.setText(`BEST ${String(s.S.best).padStart(2, '0')}`);
  s.gameOver.newBest.setVisible(newBest);
  if (newBest) {
    s.tweens.killTweensOf(s.gameOver.newBest);
    s.gameOver.newBest.setScale(1);
    s.tweens.add({
      targets: s.gameOver.newBest,
      scale: 1.15,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  s.gameOver.saveStatus.setText(s.S.saveStatus);

  // Clear any stale button presses so the death-input doesn't auto-trigger entry
  clearPressed(s);
  s.S.autoSaved = false;

  const qualifies = scoreQualifies(s);
  const needsNameEntry = qualifies && !s.S.currentName;

  s.gameOver.nameLabel.setVisible(needsNameEntry);
  s.gameOver.nameValue.setVisible(needsNameEntry);
  s.gameOver.instructions.setVisible(needsNameEntry);
  for (const item of s.gameOver.gridLabels) {
    item.cell.setVisible(needsNameEntry);
    item.label.setVisible(needsNameEntry);
  }
  s.gameOver.retryHint.setVisible(!needsNameEntry);

  if (qualifies && s.S.currentName) {
    s.gameOver.retryHint.setText(
      `GUARDADO COMO ${s.S.currentName}\nBOTÓN: REINTENTAR   ·   START: MENÚ`,
    );
    autoSaveScore(s);
  } else if (!qualifies) {
    s.gameOver.retryHint.setText(
      'BOTÓN PARA REINTENTAR\nSTART PARA REGRESAR AL MENÚ',
    );
  }

  if (needsNameEntry) {
    s.S.name.letters = [];
    s.S.name.row = 0;
    s.S.name.col = 0;
    s.S.name.moveCd = s.time.now + 250;
    s.S.name.confirmCd = s.time.now + 250;
    s.S.name.lastMove = { x: 0, y: 0 };
    refreshNameValue(s);
    updateGridHighlight(s);
  }
  hideHud(s);
}

function autoSaveScore(s) {
  if (s.S.autoSaved) return;
  s.S.autoSaved = true;
  const entry = {
    name: s.S.currentName,
    score: s.S.score,
    savedAt: new Date().toISOString().slice(0, 10),
  };
  persistScore(entry)
    .then((next) => {
      s.S.scores = next;
      s.S.best = next[0] && next[0].score ? next[0].score : s.S.best;
      refreshBestText(s);
      refreshMenuBoard(s);
    })
    .catch(() => {});
}

function clearPressed(s) {
  if (!s.ctrl) return;
  for (const k of Object.keys(s.ctrl.pressed)) {
    s.ctrl.pressed[k] = false;
  }
}

function handleNameEntry(s, time) {
  const entry = s.S.name;
  const ax = getHAxis(s);
  const ay = getVAxis(s);

  if (
    time >= entry.moveCd &&
    (ax !== 0 || ay !== 0) &&
    (entry.lastMove.x !== ax || entry.lastMove.y !== ay)
  ) {
    moveLetter(s, ax, ay);
    entry.moveCd = time + 150;
    playSound(s, 'click');
  }
  if (ax === 0 && ay === 0) entry.lastMove = { x: 0, y: 0 };
  else entry.lastMove = { x: ax, y: ay };

  if (
    time >= entry.confirmCd &&
    consumeBtn(s, CONFIRM_BTNS)
  ) {
    entry.confirmCd = time + 180;
    playSound(s, 'select');
    activateLetter(s);
  }
}

function moveLetter(s, ax, ay) {
  const entry = s.S.name;
  if (ay !== 0) {
    entry.row = Phaser.Math.Wrap(entry.row + ay, 0, LETTER_GRID.length);
    entry.col = Math.min(entry.col, LETTER_GRID[entry.row].length - 1);
  }
  if (ax !== 0) {
    entry.col = Phaser.Math.Wrap(entry.col + ax, 0, LETTER_GRID[entry.row].length);
  }
  updateGridHighlight(s);
}

function updateGridHighlight(s) {
  const entry = s.S.name;
  for (const item of s.gameOver.gridLabels) {
    const active = item.row === entry.row && item.col === entry.col;
    item.cell.setFillStyle(active ? COLORS.accent : COLORS.cell, active ? 1 : 0.95);
    item.cell.setStrokeStyle(2, active ? COLORS.white : COLORS.frame, 1);
    item.label.setColor(active ? '#2a1f10' : '#fff8c4');
  }
}

function activateLetter(s) {
  const entry = s.S.name;
  const value = LETTER_GRID[entry.row][entry.col];
  if (value === 'DEL') {
    entry.letters.pop();
    refreshNameValue(s);
    return;
  }
  if (value === 'SKIP') {
    hideOverlays(s);
    showMenu(s);
    return;
  }
  if (value === 'END') {
    if (entry.letters.length === 0) {
      s.gameOver.saveStatus.setText('Elige al menos una letra o usa SKIP.');
      return;
    }
    submitScore(s);
    return;
  }
  if (entry.letters.length >= NAME_LEN) return;
  entry.letters.push(value);
  refreshNameValue(s);
}

function refreshNameValue(s) {
  let display = s.S.name.letters.join('');
  while (display.length < NAME_LEN) display += '_';
  s.gameOver.nameValue.setText(display);
}

function scoreQualifies(s) {
  if (s.S.score <= 0) return false;
  if (s.S.scores.length < MAX_SCORES) return true;
  const lowest = s.S.scores[s.S.scores.length - 1].score;
  return s.S.score > lowest;
}

function submitScore(s) {
  if (s.S.phase !== 'gameover') return;
  const initials = s.S.name.letters.join('').slice(0, NAME_LEN) || '???';
  const entry = {
    name: initials,
    score: s.S.score,
    savedAt: new Date().toISOString().slice(0, 10),
  };
  s.S.currentName = initials;
  saveCurrentName(initials);
  setupMenuButtons(s);
  s.S.saveStatus = `Guardado ${initials}!  Botón: reintentar.`;
  s.gameOver.saveStatus.setText(s.S.saveStatus);
  s.S.phase = 'saved';
  persistScore(entry)
    .then((next) => {
      s.S.scores = next;
      s.S.best = next[0]?.score || s.S.best;
      refreshBestText(s);
      refreshMenuBoard(s);
    })
    .catch(() => {
      s.S.saveStatus = 'No se pudo guardar el récord.';
      s.gameOver.saveStatus.setText(s.S.saveStatus);
    });
}

// ---------- INPUT ----------

function buildControls(s) {
  s.ctrl = {
    held: Object.create(null),
    pressed: Object.create(null),
  };

  const down = (e) => {
    const key = normKey(e.key);
    if (!key) return;
    const code = KEY_TO_ARCADE[key];
    if (!code) return;
    if (!s.ctrl.held[code]) s.ctrl.pressed[code] = true;
    s.ctrl.held[code] = true;
  };
  const up = (e) => {
    const key = normKey(e.key);
    if (!key) return;
    const code = KEY_TO_ARCADE[key];
    if (!code) return;
    s.ctrl.held[code] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  s.events.once('shutdown', () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
  });
}

function isHeld(s, code) {
  return s.ctrl.held[code] === true;
}

function consumeBtn(s, codes) {
  for (const code of codes) {
    if (s.ctrl.pressed[code]) {
      s.ctrl.pressed[code] = false;
      return true;
    }
  }
  return false;
}

function getHAxis(s) {
  let a = 0;
  if (isHeld(s, 'P1_L') || isHeld(s, 'P2_L')) a -= 1;
  if (isHeld(s, 'P1_R') || isHeld(s, 'P2_R')) a += 1;
  return Phaser.Math.Clamp(a, -1, 1);
}

function getVAxis(s) {
  let a = 0;
  if (isHeld(s, 'P1_U') || isHeld(s, 'P2_U')) a -= 1;
  if (isHeld(s, 'P1_D') || isHeld(s, 'P2_D')) a += 1;
  return Phaser.Math.Clamp(a, -1, 1);
}

function normKey(k) {
  if (typeof k !== 'string' || k.length === 0) return '';
  if (k === ' ') return 'space';
  return k.toLowerCase();
}

// ---------- SKY DAY → NIGHT ----------

const SKY_PALETTES = [
  // 0: Sunset day
  { top: 0xfc6b3b, mid: 0xffa256, low: 0xffd28a, sun: 0xfff2a8, sunRing: 0xffd66e },
  // 1: Dusk
  { top: 0x6d3a6b, mid: 0xb45c7c, low: 0xe89a78, sun: 0xff8a5a, sunRing: 0xd25a3a },
  // 2: Night
  { top: 0x0b1240, mid: 0x171f5f, low: 0x252e7a, sun: 0xe8e6f8, sunRing: 0x5a5a90 },
];

function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

function updateSky(s) {
  const score = s.S.score;
  let p1, p2, t;
  if (score <= 12) {
    p1 = SKY_PALETTES[0]; p2 = SKY_PALETTES[0]; t = 0;
  } else if (score < 35) {
    p1 = SKY_PALETTES[0]; p2 = SKY_PALETTES[1]; t = (score - 12) / 23;
  } else if (score < 70) {
    p1 = SKY_PALETTES[1]; p2 = SKY_PALETTES[2]; t = (score - 35) / 35;
  } else {
    p1 = SKY_PALETTES[2]; p2 = SKY_PALETTES[2]; t = 1;
  }
  s.skyTop.setFillStyle(lerpColor(p1.top, p2.top, t));
  s.skyMid.setFillStyle(lerpColor(p1.mid, p2.mid, t));
  s.skyLow.setFillStyle(lerpColor(p1.low, p2.low, t));
  s.sun.setFillStyle(lerpColor(p1.sun, p2.sun, t));
  s.sunRing.setFillStyle(lerpColor(p1.sunRing, p2.sunRing, t));

  // Stars get brighter at night
  const nightAmount = Phaser.Math.Clamp((score - 25) / 45, 0, 1);
  for (const st of s.stars) {
    st.obj.setAlpha(st.baseAlpha * nightAmount);
  }
}

// ---------- CONFETTI ----------

function spawnConfetti(s) {
  const colors = [0xffd700, 0xffe34d, 0xfff39a, 0xc88a1a, 0xffffff];
  for (let i = 0; i < 50; i += 1) {
    const x = Phaser.Math.Between(60, W - 60);
    const y = Phaser.Math.Between(-40, 40);
    const piece = s.add.rectangle(x, y, 6, 10, colors[i % colors.length]);
    piece.setDepth(18);
    piece.setAngle(Phaser.Math.Between(0, 360));
    const driftX = Phaser.Math.Between(-90, 90);
    s.tweens.add({
      targets: piece,
      y: H + 50,
      duration: Phaser.Math.Between(1600, 2800),
      ease: 'Quad.easeIn',
      onComplete: () => piece.destroy(),
    });
    s.tweens.add({
      targets: piece,
      x: x + driftX,
      angle: piece.angle + Phaser.Math.Between(180, 720),
      duration: Phaser.Math.Between(1600, 2800),
      ease: 'Sine.easeInOut',
    });
  }
}

// ---------- AUDIO ----------

function playSound(s, type) {
  try {
    const ctx = s.sound && s.sound.context ? s.sound.context : new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'flap') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'point') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'select') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'newbest') {
      // Triumphant ascending arpeggio C5-E5-G5-C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const ga = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        o.connect(ga);
        ga.connect(ctx.destination);
        const t = now + i * 0.09;
        ga.gain.setValueAtTime(0.001, t);
        ga.gain.linearRampToValueAtTime(0.18, t + 0.02);
        ga.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t);
        o.stop(t + 0.2);
      });
    }
  } catch (_) {}
}

function startAmbientMusic(scene) {
  if (scene.S.musicStarted) return;
  scene.S.musicStarted = true;
  try {
    const ctx = scene.sound.context;
    if (!ctx) return;

    const out = ctx.createGain();
    out.gain.value = 0.16;
    out.connect(ctx.destination);

    // Cumbia-ish chiptune: I-V-vi-IV in A minor: Am — Em — F — G
    const CHORDS = [
      [220, 261.63, 329.63], // Am
      [164.81, 246.94, 329.63], // Em7-ish
      [174.61, 220, 261.63],  // F
      [196, 246.94, 293.66],  // G
    ];

    const BAR = 1.6;
    function scheduleChord(t0, idx) {
      const chord = CHORDS[idx % CHORDS.length];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(out);
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + BAR - 0.05);
        osc.start(t0);
        osc.stop(t0 + BAR);
      });

      // Bass — root note
      const bass = ctx.createOscillator();
      const bg = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = chord[0] / 2;
      bass.connect(bg);
      bg.connect(out);
      bg.gain.setValueAtTime(0.24, t0);
      bg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      bass.start(t0);
      bass.stop(t0 + 0.55);

      // Bass pulse off-beat
      const bass2 = ctx.createOscillator();
      const bg2 = ctx.createGain();
      bass2.type = 'sine';
      bass2.frequency.value = chord[0] / 2;
      bass2.connect(bg2);
      bg2.connect(out);
      bg2.gain.setValueAtTime(0.2, t0 + BAR / 2);
      bg2.gain.exponentialRampToValueAtTime(0.001, t0 + BAR / 2 + 0.4);
      bass2.start(t0 + BAR / 2);
      bass2.stop(t0 + BAR / 2 + 0.45);

      // Arpeggio sparkle
      const arpNotes = [chord[0] * 4, chord[1] * 2, chord[2] * 2, chord[1] * 2];
      arpNotes.forEach((freq, i) => {
        const t = t0 + i * (BAR / 4);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(out);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (BAR / 4) - 0.04);
        osc.start(t);
        osc.stop(t + (BAR / 4));
      });

      scene.time.delayedCall(BAR * 1000, () => scheduleChord(t0 + BAR, idx + 1));
    }

    scheduleChord(ctx.currentTime + 0.2, 0);
  } catch (_) {}
}

// ---------- STORAGE ----------

function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null
          ? { found: false, value: null }
          : { found: true, value: JSON.parse(raw) };
      } catch {
        return { found: false, value: null };
      }
    },
    async set(key, value) {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
  };
}

async function loadScores() {
  const r = await getStorage().get(STORAGE_KEY);
  if (!r.found || !Array.isArray(r.value)) return [];
  return r.value
    .filter((e) => e && typeof e.name === 'string' && typeof e.score === 'number')
    .slice(0, MAX_SCORES);
}

async function persistScore(entry) {
  const existing = await loadScores();
  const next = existing
    .concat(entry)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.savedAt < b.savedAt ? 1 : -1;
    })
    .slice(0, MAX_SCORES);
  await getStorage().set(STORAGE_KEY, next);
  return next;
}

async function loadCurrentName() {
  try {
    const r = await getStorage().get(STORAGE_NAME_KEY);
    if (r.found && typeof r.value === 'string' && r.value.length > 0) return r.value;
  } catch (_) {}
  return null;
}

async function saveCurrentName(name) {
  try {
    return await getStorage().set(STORAGE_NAME_KEY, name || '');
  } catch (_) {}
}
