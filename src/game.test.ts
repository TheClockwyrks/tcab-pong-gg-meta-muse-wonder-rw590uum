import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import {
  ConstantClock,
  createEngine,
  type SurfaceMetrics,
} from "@clockwyrks/simple-2d";
import { FIELD_CX, FIELD_CY, FIELD_H, FIELD_W, LAYOUT } from "./constants";
import { game } from "./game";

async function makeEngine(stepMs = 1000 / 60) {
  const canvas = createCanvas(1280, 720) as unknown as HTMLCanvasElement;
  const events = new EventTarget();
  const surface: SurfaceMetrics = {
    cssWidth: () => 1280,
    cssHeight: () => 720,
    dpr: () => 1,
    events: () => events,
    origin: () => ({ x: 0, y: 0 }),
  };
  const engine = createEngine({
    canvas,
    width: FIELD_W,
    height: FIELD_H,
    game,
    background: "#0b1020",
    clock: new ConstantClock(stepMs),
    surface,
    layout: LAYOUT,
  });
  await engine.initialize();
  return { engine, debug: engine.debug, events };
}

function key(events: EventTarget, type: string, code: string) {
  const e = new Event(type) as Event & { code: string; repeat: boolean };
  e.code = code;
  e.repeat = false;
  events.dispatchEvent(e);
}

describe("Carom", () => {
  it("starts on the title screen with a parked ball", async () => {
    const { debug, engine } = await makeEngine();
    const snap = debug.snapshot(engine.state);
    expect(snap.version).toBe(1);
    expect(snap.screen).toBe("title");
    expect(snap.mode).toBe("solo");
    expect(snap.score).toEqual({ p1: 0, p2: 0 });
    expect(snap.ball?.x).toBe(FIELD_CX);
    expect(snap.ball?.y).toBe(FIELD_CY);
    expect(snap.ball?.held).toBe(true);
    expect(snap.obstacles).toHaveLength(2);
    expect(debug.menuItemRect(engine.state, 0)).not.toBeNull();
    engine.destroy();
  });

  it("debug poses set fields and fail loudly without a ball", async () => {
    const { debug, engine } = await makeEngine();
    engine.apply((s) => debug.setScore(s, 4, 3));
    expect(debug.snapshot(engine.state).score).toEqual({ p1: 4, p2: 3 });
    engine.apply((s) => debug.setPaddleVy(s, "left", 250));
    let snap = debug.snapshot(engine.state);
    expect(snap.paddles.left.drivenVy).toBe(250);
    expect(snap.paddles.left.vy).toBe(0);
    engine.apply((s) => debug.setBallPosition(s, 100, 120));
    engine.apply((s) => debug.setBallVelocity(s, 300, -40));
    snap = debug.snapshot(engine.state);
    expect(snap.ball?.speed).toBeCloseTo(Math.hypot(300, -40), 6);
    engine.apply((s) => debug.clearWorld(s));
    snap = debug.snapshot(engine.state);
    expect(snap.ball).toBeNull();
    expect(snap.obstacles).toEqual([]);
    expect(() => engine.apply((s) => debug.setBallPosition(s, 1, 1))).toThrow();
    expect(() => engine.apply((s) => debug.spawnObstacle(s, 9))).toThrow();
    engine.apply((s) => debug.spawnBall(s));
    engine.apply((s) => debug.spawnObstacle(s, 1));
    snap = debug.snapshot(engine.state);
    expect(snap.ball?.held).toBe(true);
    expect(snap.obstacles.map((o) => o.index)).toEqual([1]);
    const before = debug.snapshot(engine.state);
    engine.apply((s) => debug.reconcile(s));
    expect(debug.snapshot(engine.state).simTime).toBe(before.simTime);
    engine.destroy();
  });

  it("serves after the hold and scores a point", async () => {
    const { debug, engine } = await makeEngine(8);
    engine.apply((s) => debug.setScreen(s, "countdown"));
    engine.apply((s) => debug.setBallHoldTimer(s, 0));
    engine.apply((s) => debug.setBallServeSign(s, 1));
    await engine.advance(1);
    let snap = debug.snapshot(engine.state);
    expect(snap.screen).toBe("playing");
    expect(snap.ball?.held).toBe(false);
    expect(snap.ball!.vx).toBeLessThan(0); // receiver left by default
    // Drive ball toward right goal from near it.
    engine.apply((s) => debug.setBallPosition(s, 1260, 360));
    engine.apply((s) => debug.setBallVelocity(s, 500, 0));
    engine.apply((s) => debug.setPaddleDriven(s, "right", true));
    engine.apply((s) => debug.setPaddleCy(s, "right", 60));
    await engine.advance(20);
    snap = debug.snapshot(engine.state);
    expect(snap.score.p1).toBe(1);
    engine.destroy();
  });

  it("paddle hit speeds up the ball and adds spin", async () => {
    const { debug, engine } = await makeEngine(8);
    engine.apply((s) => debug.setScreen(s, "playing"));
    engine.apply((s) => debug.setMode(s, "versus"));
    engine.apply((s) => debug.setBallHeld(s, false));
    engine.apply((s) => debug.setBallPosition(s, 80, 360));
    engine.apply((s) => debug.setBallVelocity(s, -520, 0));
    engine.apply((s) => debug.setPaddleDriven(s, "left", true));
    engine.apply((s) => debug.setPaddleVy(s, "left", 300));
    engine.apply((s) => debug.setPaddleCy(s, "left", 360));
    await engine.advance(4);
    const snap = debug.snapshot(engine.state);
    expect(snap.ball!.vx).toBeGreaterThan(0);
    expect(snap.ball!.speed).toBeGreaterThan(520);
    expect(snap.ball!.spin).toBeGreaterThan(0);
    expect(snap.ball!.x).toBeGreaterThanOrEqual(75);
    engine.destroy();
  });

  it("keyboard starts a solo match and pauses", async () => {
    const { engine, events, debug } = await makeEngine(16);
    key(events, "keydown", "Enter");
    await engine.advance(1);
    key(events, "keyup", "Enter");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.mode).toBe("solo");
    expect(debug.snapshot(engine.state).titleIndex).toBe(0);
    key(events, "keydown", "KeyP");
    await engine.advance(1);
    key(events, "keyup", "KeyP");
    expect(engine.state.screen).toBe("paused");
    await engine.advance(2);
    key(events, "keydown", "KeyP");
    await engine.advance(1);
    expect(engine.state.screen).toBe("countdown");
    engine.destroy();
  });

  it("plays a win at 11 with a two point lead through real scoring", async () => {
    const { debug, engine } = await makeEngine(8);
    engine.apply((s) => debug.setScreen(s, "playing"));
    engine.apply((s) => debug.setScore(s, 10, 9));
    engine.apply((s) => debug.setBallPosition(s, 1270, 360));
    engine.apply((s) => debug.setBallVelocity(s, 500, 0));
    await engine.advance(20);
    const snap = debug.snapshot(engine.state);
    expect(snap.screen).toBe("matchover");
    expect(snap.winner).toBe("left");
    engine.destroy();
  });

  it("AI tracks an incoming ball and reset restores title", async () => {
    const { debug, engine } = await makeEngine();
    engine.apply((s) => debug.setScreen(s, "playing"));
    engine.apply((s) => debug.setBallVelocity(s, 300, 0));
    engine.apply((s) => debug.setBallPosition(s, 800, 200));
    engine.apply((s) => debug.setPaddleCy(s, "right", 500));
    await engine.advance(10);
    expect(engine.state.paddles.right.cy).toBeLessThan(500);
    engine.apply((s) => debug.reset(s));
    const snap = debug.snapshot(engine.state);
    expect(snap.screen).toBe("title");
    expect(snap.simTime).toBe(0);
    expect(snap.ai).toEqual({ tracking: true, movement: true });
    engine.destroy();
  });

  it("menu pointer helpers report null outside menus", async () => {
    const { debug, engine } = await makeEngine();
    engine.apply((s) => debug.setScreen(s, "playing"));
    expect(debug.menuItemRect(engine.state, 0)).toBeNull();
    engine.apply((s) => debug.setScreen(s, "title"));
    expect(debug.menuItemRect(engine.state, 99)).toBeNull();
    engine.destroy();
  });
});
