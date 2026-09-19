## Analysis
Build a classic browser Snake game in the existing HTML/CSS/JS scaffold: keyboard-controlled snake, food, score, game over, and restart — matching the current dark theme tokens.

## Files to Change
- index.html (edit) — replace the placeholder with a score HUD, canvas, and start/game-over overlay
- style.css (edit) — layout and style the board, HUD, overlay, and keep existing button/focus tokens
- script.js (edit) — implement the full game loop, input, collisions, and restart

## Implementation Steps
1. In index.html, replace the `#app` heading with a compact game shell: a title, a score (and high-score) readout, a single `<canvas id="board">` (fixed logical size, e.g. 400×400), and an overlay (`#overlay`) with a status message plus a Start/Play again button. Keep the existing `style.css` and `script.js` links.
2. In style.css, keep the existing `:root` tokens and body centering. Style `#app` as a narrow column (gap via `--space-4`/`--space-6`). Give the canvas a `--surface` background, `--border` stroke, `--radius-md`, and `--shadow`. Style the HUD as muted small text with the current score emphasized. Position the overlay over the canvas (absolute, centered) with a dimmed backdrop, and reuse the existing `button` rules. On narrow viewports, scale the canvas down with `max-width: 100%` and `height: auto`.
3. In script.js, define constants: grid size 20×20, cell size derived from canvas width, tick interval around 120ms, and colors drawn from the CSS variables (`--accent` for the snake head, a slightly dimmer fill for the body, a contrasting food color, `--bg`/`--surface` for the board).
4. Hold game state in plain objects: `snake` as an array of `{x,y}` cells (head at index 0), `dir` and `nextDir` as unit vectors, `food`, `score`, `highScore` (read/write `localStorage` key `snake-high-score`), `running`, and `tickTimer`.
5. Implement helpers: `randomEmptyCell()` that never spawns food on the snake; `placeFood()`; `resetGame()` that centers a 3-segment snake moving right and places food; `draw()` that clears the canvas, paints a faint grid, food, and snake (head distinct from body).
6. Implement `step()`: apply `nextDir` to `dir` (ignore 180° reversals so the snake cannot fold into itself on one tick); compute the next head; if it hits a wall or any snake cell, call `endGame()`; otherwise unshift the head; if the head is on food, increment score, update high score, place new food (do not pop the tail); else pop the tail; then `draw()`.
7. Wire keyboard input on `window`: Arrow keys and WASD set `nextDir`. Space or Enter starts/restarts when not running. Call `preventDefault()` on those keys so the page does not scroll.
8. Overlay flow: on load, draw an empty board and show “Press Start or Space”. Start button / Space begins the loop (`setInterval(step, tickInterval)`). On death, clear the interval, set `running = false`, show “Game over” plus the score, and change the button to “Play again”. Restart calls `resetGame()` and starts the interval again.
9. On load, read the stored high score, call `resetGame()` (without starting), `draw()`, and show the overlay so the page is playable immediately on open.

## Complexity
Moderate (5-15 min)