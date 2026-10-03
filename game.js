"use strict";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const overlayIcon = document.querySelector("#overlayIcon");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const pauseIcon = document.querySelector("#pauseIcon");
const restartButton = document.querySelector("#restartButton");
const soundButton = document.querySelector("#soundButton");
const difficultySelect = document.querySelector("#difficulty");

const GRID = 20;
const CELL = canvas.width / GRID;
const speeds = { slow: 190, normal: 130, fast: 85 };
const directions = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, ц: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, ы: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, ф: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, в: { x: 1, y: 0 }
};

let snake, food, direction, nextDirection, score, timer;
let state = "ready";
let soundEnabled = true;
let audioContext;
let best = Number(localStorage.getItem("neon-snake-best") || 0);
let difficulty = localStorage.getItem("neon-snake-difficulty") || "slow";
difficultySelect.value = difficulty;
bestElement.textContent = formatScore(best);

function formatScore(value) { return String(value).padStart(3, "0"); }

function resetGame() {
  clearInterval(timer);
  snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }, { x: 7, y: 11 }];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  food = createFood();
  scoreElement.textContent = formatScore(score);
  draw();
}

function createFood() {
  let point;
  do {
    point = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake?.some(part => part.x === point.x && part.y === point.y));
  return point;
}

function startGame() {
  resetGame();
  state = "playing";
  overlay.classList.add("hidden");
  pauseIcon.textContent = "Ⅱ";
  timer = setInterval(tick, speeds[difficulty]);
  playTone(420, .05);
}

function tick() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const crashed = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID || snake.some(part => part.x === head.x && part.y === head.y);
  if (crashed) return gameOver();

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = formatScore(score);
    food = createFood();
    playTone(690, .07);
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#0c1325");
  background.addColorStop(1, "#090e1c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(126, 147, 197, .055)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  drawFood();
  snake.forEach((part, index) => drawSnakePart(part, index));
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawSnakePart(part, index) {
  const padding = 2.5;
  const x = part.x * CELL + padding;
  const y = part.y * CELL + padding;
  const size = CELL - padding * 2;
  ctx.save();
  ctx.shadowBlur = index === 0 ? 18 : 9;
  ctx.shadowColor = index < 3 ? "#72fff0" : "#8465ee";
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, index === 0 ? "#a2fff4" : "#7166e5");
  gradient.addColorStop(1, index === 0 ? "#5ce3d7" : "#a45ee8");
  ctx.fillStyle = gradient;
  roundedRect(x, y, size, size, index === 0 ? 9 : 7);
  ctx.fill();
  if (index === 0) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#10192b";
    const horizontal = direction.x !== 0;
    const eyeX = direction.x < 0 ? x + 7 : x + size - 8;
    const eyeY = direction.y < 0 ? y + 7 : y + size - 8;
    [[horizontal ? eyeX : x + 8, horizontal ? y + 8 : eyeY], [horizontal ? eyeX : x + size - 8, horizontal ? y + size - 8 : eyeY]].forEach(([ex, ey]) => {
      ctx.beginPath(); ctx.arc(ex, ey, 2.1, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.restore();
}

function drawFood() {
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#6ffff0";
  const glow = ctx.createLinearGradient(-10, -10, 10, 10);
  glow.addColorStop(0, "#ffffff"); glow.addColorStop(.35, "#76fff0"); glow.addColorStop(1, "#8d6bff");
  ctx.fillStyle = glow;
  roundedRect(-8, -8, 16, 16, 4);
  ctx.fill();
  ctx.restore();
}

function setDirection(newDirection) {
  if (state === "ready" || state === "over") startGame();
  if (state !== "playing") return;
  if (newDirection.x !== -direction.x || newDirection.y !== -direction.y) nextDirection = newDirection;
}

function togglePause() {
  if (state === "ready" || state === "over") return;
  if (state === "playing") {
    clearInterval(timer);
    state = "paused";
    pauseIcon.textContent = "▶";
    showOverlay("Ⅱ", "ПАУЗА", "Передохни", "Продолжи, когда будешь готов.", "Продолжить");
  } else {
    state = "playing";
    pauseIcon.textContent = "Ⅱ";
    overlay.classList.add("hidden");
    timer = setInterval(tick, speeds[difficulty]);
  }
}

function gameOver() {
  clearInterval(timer);
  state = "over";
  playTone(145, .18);
  if (score > best) {
    best = score;
    localStorage.setItem("neon-snake-best", best);
    bestElement.textContent = formatScore(best);
  }
  showOverlay("◇", "ИГРА ОКОНЧЕНА", `Счёт: ${score}`, "Ещё одна попытка — новый шанс на рекорд.", "Играть снова");
}

function showOverlay(icon, kicker, title, text, button) {
  overlayIcon.textContent = icon;
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.firstChild.textContent = `${button} `;
  overlay.classList.remove("hidden");
}

function playTone(frequency, duration) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.06, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}

document.addEventListener("keydown", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (directions[key]) { event.preventDefault(); setDirection(directions[key]); }
  if (event.code === "Space") { event.preventDefault(); togglePause(); }
});
startButton.addEventListener("click", () => state === "paused" ? togglePause() : startGame());
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", startGame);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundButton.classList.toggle("off", !soundEnabled);
  soundButton.setAttribute("aria-pressed", soundEnabled);
  if (soundEnabled) playTone(520, .05);
});
difficultySelect.addEventListener("change", () => {
  difficulty = difficultySelect.value;
  localStorage.setItem("neon-snake-difficulty", difficulty);
  if (state === "playing") {
    clearInterval(timer);
    timer = setInterval(tick, speeds[difficulty]);
  }
});
document.querySelectorAll("[data-direction]").forEach(button => {
  button.addEventListener("click", () => setDirection(directions[`Arrow${button.dataset.direction[0].toUpperCase()}${button.dataset.direction.slice(1)}`]));
});

resetGame();
