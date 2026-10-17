# Carom

Carom is a top-down paddle duel that runs entirely in the browser. Two paddles face each other across a dark field while a ball ricochets between them, off the top and bottom walls, and off a pair of obstacles in the middle of the field. Moving your paddle as it strikes the ball adds spin that curves the ball's flight afterward, turning the obstacles into a bank-shot puzzle. A player scores when the ball passes the far edge behind their opponent's paddle; the first to 11 points, ahead by at least 2, wins.

Play Solo against an AI opponent, or Versus with two local players sharing a keyboard.

## Install

```sh
npm ci
```

## Run in development

```sh
npm run dev
```

Then open the URL Vite prints in your browser.

## Production build

```sh
npm run build
```

This type-checks the project and emits the complete static site into `dist/`, with `index.html` at its root. Serve that directory as-is at the root of any static file server, for example:

```sh
npm run preview
```

## Controls

| Action          | Keys                    |
| --------------- | ----------------------- |
| Player 1 up     | `W`                     |
| Player 1 down   | `S`                     |
| Player 2 up     | `ArrowUp`               |
| Player 2 down   | `ArrowDown`             |
| Confirm / serve | `Enter` or `Space`      |
| Back            | `Escape`                |
| Pause           | `P` or `Escape`         |
| Mute            | `M`                     |

In Solo, both `W`/`S` and the arrow keys move the left (player one) paddle; the AI controls the right paddle. In Versus, each player uses their own keys. Menus can also be used with a mouse or touch: hover or touch an item to highlight it, and press and release inside an item to choose it. On touch devices, the engine's on-screen vertical sliders move the paddles.

Move a paddle while it strikes the ball to add spin — downward motion adds positive (clockwise-curving) spin and upward motion adds negative spin. Spin decays over time and survives wall and obstacle bounces.

## Tests and checks

```sh
npm test               # Vitest unit tests with coverage
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format         # Prettier (check mode)
```

Everything is drawn in code on a canvas; the build ships no art or audio files and fetches nothing at runtime.
