import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  BALL_R,
  BINDINGS,
  CAROM_DEBUG_VERSION,
  CUES,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  HOLD_TIME,
  MATCHOVER_ITEMS,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  NET_X,
  OBSTACLE_CENTERS,
  OBSTACLES,
  P1_X0,
  P1_X1,
  P2_X0,
  P2_X1,
  PADDLE_HALF,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
  PADDLE_H,
  PADDLE_W,
  PAUSE_ITEMS,
  SERVE_ANGLE,
  SERVE_SPEED,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
  TITLE_ITEMS,
  TITLE_TEXT,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "./constants";

export const BACKGROUND = "#0b1020";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";

export type Side = "left" | "right";

export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}

export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}

export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}

export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}

export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";

  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;

  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;

  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];

  readonly simTime: number;
  readonly muted: boolean;
}

export interface MenuRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaromSnapshot {
  version: number;
  screen: Screen;
  mode: Mode;
  menuIndex: number;
  titleIndex: number;
  resumeScreen: "countdown" | "playing";
  score: { p1: number; p2: number };
  winner: Side | null;
  muted: boolean;
  paddles: {
    left: { cy: number; vy: number; drivenVy: number; driven: boolean };
    right: { cy: number; vy: number; drivenVy: number; driven: boolean };
  };
  ai: { tracking: boolean; movement: boolean };
  receiver: Side;
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    spin: number;
    held: boolean;
    holdTimer: number;
    serveSign: 1 | -1;
    trail: { x: number; y: number; t: number }[];
  } | null;
  obstacles: { index: number; cx: number; cy: number }[];
  simTime: number;
}

type S = DeepReadonly<CaromState>;

export interface CaromDebugApi {
  readonly version: number;
  clearWorld(state: S): CaromState;
  spawnBall(state: S): CaromState;
  spawnObstacle(state: S, index: number): CaromState;
  reset(state: S): CaromState;
  reconcile(state: S): CaromState;
  setScreen(state: S, screen: Screen): CaromState;
  setMode(state: S, mode: Mode): CaromState;
  setMenuIndex(state: S, index: number): CaromState;
  setTitleIndex(state: S, index: number): CaromState;
  setResumeScreen(state: S, screen: "countdown" | "playing"): CaromState;
  setScore(state: S, p1: number, p2: number): CaromState;
  setWinner(state: S, side: Side | null): CaromState;
  setReceiver(state: S, side: Side): CaromState;
  setPaddleCy(state: S, side: Side, cy: number): CaromState;
  setPaddleVy(state: S, side: Side, vy: number): CaromState;
  setPaddleDriven(state: S, side: Side, driven: boolean): CaromState;
  setBallPosition(state: S, x: number, y: number): CaromState;
  setBallVelocity(state: S, vx: number, vy: number): CaromState;
  setBallSpin(state: S, spin: number): CaromState;
  setBallHeld(state: S, held: boolean): CaromState;
  setBallHoldTimer(state: S, seconds: number): CaromState;
  setBallServeSign(state: S, sign: 1 | -1): CaromState;
  drawBallServeSign(state: S): CaromState;
  setAiTracking(state: S, enabled: boolean): CaromState;
  setAiMovement(state: S, enabled: boolean): CaromState;
  setMuted(state: S, muted: boolean): CaromState;
  snapshot(state: S): CaromSnapshot;
  menuItemRect(state: S, index: number): MenuRect | null;
}

const HOWTO_ITEMS = ["BACK"] as const;

function freshServeSign(): 1 | -1 {
  return Math.random() < 0.5 ? 1 : -1;
}

function parkedBall(): BallState {
  return {
    x: FIELD_CX,
    y: FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: HOLD_TIME,
    serveSign: freshServeSign(),
    trail: [],
  };
}

function defaultObstacles(): ObstacleState[] {
  return OBSTACLE_CENTERS.map((c, index) => ({ index, cx: c.x, cy: c.y }));
}

function initialState(muted: boolean): CaromState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: {
      left: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
      right: { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: defaultObstacles(),
    simTime: 0,
    muted,
  };
}

function menuItems(screen: Screen): readonly string[] {
  switch (screen) {
    case "title":
      return TITLE_ITEMS;
    case "howto":
      return HOWTO_ITEMS;
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    default:
      return [];
  }
}

function rectFor(screen: Screen, index: number): MenuRect | null {
  const items = menuItems(screen);
  if (index < 0 || index >= items.length) return null;
  const w = 420;
  const h = 54;
  const gap = 14;
  const baseY =
    screen === "title"
      ? 356
      : screen === "howto"
        ? 566
        : screen === "paused"
          ? 302
          : 372;
  return { x: (FIELD_W - w) / 2, y: baseY + index * (h + gap), w, h };
}

function needBall(state: S): DeepReadonly<BallState> {
  if (!state.ball) throw new Error("Carom: no ball on the field");
  return state.ball;
}

function withBall(state: S, ball: BallState): CaromState {
  return { ...(state as CaromState), ball };
}

function makeDebug(): CaromDebugApi {
  const ballPose = (state: S, patch: Partial<BallState>): CaromState => {
    const b = needBall(state);
    return withBall(state, { ...(b as BallState), ...patch });
  };
  const paddlePose = (
    state: S,
    side: Side,
    patch: Partial<PaddleState>,
  ): CaromState => {
    const cur = state.paddles[side];
    const next = { ...(cur as PaddleState), ...patch };
    return {
      ...(state as CaromState),
      paddles: { ...(state.paddles as CaromState["paddles"]), [side]: next },
    } as CaromState;
  };
  return {
    version: CAROM_DEBUG_VERSION,
    clearWorld: (state) => ({
      ...(state as CaromState),
      ball: null,
      obstacles: [],
    }),
    spawnBall: (state) => ({
      ...(state as CaromState),
      ball: parkedBall(),
    }),
    spawnObstacle: (state, index) => {
      if (index !== 0 && index !== 1) {
        throw new Error(`Carom: no obstacle with index ${index}`);
      }
      const c = OBSTACLE_CENTERS[index];
      const rest = state.obstacles.filter((o) => o.index !== index);
      const obstacles = [...rest, { index, cx: c.x, cy: c.y }].sort(
        (a, b) => a.index - b.index,
      );
      return { ...(state as CaromState), obstacles };
    },
    reset: (state) => initialState(state.muted),
    reconcile: (state) => ({ ...(state as CaromState) }),
    setScreen: (state, screen) => ({ ...(state as CaromState), screen }),
    setMode: (state, mode) => ({ ...(state as CaromState), mode }),
    setMenuIndex: (state, index) => ({
      ...(state as CaromState),
      menuIndex: index,
    }),
    setTitleIndex: (state, index) => ({
      ...(state as CaromState),
      titleIndex: index,
    }),
    setResumeScreen: (state, screen) => ({
      ...(state as CaromState),
      resumeScreen: screen,
    }),
    setScore: (state, p1, p2) => ({
      ...(state as CaromState),
      score: { p1, p2 },
    }),
    setWinner: (state, side) => ({ ...(state as CaromState), winner: side }),
    setReceiver: (state, side) => ({
      ...(state as CaromState),
      receiver: side,
    }),
    setPaddleCy: (state, side, cy) => paddlePose(state, side, { cy }),
    setPaddleVy: (state, side, vy) => paddlePose(state, side, { drivenVy: vy }),
    setPaddleDriven: (state, side, driven) =>
      paddlePose(state, side, { driven }),
    setBallPosition: (state, x, y) => ballPose(state, { x, y }),
    setBallVelocity: (state, vx, vy) => ballPose(state, { vx, vy }),
    setBallSpin: (state, spin) => ballPose(state, { spin }),
    setBallHeld: (state, held) => ballPose(state, { held }),
    setBallHoldTimer: (state, seconds) =>
      ballPose(state, { holdTimer: seconds }),
    setBallServeSign: (state, sign) => ballPose(state, { serveSign: sign }),
    drawBallServeSign: (state) => {
      needBall(state);
      return ballPose(state, { serveSign: freshServeSign() });
    },
    setAiTracking: (state, enabled) => ({
      ...(state as CaromState),
      ai: { tracking: enabled, movement: state.ai.movement },
    }),
    setAiMovement: (state, enabled) => ({
      ...(state as CaromState),
      ai: { tracking: state.ai.tracking, movement: enabled },
    }),
    setMuted: (state, muted) => ({ ...(state as CaromState), muted }),
    snapshot: (state) => ({
      version: CAROM_DEBUG_VERSION,
      screen: state.screen,
      mode: state.mode,
      menuIndex: state.menuIndex,
      titleIndex: state.titleIndex,
      resumeScreen: state.resumeScreen,
      score: { p1: state.score.p1, p2: state.score.p2 },
      winner: state.winner,
      muted: state.muted,
      paddles: {
        left: {
          cy: state.paddles.left.cy,
          vy: state.paddles.left.vy,
          drivenVy: state.paddles.left.drivenVy,
          driven: state.paddles.left.driven,
        },
        right: {
          cy: state.paddles.right.cy,
          vy: state.paddles.right.vy,
          drivenVy: state.paddles.right.drivenVy,
          driven: state.paddles.right.driven,
        },
      },
      ai: { tracking: state.ai.tracking, movement: state.ai.movement },
      receiver: state.receiver,
      ball: state.ball
        ? {
            x: state.ball.x,
            y: state.ball.y,
            vx: state.ball.vx,
            vy: state.ball.vy,
            speed: Math.hypot(state.ball.vx, state.ball.vy),
            spin: state.ball.spin,
            held: state.ball.held,
            holdTimer: state.ball.holdTimer,
            serveSign: state.ball.serveSign,
            trail: state.ball.trail.map((t) => ({ x: t.x, y: t.y, t: t.t })),
          }
        : null,
      obstacles: state.obstacles.map((o) => ({
        index: o.index,
        cx: o.cx,
        cy: o.cy,
      })),
      simTime: state.simTime,
    }),
    menuItemRect: (state, index) => rectFor(state.screen, index),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface MutablePaddle {
  cy: number;
  vy: number;
  driven: boolean;
  drivenVy: number;
}
interface MutableBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  held: boolean;
  holdTimer: number;
  serveSign: 1 | -1;
  trail: TrailSample[];
}

function integratePaddle(p: MutablePaddle, vy: number, dt: number): void {
  const next = clamp(p.cy + vy * dt, PADDLE_MIN_CY, PADDLE_MAX_CY);
  let outVy = vy;
  if (next !== p.cy + vy * dt && dt > 0) outVy = (next - p.cy) / dt;
  // When clamped exactly at the bound from inside, the formula above keeps
  // vy if next equals the unclamped value; otherwise it is recomputed.
  p.cy = next;
  p.vy = outVy;
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>): [CaromState, CaromDebugApi] {
    for (const name of ACTIONS) {
      api.input.register(name, { keys: [...BINDINGS[name]] });
    }
    api.audio.define(CUES.paddleHit, {
      wave: "square",
      freq: 740,
      freqTo: 460,
      gain: 0.22,
      durationMs: 65,
    });
    api.audio.define(CUES.wallBounce, {
      wave: "triangle",
      freq: 330,
      freqTo: 230,
      gain: 0.2,
      durationMs: 55,
    });
    api.audio.define(CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 210,
      freqTo: 150,
      gain: 0.2,
      durationMs: 75,
    });
    api.audio.define(CUES.score, {
      wave: "sine",
      freq: 520,
      freqTo: 990,
      gain: 0.25,
      durationMs: 190,
    });
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("mode", (s) => s.mode);
    api.diagnostics.register("score-p1", (s) => s.score.p1);
    api.diagnostics.register("score-p2", (s) => s.score.p2);
    api.diagnostics.register("ball-x", (s) => (s.ball ? s.ball.x : 0));
    api.diagnostics.register("ball-y", (s) => (s.ball ? s.ball.y : 0));
    api.diagnostics.register("ball-vx", (s) => (s.ball ? s.ball.vx : 0));
    api.diagnostics.register("ball-vy", (s) => (s.ball ? s.ball.vy : 0));
    api.diagnostics.register("ball-speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0,
    );
    api.diagnostics.register("ball-spin", (s) => (s.ball ? s.ball.spin : 0));
    api.diagnostics.register("paddle-left-cy", (s) => s.paddles.left.cy);
    api.diagnostics.register("paddle-left-vy", (s) => s.paddles.left.vy);
    api.diagnostics.register("paddle-right-cy", (s) => s.paddles.right.cy);
    api.diagnostics.register("paddle-right-vy", (s) => s.paddles.right.vy);
    return [initialState(false), makeDebug()];
  },

  update(state, api: UpdateApi, dt: number): CaromState {
    const simTime = state.simTime + dt;
    let screen: Screen = state.screen;
    let mode: Mode = state.mode;
    let menuIndex = state.menuIndex;
    let titleIndex = state.titleIndex;
    let resumeScreen: "countdown" | "playing" = state.resumeScreen;
    let score = { p1: state.score.p1, p2: state.score.p2 };
    let winner: Side | null = state.winner;
    let receiver: Side = state.receiver;
    const left: MutablePaddle = { ...state.paddles.left };
    const right: MutablePaddle = { ...state.paddles.right };
    let ai = { tracking: state.ai.tracking, movement: state.ai.movement };
    let ball: MutableBall | null = state.ball
      ? {
          ...(state.ball as BallState),
          trail: [...state.ball.trail],
        }
      : null;
    let obstacles: ObstacleState[] = state.obstacles.map((o) => ({ ...o }));
    let muted = state.muted;

    // Cache every edge exactly once (pressed() is an edge read).
    const pressed: Record<string, boolean> = {};
    for (const name of ACTIONS) pressed[name] = api.input.pressed(name);
    const pointerPressedEdge = api.input.pointerPressed();
    const pointerReleasedEdge = api.input.pointerReleased();

    if (pressed["mute"]) {
      muted = !muted;
      api.audio.setMuted(muted);
    } else if (api.audio.muted() !== muted) {
      // A debug pose may have set the state's copy; drive the runtime to it.
      api.audio.setMuted(muted);
    }

    const beginningScreen = screen;

    const startMatch = (m: Mode): void => {
      mode = m;
      screen = "countdown";
      resumeScreen = "playing";
      menuIndex = 0;
      score = { p1: 0, p2: 0 };
      winner = null;
      receiver = "left";
      ball = { ...parkedBall(), trail: [] };
      left.cy = FIELD_CY;
      left.vy = 0;
      right.cy = FIELD_CY;
      right.vy = 0;
    };
    const returnToTitle = (): void => {
      const fresh = initialState(muted);
      screen = fresh.screen;
      mode = fresh.mode;
      resumeScreen = fresh.resumeScreen;
      score = { ...fresh.score };
      winner = null;
      receiver = fresh.receiver;
      left.cy = fresh.paddles.left.cy;
      left.vy = 0;
      left.driven = false;
      left.drivenVy = 0;
      right.cy = fresh.paddles.right.cy;
      right.vy = 0;
      right.driven = false;
      right.drivenVy = 0;
      ai = { tracking: true, movement: true };
      ball = fresh.ball
        ? { ...(fresh.ball as BallState), trail: [...fresh.ball.trail] }
        : null;
      obstacles = defaultObstacles();
      menuIndex = titleIndex;
    };
    const confirmItem = (): void => {
      if (beginningScreen === "title") {
        titleIndex = menuIndex;
        if (menuIndex === 0) startMatch("solo");
        else if (menuIndex === 1) startMatch("versus");
        else {
          screen = "howto";
          menuIndex = 0;
        }
      } else if (beginningScreen === "howto") {
        returnToTitle();
      } else if (beginningScreen === "paused") {
        if (menuIndex === 0) screen = resumeScreen;
        else if (menuIndex === 1) startMatch(mode);
        else returnToTitle();
      } else if (beginningScreen === "matchover") {
        if (menuIndex === 0) startMatch(mode);
        else returnToTitle();
      }
    };

    let inputDone = false;
    let keyboardConfirmed = false;

    if (
      beginningScreen === "title" ||
      beginningScreen === "howto" ||
      beginningScreen === "paused" ||
      beginningScreen === "matchover"
    ) {
      if (
        beginningScreen === "paused" &&
        (pressed["pause"] || pressed["back"])
      ) {
        screen = resumeScreen;
        inputDone = true;
      } else if (beginningScreen === "matchover" && pressed["back"]) {
        returnToTitle();
        inputDone = true;
      } else if (
        beginningScreen === "howto" &&
        (pressed["confirm"] || pressed["back"])
      ) {
        returnToTitle();
        inputDone = true;
        keyboardConfirmed = true;
      }
      if (!inputDone) {
        const items = menuItems(beginningScreen);
        const up = pressed["p1-up"] || pressed["p2-up"];
        const down = pressed["p1-down"] || pressed["p2-down"];
        let moved = false;
        if (items.length > 0) {
          if (up) {
            menuIndex = (menuIndex - 1 + items.length) % items.length;
            moved = true;
          } else if (down) {
            menuIndex = (menuIndex + 1) % items.length;
            moved = true;
          }
        }
        if (!moved && pressed["confirm"] && items.length > 0) {
          confirmItem();
          keyboardConfirmed = true;
        }
        // Pointer / touch, applied after keyboard edges.
        if (!keyboardConfirmed) {
          const samples = api.input.pointerSamples();
          const contacts = api.input.pointerContacts();
          let selection: number | null = null;
          let confirmIndex: number | null = null;
          let downIndex: number | null = null;
          let upIndex: number | null = null;
          const rectIndexAt = (x: number, y: number): number | null => {
            for (let i = 0; i < items.length; i++) {
              const r = rectFor(beginningScreen, i);
              if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)
                return i;
            }
            return null;
          };
          for (const s of samples) {
            const idx = rectIndexAt(s.x, s.y);
            if (s.type === "down") {
              if (idx !== null) {
                downIndex = idx;
                selection = idx;
              }
            } else if (s.type === "up") {
              if (idx !== null) upIndex = idx;
            } else if (idx !== null) {
              selection = idx;
            }
          }
          for (const c of contacts) {
            if (c.device === "touch") {
              const idx = rectIndexAt(c.x, c.y);
              if (idx !== null) selection = idx;
            }
          }
          if (downIndex !== null && upIndex !== null && downIndex === upIndex) {
            confirmIndex = downIndex;
          } else if (
            downIndex === null &&
            upIndex !== null &&
            pointerReleasedEdge &&
            upIndex === menuIndex
          ) {
            // Press landed on an earlier frame (which selected this item)
            // and the release lands in the same item.
            confirmIndex = upIndex;
          } else if (
            pointerReleasedEdge &&
            downIndex === null &&
            upIndex === null
          ) {
            const p = api.input.pointer();
            const idx = rectIndexAt(p.x, p.y);
            if (idx !== null && idx === menuIndex) confirmIndex = idx;
          }
          void pointerPressedEdge;
          if (confirmIndex !== null) {
            menuIndex = confirmIndex;
            confirmItem();
          } else if (selection !== null) {
            menuIndex = selection;
          }
        }
      }
    } else if (
      beginningScreen === "countdown" ||
      beginningScreen === "playing"
    ) {
      if (pressed["pause"]) {
        resumeScreen = beginningScreen;
        screen = "paused";
        menuIndex = 0;
      }
    }

    // ---- Advance the screen the input left us on ----
    let cuePaddle = false;
    let cueWall = false;
    let cueObstacle = false;
    let cueScore = false;

    const appendTrail = (): void => {
      if (!ball) return;
      const kept = ball.trail.filter((t) => t.t >= simTime - TRAIL_TIME);
      ball.trail = [...kept, { x: ball.x, y: ball.y, t: simTime }];
    };

    const movePaddles = (): void => {
      // Left
      if (left.driven) {
        integratePaddle(left, left.drivenVy, dt);
      } else if (mode === "solo") {
        const up = api.input.value("p1-up") || api.input.value("p2-up");
        const down = api.input.value("p1-down") || api.input.value("p2-down");
        integratePaddle(left, (down - up) * PADDLE_SPEED, dt);
      } else {
        const up = api.input.value("p1-up");
        const down = api.input.value("p1-down");
        integratePaddle(left, (down - up) * PADDLE_SPEED, dt);
      }
      // Right
      if (right.driven) {
        integratePaddle(right, right.drivenVy, dt);
      } else if (mode === "solo") {
        if (!ai.movement) {
          integratePaddle(right, 0, dt);
        } else {
          let target = AI_HOME_Y;
          let deadzone = AI_HOME_DEADZONE;
          if (ai.tracking && screen === "playing" && ball && ball.vx > 0) {
            target = ball.y - ball.vy * AI_REACT;
            deadzone = AI_DEADZONE;
          }
          const diff = target - right.cy;
          let vy = 0;
          if (Math.abs(diff) > deadzone) {
            vy =
              Math.sign(diff) *
              (dt > 0 ? Math.min(AI_SPEED, Math.abs(diff) / dt) : AI_SPEED);
          }
          integratePaddle(right, vy, dt);
        }
      } else {
        const up = api.input.value("p2-up");
        const down = api.input.value("p2-down");
        integratePaddle(right, (down - up) * PADDLE_SPEED, dt);
      }
    };

    if (screen === "countdown") {
      movePaddles();
      if (ball) {
        ball.holdTimer -= dt;
        if (ball.holdTimer <= 0) {
          ball.holdTimer = 0;
          ball.held = false;
          ball.trail = [];
          const dir = receiver === "left" ? -1 : 1;
          ball.vx = dir * SERVE_SPEED * Math.cos(SERVE_ANGLE);
          ball.vy = ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE);
          screen = "playing";
        } else {
          appendTrail();
        }
      }
    } else if (screen === "playing") {
      movePaddles();
      if (ball) {
        const speed0 = Math.hypot(ball.vx, ball.vy);
        const n = Math.max(1, Math.ceil((speed0 * dt) / MAX_SUBSTEP));
        const h = dt / n;
        const rects: { x0: number; y0: number; x1: number; y1: number }[] = [
          {
            x0: P1_X0,
            y0: left.cy - PADDLE_HALF,
            x1: P1_X1,
            y1: left.cy + PADDLE_HALF,
          },
          {
            x0: P2_X0,
            y0: right.cy - PADDLE_HALF,
            x1: P2_X1,
            y1: right.cy + PADDLE_HALF,
          },
        ];
        const resolveRect = (
          r: { x0: number; y0: number; x1: number; y1: number },
          kind: "paddle-left" | "paddle-right" | "obstacle",
        ): void => {
          if (!ball) return;
          const ex0 = r.x0 - BALL_R;
          const ex1 = r.x1 + BALL_R;
          const ey0 = r.y0 - BALL_R;
          const ey1 = r.y1 + BALL_R;
          if (!(ball.x > ex0 && ball.x < ex1 && ball.y > ey0 && ball.y < ey1))
            return;
          const depths = [
            ball.x - ex0,
            ex1 - ball.x,
            ball.y - ey0,
            ey1 - ball.y,
          ];
          let face = 0;
          for (let i = 1; i < 4; i++) if (depths[i] < depths[face]) face = i;
          if (kind === "obstacle") {
            if (face === 0) {
              ball.x = r.x0 - BALL_R;
              if (ball.vx > 0) {
                ball.vx = -ball.vx;
                cueObstacle = true;
              }
            } else if (face === 1) {
              ball.x = r.x1 + BALL_R;
              if (ball.vx < 0) {
                ball.vx = -ball.vx;
                cueObstacle = true;
              }
            } else if (face === 2) {
              ball.y = r.y0 - BALL_R;
              if (ball.vy > 0) {
                ball.vy = -ball.vy;
                cueObstacle = true;
              }
            } else {
              ball.y = r.y1 + BALL_R;
              if (ball.vy < 0) {
                ball.vy = -ball.vy;
                cueObstacle = true;
              }
            }
            return;
          }
          // Paddle
          const isLeft = kind === "paddle-left";
          const paddle = isLeft ? left : right;
          if (face === 0 || face === 1) {
            // Paddle hit (left/right face)
            cuePaddle = true;
            const offset = clamp((ball.y - paddle.cy) / PADDLE_HALF, -1, 1);
            const theta = offset * MAX_BOUNCE_ANGLE;
            const sp = Math.min(
              Math.hypot(ball.vx, ball.vy) * SPEED_MULT,
              SPEED_CAP,
            );
            const dir = isLeft ? 1 : -1;
            ball.vx = dir * sp * Math.cos(theta);
            ball.vy = sp * Math.sin(theta);
            ball.spin = clamp(
              ball.spin + paddle.vy * SPIN_FROM_PADDLE,
              -SPIN_CLAMP,
              SPIN_CLAMP,
            );
            ball.x = isLeft ? P1_X1 + BALL_R : P2_X0 - BALL_R;
          } else if (face === 2) {
            ball.y = r.y0 - BALL_R;
            if (ball.vy > 0) {
              ball.vy = -ball.vy;
              cueWall = true;
            }
          } else {
            ball.y = r.y1 + BALL_R;
            if (ball.vy < 0) {
              ball.vy = -ball.vy;
              cueWall = true;
            }
          }
        };
        for (let step = 0; step < n; step++) {
          const sp = Math.hypot(ball.vx, ball.vy);
          if (sp > 0) {
            const ang = (ball.spin / sp) * h;
            const cos = Math.cos(ang);
            const sin = Math.sin(ang);
            const nvx = ball.vx * cos - ball.vy * sin;
            const nvy = ball.vx * sin + ball.vy * cos;
            ball.vx = nvx;
            ball.vy = nvy;
          }
          ball.spin *= Math.pow(0.5, h / SPIN_HALFLIFE);
          ball.x += ball.vx * h;
          ball.y += ball.vy * h;
          // Walls
          if (ball.y - BALL_R < 0 && ball.vy < 0) {
            ball.y = BALL_R;
            ball.vy = -ball.vy;
            cueWall = true;
          } else if (ball.y + BALL_R > FIELD_H && ball.vy > 0) {
            ball.y = FIELD_H - BALL_R;
            ball.vy = -ball.vy;
            cueWall = true;
          }
          resolveRect(rects[0], "paddle-left");
          resolveRect(rects[1], "paddle-right");
          for (const ob of obstacles) {
            const r = OBSTACLES[ob.index];
            if (r) resolveRect(r, "obstacle");
          }
          // Obstacles must be in A,B order; state is sorted, but re-sort safe:
          // (present obstacles already stored in index order by construction)
        }
        appendTrail();
        // Scoring
        let scorer: Side | null = null;
        if (ball.x - BALL_R > FIELD_W) scorer = "left";
        else if (ball.x + BALL_R < 0) scorer = "right";
        if (scorer) {
          cueScore = true;
          if (scorer === "left") score = { ...score, p1: score.p1 + 1 };
          else score = { ...score, p2: score.p2 + 1 };
          const p1Wins =
            score.p1 >= WIN_SCORE && score.p1 - score.p2 >= WIN_LEAD;
          const p2Wins =
            score.p2 >= WIN_SCORE && score.p2 - score.p1 >= WIN_LEAD;
          if (p1Wins || p2Wins) {
            winner = scorer;
            screen = "matchover";
            menuIndex = 0;
          } else {
            receiver = scorer === "left" ? "right" : "left";
            ball = {
              ...parkedBall(),
              trail: [],
            };
            screen = "countdown";
          }
        }
      }
    }

    if (cuePaddle) api.audio.play(CUES.paddleHit);
    if (cueWall) api.audio.play(CUES.wallBounce);
    if (cueObstacle) api.audio.play(CUES.obstacleBounce);
    if (cueScore) api.audio.play(CUES.score);

    return {
      screen,
      mode,
      menuIndex,
      titleIndex,
      resumeScreen,
      score,
      winner,
      paddles: { left: { ...left }, right: { ...right } },
      ai,
      receiver,
      ball: ball ? { ...ball, trail: [...ball.trail] } : null,
      obstacles,
      simTime,
      muted,
    };
  },

  render(state, api: RenderApi): void {
    const ctx = api.ctx;
    // Field
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    ctx.fillStyle = "#101a33";
    ctx.fillRect(24, 24, FIELD_W - 48, FIELD_H - 48);
    ctx.strokeStyle = "#2a3f6e";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, FIELD_W - 48, FIELD_H - 48);
    // Net
    ctx.strokeStyle = "rgba(140,170,255,0.45)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(NET_X, 24);
    ctx.lineTo(NET_X, FIELD_H - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    const dim = state.screen === "title" || state.screen === "howto";
    ctx.save();
    if (dim) ctx.globalAlpha = 0.45;
    // Obstacles
    ctx.fillStyle = "#f0a832";
    for (const ob of state.obstacles) {
      ctx.fillRect(ob.cx - 10, ob.cy - 70, 20, 140);
    }
    // Trail
    if (state.ball && state.ball.trail.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      const tr = state.ball.trail;
      ctx.moveTo(tr[0].x, tr[0].y);
      for (let i = 1; i < tr.length; i++) ctx.lineTo(tr[i].x, tr[i].y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (const t of tr) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Paddles
    ctx.fillStyle = "#31d6ff";
    ctx.fillRect(
      P1_X0,
      state.paddles.left.cy - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
    );
    ctx.fillStyle = "#ff4f7b";
    ctx.fillRect(
      P2_X0,
      state.paddles.right.cy - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H,
    );
    // Ball
    if (state.ball) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      if (state.ball.spin !== 0) {
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.arc(
          state.ball.x,
          state.ball.y + clamp(state.ball.spin / 120, -6, 6),
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    ctx.restore();

    const inMatch =
      state.screen === "playing" ||
      state.screen === "countdown" ||
      state.screen === "paused" ||
      state.screen === "matchover";
    if (inMatch) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(state.score.p1), FIELD_CX - 40, 76);
      ctx.textAlign = "left";
      ctx.fillText(String(state.score.p2), FIELD_CX + 40, 76);
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#9fb6ff";
      ctx.fillText(state.mode === "solo" ? "SOLO" : "VERSUS", FIELD_CX, 34);
    }

    const drawMenu = (heading: string, sub: string | null): void => {
      const items = menuItems(state.screen);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 44px sans-serif";
      ctx.fillText(heading, FIELD_CX, 150);
      if (sub) {
        ctx.font = "24px sans-serif";
        ctx.fillStyle = "#c9d6ff";
        ctx.fillText(sub, FIELD_CX, 200);
      }
      for (let i = 0; i < items.length; i++) {
        const r = rectFor(state.screen, i);
        if (!r) continue;
        const sel = i === state.menuIndex;
        ctx.fillStyle = sel ? "#ffd23f" : "rgba(20,32,64,0.9)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = sel ? "#ffffff" : "#3b57a0";
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = sel ? "#11162a" : "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(items[i], r.x + r.w / 2, r.y + r.h / 2 + 9);
      }
    };

    if (state.screen === "title") {
      ctx.fillStyle = "rgba(5,8,18,0.55)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.fillStyle = "#ffd23f";
      ctx.font = "bold 96px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(TITLE_TEXT, FIELD_CX, 210);
      ctx.fillStyle = "#c9d6ff";
      ctx.font = "24px sans-serif";
      ctx.fillText(
        "A top-down paddle duel of spin and bank shots",
        FIELD_CX,
        262,
      );
      drawMenuItemsOnly(ctx, state);
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#8ea3d6";
      ctx.fillText(
        "W/S and Arrow Keys move - Enter selects - P pauses - M mutes",
        FIELD_CX,
        640,
      );
    } else if (state.screen === "howto") {
      ctx.fillStyle = "rgba(5,8,18,0.78)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("HOW TO PLAY", FIELD_CX, 120);
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#dbe5ff";
      const lines = [
        "Player One: W / S    Player Two: Arrow Up / Arrow Down",
        "In Solo, W/S or the arrows move your left paddle;",
        "the AI defends the right side.",
        "Move your paddle as it strikes to add spin.",
        "Spin curves the ball in flight and fades over time.",
        "Amber obstacles block the middle - bounce shots around them.",
        "Score past your opponent. First to 11, ahead by 2, wins.",
        "P or Esc pauses, M mutes.",
      ];
      lines.forEach((line, i) => ctx.fillText(line, FIELD_CX, 190 + i * 42));
      drawMenuItemsOnly(ctx, state);
    } else if (state.screen === "countdown") {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        state.ball
          ? `GET READY - ${Math.max(1, Math.ceil(state.ball.holdTimer))}`
          : "GET READY",
        FIELD_CX,
        150,
      );
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#9fb6ff";
      ctx.fillText(
        state.receiver === "left" ? "Serve to the left" : "Serve to the right",
        FIELD_CX,
        182,
      );
    } else if (state.screen === "paused") {
      ctx.fillStyle = "rgba(5,8,18,0.62)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      drawMenu("PAUSED", null);
    } else if (state.screen === "matchover") {
      ctx.fillStyle = "rgba(5,8,18,0.62)";
      ctx.fillRect(0, 0, FIELD_W, FIELD_H);
      const winnerText =
        state.winner === "left"
          ? "PLAYER ONE WINS"
          : state.winner === "right"
            ? "PLAYER TWO WINS"
            : "MATCH OVER";
      drawMenu(winnerText, `Final score ${state.score.p1} - ${state.score.p2}`);
    }
  },
};

function drawMenuItemsOnly(
  ctx: CanvasRenderingContext2D,
  state: DeepReadonly<CaromState>,
): void {
  const items = menuItems(state.screen);
  for (let i = 0; i < items.length; i++) {
    const r = rectFor(state.screen, i);
    if (!r) continue;
    const sel = i === state.menuIndex;
    ctx.fillStyle = sel ? "#ffd23f" : "rgba(20,32,64,0.9)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? "#ffffff" : "#3b57a0";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = sel ? "#11162a" : "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(items[i], r.x + r.w / 2, r.y + r.h / 2 + 9);
  }
}
