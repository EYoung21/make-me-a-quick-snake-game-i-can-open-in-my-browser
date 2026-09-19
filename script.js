document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("board");
  const overlay = document.getElementById("overlay");
  const overlayMessage = document.getElementById("overlay-message");
  const startBtn = document.getElementById("start-btn");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");

  if (!canvas || !overlay || !overlayMessage || !startBtn || !scoreEl || !highScoreEl) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const GRID = 20;
  const CELL = canvas.width / GRID;
  const BASE_TICK = 0.12;
  const MIN_TICK = 0.07;
  const HIGH_SCORE_KEY = "snake-high-score";

  const styles = getComputedStyle(document.documentElement);
  const COLORS = {
    bg: styles.getPropertyValue("--surface").trim() || "#1a1a1f",
    grid: "rgba(255, 255, 255, 0.04)",
    head: styles.getPropertyValue("--accent").trim() || "#6d6dff",
    body: styles.getPropertyValue("--accent-dim").trim() || "#4a4ad4",
    food: styles.getPropertyValue("--food").trim() || "#ff6b7a",
  };

  const DIRS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
    W: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    A: { x: -1, y: 0 },
    D: { x: 1, y: 0 },
  };

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 10, y: 10 };
  let score = 0;
  let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
  let gameState = "menu";
  let accumulator = 0;
  let lastFrameTime = 0;
  let shake = 0;
  let particles = [];
  let popups = [];
  let audioCtx = null;

  function tickInterval() {
    return Math.max(MIN_TICK, BASE_TICK - score * 0.004);
  }

  function cellsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function onSnake(cell) {
    return snake.some((seg) => cellsEqual(seg, cell));
  }

  function randomEmptyCell() {
    const empty = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        const cell = { x, y };
        if (!onSnake(cell)) empty.push(cell);
      }
    }
    if (!empty.length) return { x: 0, y: 0 };
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function placeFood() {
    food = randomEmptyCell();
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    highScoreEl.textContent = String(highScore);
  }

  function persistHighScore() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    }
    updateHud();
  }

  function resetGame() {
    const mid = Math.floor(GRID / 2);
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    accumulator = 0;
    shake = 0;
    particles = [];
    popups = [];
    placeFood();
    updateHud();
  }

  function showOverlay(message, buttonLabel) {
    overlayMessage.textContent = message;
    startBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
      ${buttonLabel}
    `;
    overlay.hidden = false;
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep(freq, duration, type = "square", gainValue = 0.05) {
    const audio = ensureAudio();
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  }

  function spawnParticles(cell, color, count) {
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 40 + Math.random() * 80;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  function spawnPopup(cell, text) {
    popups.push({
      x: cell.x * CELL + CELL / 2,
      y: cell.y * CELL,
      text,
      life: 0.7,
    });
  }

  function applyDir() {
    if (nextDir.x === -dir.x && nextDir.y === -dir.y) return;
    dir = nextDir;
  }

  function endGame() {
    gameState = "gameover";
    shake = 0.28;
    spawnParticles(snake[0], COLORS.head, 14);
    beep(140, 0.28, "sawtooth", 0.06);
    persistHighScore();
    showOverlay(`Game over · ${score} point${score === 1 ? "" : "s"}`, "Play again");
  }

  function step() {
    applyDir();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || onSnake(head)) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (cellsEqual(head, food)) {
      score += 1;
      persistHighScore();
      spawnParticles(head, COLORS.food, 10);
      spawnPopup(head, "+1");
      beep(520, 0.09, "square", 0.045);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function update(deltaSeconds) {
    accumulator += deltaSeconds;
    const interval = tickInterval();
    while (gameState === "playing" && accumulator >= interval) {
      accumulator -= interval;
      step();
    }

    shake = Math.max(0, shake - deltaSeconds * 1.8);

    particles = particles.filter((p) => {
      p.life -= deltaSeconds;
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      p.vx *= 0.92;
      p.vy *= 0.92;
      return p.life > 0;
    });

    popups = popups.filter((p) => {
      p.life -= deltaSeconds;
      p.y -= 28 * deltaSeconds;
      return p.life > 0;
    });
  }

  function drawRounded(x, y, size, radius) {
    const r = Math.min(radius, size / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + size, y, x + size, y + size, r);
    ctx.arcTo(x + size, y + size, x, y + size, r);
    ctx.arcTo(x, y + size, x, y, r);
    ctx.arcTo(x, y, x + size, y, r);
    ctx.closePath();
  }

  function render() {
    const ox = shake ? (Math.random() - 0.5) * 10 * shake : 0;
    const oy = shake ? (Math.random() - 0.5) * 10 * shake : 0;

    ctx.setTransform(1, 0, 0, 1, ox, oy);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(-8, -8, canvas.width + 16, canvas.height + 16);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID; i += 1) {
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
    }
    ctx.stroke();

    const pad = 2;
    drawRounded(food.x * CELL + pad, food.y * CELL + pad, CELL - pad * 2, 6);
    ctx.fillStyle = COLORS.food;
    ctx.fill();

    snake.forEach((seg, i) => {
      const inset = i === 0 ? 1 : 2.5;
      drawRounded(seg.x * CELL + inset, seg.y * CELL + inset, CELL - inset * 2, 5);
      ctx.fillStyle = i === 0 ? COLORS.head : COLORS.body;
      ctx.fill();
    });

    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    popups.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 0.7);
      ctx.fillStyle = "#fff";
      ctx.font = "600 14px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function startGame() {
    resetGame();
    gameState = "playing";
    hideOverlay();
    ensureAudio();
  }

  function togglePause() {
    if (gameState === "playing") {
      gameState = "paused";
      showOverlay("Paused", "Resume");
    } else if (gameState === "paused") {
      gameState = "playing";
      hideOverlay();
    }
  }

  function frame(now) {
    const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    if (gameState === "playing") update(deltaSeconds);
    else {
      shake = Math.max(0, shake - deltaSeconds * 1.8);
      particles = particles.filter((p) => {
        p.life -= deltaSeconds;
        p.x += p.vx * deltaSeconds;
        p.y += p.vy * deltaSeconds;
        return p.life > 0;
      });
    }
    render();
    requestAnimationFrame(frame);
  }

  startBtn.addEventListener("click", () => {
    if (gameState === "paused") {
      gameState = "playing";
      hideOverlay();
      return;
    }
    startGame();
  });

  window.addEventListener("keydown", (event) => {
    const move = DIRS[event.key];
    if (move) {
      event.preventDefault();
      if (gameState === "playing") nextDir = move;
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (gameState === "menu" || gameState === "gameover") startGame();
      else if (gameState === "paused") {
        gameState = "playing";
        hideOverlay();
      }
      return;
    }

    if (event.key === "p" || event.key === "P" || event.key === "Escape") {
      event.preventDefault();
      togglePause();
    }
  });

  highScoreEl.textContent = String(highScore);
  resetGame();
  showOverlay("Press Start or Space", "Start");
  lastFrameTime = performance.now();
  requestAnimationFrame(frame);
});

