"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { StationHudState } from "@/lib/sim/store";

const CYAN = "#00F0FF";
const GREEN = "#00FF9D";
const PINK = "#FF2A85";
const AMBER = "#FFB454";

/** Mood derived from real HUD state — never fake online. */
export type HoloMood = "offline" | "calm" | "alert";

function moodFromHud(hud: StationHudState): HoloMood {
  if (!hud.online) return "offline";
  if (
    hud.lastStatus === "REQUIRES_REVIEW" ||
    hud.lastStatus === "NOT_ELIGIBLE_FOR_NEXT_STAGE" ||
    hud.lastStatus === "UNAUTHORISED" ||
    hud.lastStatus === "UNKNOWN_ID"
  )
    return "alert";
  return "calm";
}

/* ------------------------------------------------------------------ heart */

const HeartGroup = memo(function HeartGroup({
  mood,
  reduced,
}: {
  mood: HoloMood;
  reduced: boolean;
}) {
    const group = useRef<THREE.Group>(null);
    const arrows = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
      const t = clock.getElapsedTime();
      if (reduced) return; // static when user prefers reduced motion
      const spin = mood === "offline" ? 0.05 : 0.35;
      if (arrows.current) arrows.current.rotation.y = t * spin;
      // Emissive pulse: calm rhythm, faster/amber pulse on alert, dim offline.
      const pulse =
        mood === "alert"
          ? 0.55 + 0.45 * Math.abs(Math.sin(t * 4))
          : mood === "offline"
          ? 0.25
          : 0.5 + 0.25 * Math.abs(Math.sin(t * 1.4));
      group.current?.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && m.emissive) {
          const base = new THREE.Color(mood === "alert" ? AMBER : CYAN);
          m.emissive.copy(base);
          m.emissiveIntensity = pulse * (mood === "offline" ? 0.4 : 1);
        }
      });
    });

    // Procedural stylised heart: two lobes (spheres, squashed) + inferior cone.
    return (
      <group ref={group}>
        <group rotation={[0.15, 0, -0.12]}>
          <mesh position={[-0.32, 0.28, 0]} scale={[1, 1.05, 0.85]}>
            <sphereGeometry args={[0.62, 32, 32]} />
            <meshStandardMaterial
              color="#0a2431"
              emissive={CYAN}
              emissiveIntensity={0.6}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0.32, 0.28, 0]} scale={[1, 1.05, 0.85]}>
            <sphereGeometry args={[0.62, 32, 32]} />
            <meshStandardMaterial
              color="#0a2431"
              emissive={CYAN}
              emissiveIntensity={0.6}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
          <mesh position={[0, -0.62, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.62, 1.05, 32]} />
            <meshStandardMaterial
              color="#0a2431"
              emissive={CYAN}
              emissiveIntensity={0.5}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
          {/* wireframe overlay */}
          <mesh position={[0, 0.05, 0]} scale={1.04}>
            <sphereGeometry args={[0.78, 24, 24]} />
            <meshBasicMaterial color={GREEN} wireframe transparent opacity={0.18} />
          </mesh>
        </group>

        {/* Three orbiting recycling arrows on a tilted axis */}
        <group ref={arrows} rotation={[0.45, 0, 0.1]}>
          {[0, 1, 2].map((i) => {
            const arc = (Math.PI * 2) / 3;
            const start = i * arc + 0.25;
            return (
              <group key={i} rotation={[0, 0, start]}>
                <mesh position={[0, 0, 0]}>
                  <torusGeometry args={[1.35, 0.055, 12, 48, arc - 0.25]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? CYAN : GREEN}
                    emissive={i % 2 === 0 ? CYAN : GREEN}
                    emissiveIntensity={0.9}
                    metalness={0.4}
                    roughness={0.3}
                  />
                </mesh>
                {/* arrowhead */}
                <mesh
                  position={[1.35, 0.02, 0]}
                  rotation={[Math.PI / 2, 0, -Math.PI / 2]}
                >
                  <coneGeometry args={[0.12, 0.3, 12]} />
                  <meshStandardMaterial
                    color={i % 2 === 0 ? CYAN : GREEN}
                    emissive={i % 2 === 0 ? CYAN : GREEN}
                    emissiveIntensity={1.1}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      </group>
    );
});

/* ---------------------------------------------------------------- station */

function MedicineBox({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.1, 0.16]} />
        <meshStandardMaterial color="#12222e" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.052, 0]}>
        <boxGeometry args={[0.2, 0.004, 0.14]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function StationModel({
  irActive,
  gateOpen,
  reduced,
}: {
  irActive: boolean;
  gateOpen: boolean | null;
  reduced: boolean;
}) {
  const laser = useRef<THREE.Mesh>(null);
  const gate = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (laser.current && !reduced) {
      // Sweep vertically only while a package is actually detected (IR active)
      laser.current.visible = irActive;
      if (irActive) {
        laser.current.position.y = (t / 3 - Math.floor(t / 3)) * 0.36 - 0.15;
      }
    }
    if (gate.current) {
      const target = gateOpen ? 0.5 : 0;
      // open-loop representation: animate toward commanded angle; HUD states
      // that physical position is unconfirmed.
      gate.current.rotation.x += (target - gate.current.rotation.x) * (reduced ? 1 : 0.1);
    }
  });

  return (
    <group position={[0, -1.15, 0]} rotation={[0.42, 0.6, 0]}>
      {/* Illuminated circuit baseplate */}
      <mesh receiveShadow>
        <boxGeometry args={[2.6, 0.08, 2.6]} />
        <meshStandardMaterial color="#0b1622" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.042, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial color="#0e3a4a" transparent opacity={0.55} />
      </mesh>
      {/* circuit traces */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          position={[-1.1 + i * 0.44, 0.045, 1.05 - (i % 2) * 0.3]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.02, 0.9]} />
          <meshBasicMaterial color={i % 2 ? GREEN : CYAN} transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Enclosure frame (dark metallic) */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.9, 0.62, 1.2]} />
        <meshStandardMaterial color="#141f2b" metalness={0.75} roughness={0.3} />
      </mesh>
      {/* Transparent acrylic inspection chamber (front) */}
      <mesh position={[0, 0.34, 0.32]}>
        <boxGeometry args={[1.7, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#9BE8FF"
          transparent
          opacity={0.12}
          metalness={0.2}
          roughness={0.05}
        />
      </mesh>

      {/* Interior medicine boxes */}
      <MedicineBox position={[-0.45, 0.22, 0.32]} />
      <MedicineBox position={[0.02, 0.22, 0.32]} />
      <MedicineBox position={[0.5, 0.22, 0.32]} />

      {/* Laser scan plane — sweeps only when IR says a package is present */}
      <mesh ref={laser} position={[0, 0, 0.32]}>
        <planeGeometry args={[1.66, 0.03]} />
        <meshBasicMaterial color={PINK} transparent opacity={0.85} />
      </mesh>

      {/* Status LEDs on the front bezel (D12 green / D13 red style) */}
      <mesh position={[0.72, 0.1, 0.62]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color={GREEN} />
      </mesh>
      <mesh position={[0.84, 0.1, 0.62]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Articulated side hatch = servo gate (D19) */}
      <group ref={gate} position={[0.95, 0.1, 0.6]}>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.34, 0.62, 0.04]} />
          <meshStandardMaterial color="#1c2b3c" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      {/* Servo body beside the hatch */}
      <mesh position={[1.02, 0.1, 0.15]}>
        <boxGeometry args={[0.14, 0.12, 0.14]} />
        <meshStandardMaterial color="#243b52" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Ambient teal light pad under the model */}
      <pointLight position={[0, 0.2, 0.9]} intensity={0.35} color={CYAN} />
    </group>
  );
}

/* ------------------------------------------------------------ callout pins */

function Callout({
  text,
  position,
  accent = CYAN,
}: {
  text: string;
  position: [number, number, number];
  accent?: string;
}) {
  return (
    <Html position={position} center distanceFactor={6} zIndexRange={[20, 10]}>
      <div
        className="pointer-events-none whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] backdrop-blur"
        style={{
          borderColor: accent + "66",
          color: accent,
          background: "rgba(7,19,32,0.82)",
          boxShadow: `0 0 12px ${accent}33`,
        }}
      >
        {text}
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------- scene */

export interface HeroSceneProps {
  hud: StationHudState;
  gateOpen: boolean | null; // null = no confirmed command state; never fabricate
  reduced: boolean;
}

export default function HeroScene({ hud, gateOpen, reduced }: HeroSceneProps) {
  const mood = moodFromHud(hud);

  const sparkProps = useMemo(
    () => ({
      count: mood === "offline" ? 15 : 60,
      scale: [2.2, 3.5, 2.2] as [number, number, number],
      size: mood === "offline" ? 0.8 : 1.6,
      speed: reduced ? 0 : mood === "alert" ? 0.9 : 0.45,
      color: mood === "alert" ? AMBER : CYAN,
      opacity: mood === "offline" ? 0.25 : 0.6,
    }),
    [mood, reduced]
  );

  return (
    <Canvas
      camera={{ position: [0, 0.4, 6.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 3]} intensity={0.8} color="#7dd3fc" />
      <directionalLight position={[-3, 2, -3]} intensity={0.5} color={GREEN} />

      <group position={[0, 1.15, 0]}>
        <HeartGroup mood={mood} reduced={reduced} />
        <Sparkles {...sparkProps} />
        <Callout text="package bay · IR D27" position={[2.05, 0.25, 0.4]} />
        <Callout text="ultrasonic D4/D18 (HC-SR04)" position={[-2.15, 0.05, 0.3]} accent={GREEN} />
      </group>

      <StationModel irActive={hud.irActive} gateOpen={gateOpen} reduced={reduced} />
      <group position={[0, -1.15, 0]} rotation={[0, 0, 0]}>
        <Callout text="laser scan · active" position={[1.3, 0.75, 0.9]} accent={PINK} />
        <Callout
          text={
            gateOpen
              ? "servo gate D19 · commanded OPEN (position unconfirmed)"
              : "servo gate D19 · CLOSED (fail-safe)"
          }
          position={[-1.55, 0.35, 0.75]}
          accent={AMBER}
        />
      </group>

      <Sparkles
        count={12}
        scale={[5, 1.2, 4]}
        position={[0, -1, 0]}
        size={2}
        speed={reduced ? 0 : 0.25}
        color={GREEN}
        opacity={0.4}
      />
    </Canvas>
  );
}

/** Convenience: does the visitor prefer reduced motion? */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}
