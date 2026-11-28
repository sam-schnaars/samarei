import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * A browser simulator for the AMETA S20 Lite work (github.com/sam-schnaars/ameta-s20-lite).
 * Sticks, takeoff/land flags, the 45 Hz Lewei control frame and the plain-text route
 * language all mirror the real Python code; the flight model itself is a toy.
 */

const REPO = "https://github.com/sam-schnaars/ameta-s20-lite";

// ---- protocol.py, ported ---------------------------------------------------
const CENTER = 0x80;
const MAX_SPEED = 0.5; // safety cap: never more than half stick from code
const FLAG_TAKEOFF = 0x01;
const FLAG_LAND = 0x02;
const STATE_GROUND = 0x00;
const STATE_TAKING_OFF = 0x20;
const STATE_FLYING = 0x40;

function stickValue(speed: number): number {
  const s = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
  return s >= 0 ? Math.min(0xff, Math.round(CENTER + s * 0x7f)) : Math.max(0x01, Math.round(CENTER + s * 0x7f));
}

function buildFrame(roll: number, pitch: number, throttle: number, yaw: number, flags: number): number[] {
  const body = [0x66, stickValue(roll), stickValue(pitch), stickValue(throttle), stickValue(yaw), flags, 0x00];
  let x = 0;
  for (const b of body.slice(1, 7)) x ^= b;
  return [...body, x, 0x99];
}

// ---- calibration.py (sim values) ------------------------------------------
const REF_SPEED = 0.2;
const TAKEOFF_HEIGHT_M = 1.2;
const MIN_HEIGHT_M = 0.5;
const MAX_HEIGHT_M = 3.0;
// Simulated full-stick rates. At REF_SPEED (20%) that's 0.5 m/s, 0.4 m/s vertical, 36 deg/s.
const FULL_STICK_MPS = 2.5;
const FULL_STICK_UP_MPS = 2.0;
const FULL_STICK_DEG_PS = 180;

// ---- route.py grammar, ported ---------------------------------------------
type Step =
  | { kind: "move"; raw: string; secs: number; roll: number; pitch: number; throttle: number; yaw: number }
  | { kind: "hover"; raw: string; secs: number }
  | { kind: "release"; raw: string };

const STEP_RE = /^(rotate\s+(?:left|right)|forward|back|left|right|up|down|hover|release|land)\s*([\d.]+)?\s*(m|s|deg)?$/;
const RATE: Record<string, number> = {
  forward: REF_SPEED * FULL_STICK_MPS,
  back: REF_SPEED * FULL_STICK_MPS,
  left: REF_SPEED * FULL_STICK_MPS,
  right: REF_SPEED * FULL_STICK_MPS,
  up: REF_SPEED * FULL_STICK_UP_MPS,
  down: REF_SPEED * FULL_STICK_UP_MPS,
  rotate: REF_SPEED * FULL_STICK_DEG_PS,
};

function parseRoute(route: string): Step[] {
  const plan: Step[] = [];
  let height = TAKEOFF_HEIGHT_M;
  for (const raw of route.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    const m = STEP_RE.exec(raw);
    if (!m) throw new Error(`don't understand step: "${raw}"`);
    const [, verb, num, unit] = m;
    if (verb === "land") break;
    if (verb === "release") {
      plan.push({ kind: "release", raw });
      continue;
    }
    if (num === undefined) throw new Error(`step needs a number: "${raw}"`);
    const n = parseFloat(num);
    if (verb === "hover") {
      plan.push({ kind: "hover", raw, secs: n });
      continue;
    }
    const key = verb.startsWith("rotate") ? "rotate" : verb;
    const want = key === "rotate" ? "deg" : "m";
    if (unit && unit !== "s" && unit !== want) throw new Error(`"${raw}": use ${want} or s`);
    const secs = unit === "s" ? n : n / RATE[key];
    if (key === "up" || key === "down") {
      height += (key === "up" ? 1 : -1) * secs * RATE.up;
      if (height < MIN_HEIGHT_M - 1e-6 || height > MAX_HEIGHT_M + 1e-6)
        throw new Error(`"${raw}": estimated height ${height.toFixed(2)} m is outside ${MIN_HEIGHT_M}-${MAX_HEIGHT_M} m`);
    }
    if (secs > 5) throw new Error(`"${raw}": ${secs.toFixed(1)} s is longer than the 5 s per-step limit; split it up`);
    const s = REF_SPEED;
    plan.push({
      kind: "move",
      raw,
      secs,
      roll: key === "right" ? s : key === "left" ? -s : 0,
      pitch: key === "forward" ? s : key === "back" ? -s : 0,
      throttle: key === "up" ? s : key === "down" ? -s : 0,
      yaw: key === "rotate" ? (verb.endsWith("right") ? s : -s) : 0,
    });
  }
  return plan;
}

// ---- sim state (mutable, outside React render) -----------------------------
type Phase = "ground" | "takeoff" | "flying" | "landing";

interface Sim {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number; // radians, 0 = facing -z
  yawRate: number;
  phase: Phase;
  phaseT: number; // seconds in current phase
  flagT: number; // seconds left to hold takeoff/land flag
  flag: number;
  sticks: { roll: number; pitch: number; throttle: number; yaw: number };
  keys: Set<string>;
  route: { steps: Step[]; i: number; t: number } | null;
  payloadAttached: boolean;
  payloadPos: THREE.Vector3;
  payloadVel: THREE.Vector3;
  log: (msg: string) => void;
}

function makeSim(log: (msg: string) => void): Sim {
  return {
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(),
    yaw: 0,
    yawRate: 0,
    phase: "ground",
    phaseT: 0,
    flagT: 0,
    flag: 0,
    sticks: { roll: 0, pitch: 0, throttle: 0, yaw: 0 },
    keys: new Set(),
    route: null,
    payloadAttached: true,
    payloadPos: new THREE.Vector3(0, -0.09, 0),
    payloadVel: new THREE.Vector3(),
    log,
  };
}

const LEG = 0.06; // body bottom sits this far above ground when landed

function takeoff(sim: Sim) {
  if (sim.phase !== "ground") return;
  sim.phase = "takeoff";
  sim.phaseT = 0;
  sim.flag = FLAG_TAKEOFF;
  sim.flagT = 1.0; // the app holds the flag ~1 s (48 frames)
  sim.log("takeoff (flag 01 held ~1 s)");
}

function land(sim: Sim) {
  if (sim.phase === "ground" || sim.phase === "landing") return;
  sim.phase = "landing";
  sim.phaseT = 0;
  sim.flag = FLAG_LAND;
  sim.flagT = 1.0;
  sim.route = null;
  sim.log("land (flag 02 held ~1 s)");
}

function release(sim: Sim) {
  if (!sim.payloadAttached) return;
  sim.payloadAttached = false;
  sim.payloadVel.copy(sim.vel);
  sim.log("release: servo winds the line, pin slides out, payload drops");
}

function step(sim: Sim, dt: number) {
  sim.phaseT += dt;
  if (sim.flagT > 0) {
    sim.flagT -= dt;
    if (sim.flagT <= 0) sim.flag = 0;
  }

  // Sticks: route overrides keys.
  const k = sim.keys;
  let sticks = {
    roll: (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0),
    pitch: (k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0),
    throttle: (k.has("arrowup") ? 1 : 0) - (k.has("arrowdown") ? 1 : 0),
    yaw: (k.has("arrowright") ? 1 : 0) - (k.has("arrowleft") ? 1 : 0),
  };
  for (const key of Object.keys(sticks) as (keyof typeof sticks)[]) sticks[key] *= MAX_SPEED;

  if (sim.route && sim.phase === "flying") {
    const r = sim.route;
    const cur = r.steps[r.i];
    if (!cur) {
      land(sim);
    } else {
      if (r.t === 0) sim.log(`> ${cur.raw}`);
      r.t += dt;
      if (cur.kind === "release") {
        release(sim);
        r.i++;
        r.t = 0;
      } else {
        sticks =
          cur.kind === "move"
            ? { roll: cur.roll, pitch: cur.pitch, throttle: cur.throttle, yaw: cur.yaw }
            : { roll: 0, pitch: 0, throttle: 0, yaw: 0 };
        if (r.t >= cur.secs) {
          r.i++;
          r.t = 0;
        }
      }
    }
  }
  if (sim.phase !== "flying") sticks = { roll: 0, pitch: 0, throttle: 0, yaw: 0 };
  sim.sticks = sticks;

  // Flight model: first-order lag toward stick-commanded velocity (the stock FC does the stabilizing).
  const fwd = new THREE.Vector3(-Math.sin(sim.yaw), 0, -Math.cos(sim.yaw));
  const right = new THREE.Vector3(Math.cos(sim.yaw), 0, -Math.sin(sim.yaw));
  const target = new THREE.Vector3()
    .addScaledVector(fwd, sticks.pitch * FULL_STICK_MPS)
    .addScaledVector(right, sticks.roll * FULL_STICK_MPS);
  target.y = sticks.throttle * FULL_STICK_UP_MPS;

  if (sim.phase === "takeoff") {
    target.set(0, 0.9, 0);
    if (sim.pos.y >= TAKEOFF_HEIGHT_M) {
      sim.phase = "flying";
      sim.phaseT = 0;
    }
  } else if (sim.phase === "landing") {
    target.set(0, -0.6, 0);
  }

  const lag = 1 - Math.exp(-dt * 3.0);
  sim.vel.lerp(target, lag);
  sim.yawRate += (-sticks.yaw * THREE.MathUtils.degToRad(FULL_STICK_DEG_PS) - sim.yawRate) * lag;
  sim.yaw += sim.yawRate * dt;

  // Slight hover drift: there is no position hold, which is why every move is a timed estimate.
  if (sim.phase === "flying") {
    const t = performance.now() / 1000;
    sim.vel.x += Math.sin(t * 0.7) * 0.02 * dt;
    sim.vel.z += Math.cos(t * 0.53) * 0.02 * dt;
  }

  sim.pos.addScaledVector(sim.vel, dt);
  if (sim.phase === "flying") sim.pos.y = Math.min(MAX_HEIGHT_M + 0.5, sim.pos.y);
  if (sim.pos.y <= 0) {
    sim.pos.y = 0;
    sim.vel.set(0, 0, 0);
    sim.yawRate = 0;
    if (sim.phase === "landing" || (sim.phase === "flying" && sticks.throttle < 0)) {
      if (sim.phase !== "landing") sim.log("touched down");
      sim.phase = "ground";
      sim.route = null;
    }
  }
  // keep it inside the room
  sim.pos.x = THREE.MathUtils.clamp(sim.pos.x, -7, 7);
  sim.pos.z = THREE.MathUtils.clamp(sim.pos.z, -7, 7);

  // Payload
  if (sim.payloadAttached) {
    sim.payloadPos.set(sim.pos.x, sim.pos.y + LEG - 0.09, sim.pos.z);
  } else if (sim.payloadPos.y > 0.025) {
    sim.payloadVel.y -= 9.81 * dt;
    sim.payloadVel.x *= 0.995;
    sim.payloadVel.z *= 0.995;
    sim.payloadPos.addScaledVector(sim.payloadVel, dt);
    if (sim.payloadPos.y <= 0.025) {
      sim.payloadPos.y = 0.025;
      sim.payloadVel.set(0, 0, 0);
      sim.log(`payload landed at (${sim.payloadPos.x.toFixed(2)}, ${(-sim.payloadPos.z).toFixed(2)}) m`);
    }
  }
}

function telemetryState(sim: Sim): number {
  if (sim.phase === "ground") return STATE_GROUND;
  if (sim.phase === "takeoff") return STATE_TAKING_OFF;
  return STATE_FLYING;
}

// ---- 3D -------------------------------------------------------------------
function Rotor({ x, z, dir, spinning }: { x: number; z: number; dir: 1 | -1; spinning: () => number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dir * spinning() * dt * 60;
  });
  return (
    <group position={[x, 0.035, z]}>
      <mesh position={[0, -0.015, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 12]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <group ref={ref}>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.2, 0.004, 0.022]} />
          <meshStandardMaterial color="#e8e8e8" transparent opacity={0.85} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.2, 0.004, 0.022]} />
          <meshStandardMaterial color="#e8e8e8" transparent opacity={0.85} />
        </mesh>
      </group>
      {/* prop guard */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.115, 0.006, 6, 32]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function Drone({ sim }: { sim: Sim }) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const spin = () => (sim.phase === "ground" ? 0 : 1);
  const arm = 0.15;

  useFrame(() => {
    if (!root.current || !tilt.current) return;
    root.current.position.set(sim.pos.x, sim.pos.y + LEG, sim.pos.z);
    root.current.rotation.y = sim.yaw;
    // tilt into the commanded direction (body frame)
    const t = tilt.current.rotation;
    t.x = THREE.MathUtils.lerp(t.x, -sim.sticks.pitch * 0.5, 0.15);
    t.z = THREE.MathUtils.lerp(t.z, -sim.sticks.roll * 0.5, 0.15);
  });

  return (
    <group ref={root}>
      <group ref={tilt}>
        {/* body */}
        <mesh castShadow>
          <boxGeometry args={[0.1, 0.045, 0.17]} />
          <meshStandardMaterial color="#9aa1a0" metalness={0.2} roughness={0.6} />
        </mesh>
        {/* camera, front = -z */}
        <mesh position={[0, -0.005, -0.09]}>
          <boxGeometry args={[0.03, 0.025, 0.015]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0, -0.005, -0.098]}>
          <sphereGeometry args={[0.008, 12, 12]} />
          <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.6} />
        </mesh>
        {/* top pod: battery, XIAO, servo */}
        <mesh position={[0, 0.032, 0.01]}>
          <boxGeometry args={[0.06, 0.018, 0.09]} />
          <meshStandardMaterial color="#cfe3f7" />
        </mesh>
        <mesh position={[0, 0.043, 0.035]}>
          <boxGeometry args={[0.03, 0.006, 0.025]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
        {/* belly latch */}
        <mesh position={[0, -0.03, 0]}>
          <boxGeometry args={[0.05, 0.008, 0.06]} />
          <meshStandardMaterial color="#cfe3f7" />
        </mesh>
        {/* arms + rotors */}
        {(
          [
            [arm, -arm, 1],
            [-arm, -arm, -1],
            [arm, arm, -1],
            [-arm, arm, 1],
          ] as [number, number, 1 | -1][]
        ).map(([x, z, d], i) => (
          <group key={i}>
            <mesh position={[x / 2, 0.005, z / 2]} rotation={[0, Math.atan2(x, z), 0]}>
              <boxGeometry args={[0.014, 0.01, Math.hypot(x, z)]} />
              <meshStandardMaterial color="#555" />
            </mesh>
            <Rotor x={x} z={z} dir={d} spinning={spin} />
            {/* legs */}
            <mesh position={[x * 0.85, -0.035, z * 0.85]}>
              <cylinderGeometry args={[0.004, 0.004, 0.05, 6]} />
              <meshStandardMaterial color="#111" />
            </mesh>
          </group>
        ))}
        {/* nav lights */}
        <mesh position={[arm, 0.01, -arm]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-arm, 0.01, -arm]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}

function Payload({ sim }: { sim: Sim }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    ref.current?.position.copy(sim.payloadPos);
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[0.045, 0.05, 0.045]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.014, 0.003, 6, 16]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

function FollowCamera({ sim, controls }: { sim: Sim; controls: React.RefObject<any> }) {
  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const want = new THREE.Vector3(sim.pos.x, sim.pos.y + 0.3, sim.pos.z);
    const delta = want.clone().sub(c.target).multiplyScalar(0.06);
    c.target.add(delta);
    c.object.position.add(delta);
    c.update();
  });
  return null;
}

function Ticker({ sim, onTick }: { sim: Sim; onTick: () => void }) {
  const acc = useRef(0);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    step(sim, dt);
    acc.current += dt;
    if (acc.current > 1 / 15) {
      acc.current = 0;
      onTick();
    }
  });
  return null;
}

function Room() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[16, 16]}
        cellSize={0.5}
        cellColor="#d6d1c4"
        sectionSize={2}
        sectionColor="#b9b2a2"
        fadeDistance={18}
        infiniteGrid={false}
      />
      {/* the yellow cabinet from find_and_dip.py */}
      <group position={[2.2, 0, -3]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.8, 0.9, 0.45]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
        <mesh position={[0, 0.45, 0.226]}>
          <boxGeometry args={[0.01, 0.8, 0.005]} />
          <meshStandardMaterial color="#a16207" />
        </mesh>
      </group>
      {/* landing pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.32, 0.36, 48]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* drop target */}
      <group position={[-2, 0.003, -2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 48]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.08, 32]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>
    </>
  );
}

// ---- UI -------------------------------------------------------------------
const EXAMPLES = [
  "up 0.5m, left 1m, hover 2, land",
  "forward 2m, left 2m, release, back 1m",
  "rotate right 90deg, forward 1.5m, rotate left 90deg, hover 1",
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-block min-w-[1.6em] text-center px-1.5 py-0.5 border border-gray-300 rounded bg-white text-[11px] font-mono text-gray-700">
      {children}
    </kbd>
  );
}

export default function DroneSim() {
  const [logLines, setLogLines] = useState<string[]>(["ready. props on, open space, nobody underneath."]);
  const sim = useMemo(
    () => makeSim((msg) => setLogLines((l) => [...l.slice(-7), msg])),
    [],
  );
  const [, force] = useState(0);
  const [route, setRoute] = useState(EXAMPLES[1]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const controls = useRef<any>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
      if (k === "t") takeoff(sim);
      else if (k === "l") land(sim);
      else if (k === " ") release(sim);
      else {
        if (sim.route && ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
          sim.route = null;
          sim.log("manual override: route cancelled");
        }
        sim.keys.add(k);
      }
    };
    const up = (e: KeyboardEvent) => sim.keys.delete(e.key.toLowerCase());
    const blur = () => sim.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [sim]);

  const runRoute = () => {
    try {
      const steps = parseRoute(route);
      setRouteError(null);
      sim.log(`plan: takeoff, ${steps.map((s) => s.raw).join(", ")}${steps.length ? ", " : ""}land`);
      sim.route = { steps, i: 0, t: 0 };
      if (sim.phase === "ground") takeoff(sim);
    } catch (e) {
      setRouteError((e as Error).message);
    }
  };

  const reset = () => {
    Object.assign(sim, makeSim(sim.log));
    setLogLines(["reset."]);
  };

  const frame = buildFrame(sim.sticks.roll, sim.sticks.pitch, sim.sticks.throttle, sim.sticks.yaw, sim.flag);
  const state = telemetryState(sim);
  const labels = ["hdr", "roll", "pitch", "thr", "yaw", "flag", "", "xor", "end"];

  return (
    <div className="w-full h-full overflow-y-auto bg-white">
      <div className="flex flex-col lg:flex-row lg:h-full">
        {/* 3D view */}
        <div
          ref={canvasWrap}
          className="relative h-[52vh] lg:h-full lg:flex-[3] bg-[#f4f1ea] outline-none"
          tabIndex={0}
          onPointerDown={() => canvasWrap.current?.focus()}
        >
          <Canvas shadows camera={{ position: [1.6, 1.4, 2.2], fov: 50 }} dpr={[1, 2]}>
            <color attach="background" args={["#f4f1ea"]} />
            <fog attach="fog" args={["#f4f1ea", 8, 18]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[4, 6, 3]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
            <Room />
            <Drone sim={sim} />
            <Payload sim={sim} />
            <OrbitControls ref={controls} enablePan={false} minDistance={0.8} maxDistance={8} maxPolarAngle={Math.PI / 2.05} />
            <FollowCamera sim={sim} controls={controls} />
            <Ticker sim={sim} onTick={() => force((n) => n + 1)} />
          </Canvas>

          <div className="absolute top-3 left-3 bg-white/85 backdrop-blur rounded-md border border-gray-200 px-3 py-2 text-[11px] font-mono text-gray-700 leading-5 pointer-events-none">
            <div>
              alt {sim.pos.y.toFixed(2)} m · hdg {(((-THREE.MathUtils.radToDeg(sim.yaw) % 360) + 360) % 360).toFixed(0)}° ·{" "}
              {Math.hypot(sim.vel.x, sim.vel.z).toFixed(2)} m/s
            </div>
            <div>
              telemetry byte 3 = <span className="text-black">0x{state.toString(16).padStart(2, "0")}</span> ({sim.phase})
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-600 font-sans pointer-events-none">
            <span>
              <Key>T</Key> takeoff <Key>L</Key> land
            </span>
            <span>
              <Key>W</Key>
              <Key>A</Key>
              <Key>S</Key>
              <Key>D</Key> pitch/roll
            </span>
            <span>
              <Key>↑</Key>
              <Key>↓</Key> throttle <Key>←</Key>
              <Key>→</Key> yaw
            </span>
            <span>
              <Key>space</Key> drop payload
            </span>
            <span>drag to orbit</span>
          </div>
        </div>

        {/* side panel */}
        <div className="lg:flex-[2] lg:max-w-md p-4 md:p-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-gray-200 lg:overflow-y-auto">
          <section>
            <h3 className="font-serif text-lg text-black">control frame, live</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              what the Python sends to UDP 192.168.0.1:50000, 45 times a second
            </p>
            <div className="mt-2 grid grid-cols-9 gap-1 font-mono text-[11px] text-center">
              {frame.map((b, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span
                    className={`w-full rounded py-1 border ${
                      (i >= 1 && i <= 4 && b !== CENTER) || (i === 5 && b !== 0)
                        ? "bg-black text-white border-black"
                        : "bg-gray-50 text-gray-800 border-gray-200"
                    }`}
                  >
                    {b.toString(16).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">{labels[i]}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-serif text-lg text-black">fly a route</h3>
            <p className="text-xs text-gray-500 mt-0.5">same grammar as examples/route.py, at 20% stick</p>
            <textarea
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              rows={2}
              spellCheck={false}
              className="mt-2 w-full border border-gray-300 rounded-md px-2 py-1.5 font-mono text-xs text-black focus:outline-none focus:border-black resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setRoute(ex)}
                  className="text-[10px] font-mono px-1.5 py-0.5 border border-gray-200 rounded hover:border-black text-gray-600"
                >
                  {ex.length > 28 ? ex.slice(0, 26) + "…" : ex}
                </button>
              ))}
            </div>
            {routeError && <p className="text-xs text-red-600 mt-1.5">{routeError}</p>}
            <div className="flex gap-2 mt-2.5">
              <button onClick={runRoute} className="flex-1 bg-black text-white text-sm py-1.5 rounded-md hover:opacity-85">
                fly it
              </button>
              <button
                onClick={() => (sim.phase === "ground" ? takeoff(sim) : land(sim))}
                className="px-3 border border-gray-300 text-sm rounded-md hover:border-black text-black"
              >
                {sim.phase === "ground" ? "takeoff" : "land"}
              </button>
              <button onClick={reset} className="px-3 border border-gray-300 text-sm rounded-md hover:border-black text-black">
                reset
              </button>
            </div>
          </section>

          <section className="font-mono text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-2 min-h-[7.5rem]">
            {logLines.map((l, i) => (
              <div key={i} className={i === logLines.length - 1 ? "text-black" : ""}>
                {l}
              </div>
            ))}
          </section>
        </div>
      </div>

      <DroneWriteup />
    </div>
  );
}

function DroneWriteup() {
  return (
    <article className="max-w-3xl mx-auto px-5 md:px-8 py-12 font-serif text-black">
      <h3 className="text-3xl">hacking a $40 drone</h3>
      <p className="mt-4 text-lg leading-relaxed text-gray-800">
        The AMETA S20 Lite only flies from its phone app. I captured the app's traffic off an iPhone, reverse-engineered
        the Lewei-family protocol, and now it's programmable from Python, with the stock flight controller still doing all
        the stabilizing. The sim above speaks the same control frame.
      </p>

      <figure className="mt-8 mx-auto max-w-xs">
        <video
          src="/drone/payload_drop.mp4"
          poster="/drone/payload_drop_poster.webp"
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          className="w-full aspect-[9/16] bg-gray-100 border border-gray-200 rounded-md"
        />
        <figcaption className="mt-2 text-sm text-gray-500 font-sans text-center">
          the real thing: takeoff, flight, payload drop
        </figcaption>
      </figure>

      <div className="mt-8 grid gap-6 md:grid-cols-2 font-sans text-[15px] leading-relaxed text-gray-700">
        <div>
          <h4 className="font-serif text-xl text-black">flight control</h4>
          <p className="mt-1">
            A 9-byte UDP frame at ~45 Hz: <code className="text-xs bg-gray-100 px-1 rounded">66 roll pitch thr yaw flags 00 xor 99</code>.
            Takeoff and land are flags held for about a second. Routes are plain text, like{" "}
            <em>"up 0.5m, right 1m, land"</em>. There's no position feedback, so every move is a timed estimate.
          </p>
        </div>
        <div>
          <h4 className="font-serif text-xl text-black">live video</h4>
          <p className="mt-1">
            H.264 over TCP, except the drone deliberately scrambles 3 bytes in the middle of every frame. The keys are in the
            packet header and the lookup tables were in the app binary; restoring them took decoder errors from 148 to 0.
          </p>
        </div>
        <div>
          <h4 className="font-serif text-xl text-black">vision missions</h4>
          <p className="mt-1">
            YOLO person and cat following (yaw only), plus OpenAI-powered missions like "find the yellow cabinet" that scan,
            center, and dip toward a target. Bonus gotcha: on macOS 26, the OpenAI SDK's default TLS setup silently cuts a
            process off from the local network.
          </p>
        </div>
        <div>
          <h4 className="font-serif text-xl text-black">payload drop</h4>
          <p className="mt-1">
            The drone's Wi-Fi is 5 GHz only and an ESP32-C3 is 2.4 GHz only, so the harness talks ESP-NOW to a second XIAO on
            the laptop. A 3.7 g servo winds a fishing line that pulls a paper-clip pin out of a 3D-printed latch.
          </p>
        </div>
      </div>

      <figure className="mt-10">
        <img
          src="/drone/scorpion_concept.webp"
          alt="Side-view sketch of the scorpion payload harness: top pod with battery, XIAO and servo, a pull line to a belly latch holding the payload loop on a pin"
          loading="lazy"
          className="w-full border border-gray-200 rounded-md"
        />
        <figcaption className="mt-2 text-sm text-gray-500 font-sans text-center">
          the "scorpion" harness: top pod, pull line, belly latch
        </figcaption>
      </figure>

      <div className="mt-10 flex flex-wrap gap-3 font-sans">
        <a href={REPO} target="_blank" rel="noreferrer" className="bg-black text-white px-5 py-2 rounded-md hover:opacity-85">
          code + lab notebook on github
        </a>
      </div>
      <p className="mt-6 text-xs text-gray-500 font-sans">
        Props off for first tests, open space, never drop anything over people, animals or roads, and follow local drone
        rules.
      </p>
    </article>
  );
}

