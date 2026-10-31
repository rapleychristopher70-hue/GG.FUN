import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sound } from '../../utils/audio';
import {
  Droplets,
  Play,
  Pause,
  RotateCcw,
  PenTool,
  Eraser,
  Wind,
  Flame,
  Snowflake,
  Thermometer,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Power,
  Layers,
  Mountain,
} from 'lucide-react';

export type FluidSubstance =
  | 'water'
  | 'oil'
  | 'acid'
  | 'lava'
  | 'mercury'
  | 'honey'
  | 'nitrogen';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: FluidSubstance;
  temp: number; // in Celsius: <=0 Ice, 0-100 Liquid, >=100 Steam (or obsidian if lava <300)
}

interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type ToolMode =
  | 'pour_water'
  | 'pour_steam'
  | 'pour_ice'
  | 'pour_oil'
  | 'pour_boiling_oil'
  | 'pour_acid'
  | 'pour_lava'
  | 'pour_mercury'
  | 'pour_honey'
  | 'pour_nitrogen'
  | 'heat_torch'
  | 'freeze_ray'
  | 'draw_wall'
  | 'eraser'
  | 'vortex'
  | 'drain';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 420;
const H = 15; // Interaction radius
const H2 = H * H;
const REST_DIST = 6.2; // Equilibrium distance where repulsion balances attraction
const MAX_PARTICLES = 1800;

// Densities relative to water (1.0) for authentic vertical stratification
const FLUID_DENSITY: Record<FluidSubstance, number> = {
  oil: 0.72,
  nitrogen: 0.82,
  water: 1.0,
  acid: 1.08,
  honey: 1.35,
  lava: 1.62,
  mercury: 2.30,
};

export const WaterSimulator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const wallsRef = useRef<WallSegment[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const [activeTool, setActiveTool] = useState<ToolMode>('pour_water');
  const activeToolRef = useRef<ToolMode>('pour_water');
  activeToolRef.current = activeTool;

  const [isSimulating, setIsSimulating] = useState(true);
  const [gravity, setGravity] = useState<number>(0.36);
  const [viscosity, setViscosity] = useState<number>(0.985);
  const [surfaceTension, setSurfaceTension] = useState<number>(0.42);
  const [ambientTemp, setAmbientTemp] = useState<number>(22); // 22°C Room temp
  const [particleCount, setParticleCount] = useState<number>(0);
  const [isFaucetOn, setIsFaucetOn] = useState<boolean>(false);
  const [hoveredInfo, setHoveredInfo] = useState<{ temp: number; type: FluidSubstance } | null>(null);

  // Optional Sun & Solar Heat Simulation
  const [isSunOn, setIsSunOn] = useState<boolean>(true);
  const isSunOnRef = useRef<boolean>(true);
  isSunOnRef.current = isSunOn;

  const [sunIntensity, setSunIntensity] = useState<number>(1.0);
  const sunIntensityRef = useRef<number>(1.0);
  sunIntensityRef.current = sunIntensity;

  const [sunPos, setSunPos] = useState<{ x: number; y: number }>({ x: 520, y: 70 });
  const sunPosRef = useRef<{ x: number; y: number }>({ x: 520, y: 70 });
  const isDraggingSunRef = useRef<boolean>(false);

  const toggleSun = useCallback(() => {
    setIsSunOn(prev => {
      const next = !prev;
      isSunOnRef.current = next;
      return next;
    });
    sound.playClick();
  }, []);

  const isMouseDownRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastWallPointRef = useRef<{ x: number; y: number } | null>(null);

  // Helper to spawn a cluster of particles at an exact spot
  const spawnCluster = useCallback((x: number, y: number, type: FluidSubstance, temp: number, count = 5) => {
    const list = particlesRef.current;
    for (let i = 0; i < count; i++) {
      if (list.length >= MAX_PARTICLES) {
        // Recycle oldest particle rather than blocking the user
        list.shift();
      }
      const isSteamInit = type === 'water' && temp >= 100;
      list.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.5) * 1.2,
        vy: isSteamInit ? -1.5 - Math.random() : (Math.random() - 0.5) * 1.2 + 0.8,
        type,
        temp,
      });
    }
  }, []);

  // Presets
  const loadDamBreakPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 20, x2: 20, y2: 390 },
      { x1: 620, y1: 20, x2: 620, y2: 390 },
      // Obstacle ramp
      { x1: 340, y1: 390, x2: 440, y2: 320 },
      { x1: 440, y1: 320, x2: 500, y2: 390 },
    ];

    // Column of cohesive liquid water
    for (let x = 40; x < 180; x += 7) {
      for (let y = 160; y < 380; y += 7) {
        pts.push({
          x: x + (Math.random() - 0.5) * 2,
          y: y + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 0.3,
          vy: Math.random() * 0.4,
          type: 'water',
          temp: 18,
        });
      }
    }
    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Floating Iceberg in Warm Sea
  const loadIcebergPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 40, x2: 20, y2: 390 },
      { x1: 620, y1: 40, x2: 620, y2: 390 },
    ];

    // Warm sea water (35°C) at bottom
    for (let x = 30; x < 610; x += 7.5) {
      for (let y = 260; y < 385; y += 7.5) {
        pts.push({
          x: x + (Math.random() - 0.5) * 1.5,
          y: y + (Math.random() - 0.5) * 1.5,
          vx: 0,
          vy: 0,
          type: 'water',
          temp: 35,
        });
      }
    }

    // Ice block (-15°C) floating in the center
    for (let x = 270; x < 370; x += 6.5) {
      for (let y = 190; y < 270; y += 6.5) {
        pts.push({
          x: x + (Math.random() - 0.5) * 0.8,
          y: y + (Math.random() - 0.5) * 0.8,
          vx: 0,
          vy: 0,
          type: 'water',
          temp: -15, // Solid Ice!
        });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Boiling Geyser
  const loadBoilingGeyserPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 20, x2: 20, y2: 390 },
      { x1: 620, y1: 20, x2: 620, y2: 390 },
      // Funnel channel leading to geyser nozzle
      { x1: 60, y1: 320, x2: 280, y2: 360 },
      { x1: 580, y1: 320, x2: 360, y2: 360 },
    ];

    // Reservoir of boiling water (105°C) in the nozzle
    for (let x = 290; x < 350; x += 6.5) {
      for (let y = 300; y < 385; y += 6.5) {
        pts.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -2 - Math.random() * 2,
          type: 'water',
          temp: 110, // Boiling Steam!
        });
      }
    }

    // Cool surrounding water (20°C)
    for (let x = 70; x < 270; x += 7.5) {
      for (let y = 240; y < 320; y += 7.5) {
        pts.push({
          x,
          y,
          vx: 0,
          vy: 0,
          type: 'water',
          temp: 20,
        });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Oil & Water
  const loadOilWaterPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 30, y1: 390, x2: 610, y2: 390 },
      { x1: 30, y1: 30, x2: 30, y2: 390 },
      { x1: 610, y1: 30, x2: 610, y2: 390 },
    ];

    // Water layer
    for (let x = 50; x < 590; x += 8) {
      for (let y = 300; y < 385; y += 8) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'water', temp: 20 });
      }
    }
    // Oil layer
    for (let x = 50; x < 590; x += 8) {
      for (let y = 200; y < 275; y += 8) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'oil', temp: 20 });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Boiling Oil & Water Reaction
  const loadBoilingOilPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 30, y1: 390, x2: 610, y2: 390 },
      { x1: 30, y1: 40, x2: 30, y2: 390 },
      { x1: 610, y1: 40, x2: 610, y2: 390 },
    ];

    // Deep reservoir of boiling, sizzling oil (225°C)
    for (let x = 50; x < 590; x += 8) {
      for (let y = 290; y < 385; y += 8) {
        pts.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.5,
          type: 'oil',
          temp: 225, // Boiling hot oil!
        });
      }
    }

    // Water droplets poised above ready to splash in
    for (let x = 220; x < 420; x += 8.5) {
      for (let y = 140; y < 220; y += 8.5) {
        pts.push({
          x,
          y,
          vx: 0,
          vy: 0.8 + Math.random() * 0.4,
          type: 'water',
          temp: 20,
        });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Volcano & Ocean
  const loadVolcanoPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 40, x2: 20, y2: 390 },
      { x1: 620, y1: 40, x2: 620, y2: 390 },
      // Volcanic mountain slope
      { x1: 20, y1: 170, x2: 210, y2: 280 },
      { x1: 210, y1: 280, x2: 270, y2: 350 },
    ];

    // Ocean water on right basin
    for (let x = 280; x < 610; x += 7.5) {
      for (let y = 280; y < 385; y += 7.5) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'water', temp: 18 });
      }
    }

    // Magma reservoir atop the volcanic crater
    for (let x = 30; x < 120; x += 7.5) {
      for (let y = 80; y < 165; y += 7.5) {
        pts.push({
          x: x + (Math.random() - 0.5) * 1.5,
          y: y + (Math.random() - 0.5) * 1.5,
          vx: Math.random() * 0.4 + 0.2,
          vy: Math.random() * 0.3,
          type: 'lava',
          temp: 850,
        });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Density Stratification Tower
  const loadDensityTowerPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 50, y1: 390, x2: 590, y2: 390 },
      { x1: 50, y1: 50, x2: 50, y2: 390 },
      { x1: 590, y1: 50, x2: 590, y2: 390 },
    ];

    // Bottom layer: Mercury (Quicksilver)
    for (let x = 70; x < 570; x += 9) {
      for (let y = 345; y < 385; y += 9) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'mercury', temp: 20 });
      }
    }

    // Middle-lower layer: Viscous Honey
    for (let x = 70; x < 570; x += 9) {
      for (let y = 295; y < 340; y += 9) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'honey', temp: 20 });
      }
    }

    // Middle layer: Pure Water
    for (let x = 70; x < 570; x += 9) {
      for (let y = 240; y < 290; y += 9) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'water', temp: 20 });
      }
    }

    // Top layer: Golden Oil
    for (let x = 70; x < 570; x += 9) {
      for (let y = 180; y < 235; y += 9) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'oil', temp: 20 });
      }
    }

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Preset: Sun & Glacial Basin
  const loadSunGlacierPreset = useCallback(() => {
    const pts: Particle[] = [];
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 40, x2: 20, y2: 390 },
      { x1: 620, y1: 40, x2: 620, y2: 390 },
    ];

    // Ocean water basin
    for (let x = 30; x < 610; x += 8) {
      for (let y = 320; y < 385; y += 8) {
        pts.push({ x, y, vx: 0, vy: 0, type: 'water', temp: 24 });
      }
    }

    // Huge iceberg positioned directly beneath the sun
    for (let x = 200; x < 380; x += 7) {
      for (let y = 180; y < 315; y += 7) {
        pts.push({
          x: x + (Math.random() - 0.5),
          y: y + (Math.random() - 0.5),
          vx: 0,
          vy: 0,
          type: 'water',
          temp: -18,
        });
      }
    }

    // Turn sun on and position over glacier
    setIsSunOn(true);
    isSunOnRef.current = true;
    setSunPos({ x: 340, y: 55 });
    sunPosRef.current = { x: 340, y: 55 };

    particlesRef.current = pts;
    setParticleCount(pts.length);
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadDamBreakPreset();
  }, [loadDamBreakPreset]);

  // Window-level mouseup listener to guarantee isMouseDown is never stuck
  useEffect(() => {
    const handleGlobalUp = () => {
      isMouseDownRef.current = false;
      lastWallPointRef.current = null;
    };
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, []);

  // Physics Step with Thermal Simulation, Surface Tension & Cohesion
  const stepPhysics = useCallback(() => {
    const particles = particlesRef.current;
    const walls = wallsRef.current;
    const tool = activeToolRef.current;
    const n = particles.length;

    // Faucet spawn
    if (isFaucetOn) {
      spawnCluster(320, 20, 'water', 20, 3);
    }

    // Continuous Mouse Drag Tool Action
    if (isMouseDownRef.current) {
      const { x, y } = mousePosRef.current;

      if (tool === 'pour_water') {
        spawnCluster(x, y, 'water', 20, 4);
      } else if (tool === 'pour_steam') {
        spawnCluster(x, y, 'water', 115, 4); // Steam
      } else if (tool === 'pour_ice') {
        spawnCluster(x, y, 'water', -15, 3); // Ice pellets
      } else if (tool === 'pour_oil') {
        spawnCluster(x, y, 'oil', 20, 4);
      } else if (tool === 'pour_boiling_oil') {
        spawnCluster(x, y, 'oil', 225, 4); // Sizzling boiling oil
      } else if (tool === 'pour_acid') {
        spawnCluster(x, y, 'acid', 25, 4);
      } else if (tool === 'pour_lava') {
        spawnCluster(x, y, 'lava', 850, 3);
      } else if (tool === 'pour_mercury') {
        spawnCluster(x, y, 'mercury', 20, 4);
      } else if (tool === 'pour_honey') {
        spawnCluster(x, y, 'honey', 22, 3);
      } else if (tool === 'pour_nitrogen') {
        spawnCluster(x, y, 'nitrogen', -196, 4);
      } else if (tool === 'heat_torch') {
        // Torch heats particles near cursor to boil water & oil
        const r2 = 65 * 65;
        for (let i = 0; i < n; i++) {
          const p = particles[i];
          const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d2 < r2) {
            p.temp = Math.min(350, p.temp + 12.0);
            if (p.type === 'water' && p.temp >= 100) {
              p.vy -= 2.0 + Math.random() * 1.2; // Steam launches up!
              p.vx += (Math.random() - 0.5) * 1.6;
            } else if (p.type === 'oil' && p.temp >= 190) {
              p.vy -= 2.0 + Math.random() * 1.2; // Boiling oil vapor launches up!
              p.vx += (Math.random() - 0.5) * 1.6;
            }
          }
        }
      } else if (tool === 'freeze_ray') {
        // Freeze ray chills and solidifies particles into ice
        const r2 = 65 * 65;
        for (let i = 0; i < n; i++) {
          const p = particles[i];
          const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d2 < r2) {
            p.temp = Math.max(-30, p.temp - 9.0);
            if (p.type === 'water' && p.temp <= 0) {
              // Freeze solid in place!
              p.vx = 0;
              p.vy = 0;
            }
          }
        }
      } else if (tool === 'vortex') {
        for (let i = 0; i < n; i++) {
          const p = particles[i];
          const dx = x - p.x;
          const dy = y - p.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 40000 && dist2 > 25) {
            const dist = Math.sqrt(dist2);
            p.vx += (dx / dist) * 0.45;
            p.vy += (dy / dist) * 0.45;
            p.vx += (-dy / dist) * 0.65;
            p.vy += (dx / dist) * 0.65;
          }
        }
      } else if (tool === 'drain') {
        particlesRef.current = particles.filter(p => {
          const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
          return d2 > 1200; // 35px radius
        });
      }
    }

    // Spatial Hash Grid
    const cellSize = H;
    const grid: Record<string, number[]> = {};
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const gx = Math.floor(p.x / cellSize);
      const gy = Math.floor(p.y / cellSize);
      const key = `${gx},${gy}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(i);
    }

    // Cohesion & Repulsion + Thermal Conduction Loop
    for (let i = 0; i < n; i++) {
      const p1 = particles[i];
      const isIce1 = p1.type === 'water' && p1.temp <= 0;
      const isSteam1 = p1.type === 'water' && p1.temp >= 100;

      const gx = Math.floor(p1.x / cellSize);
      const gy = Math.floor(p1.y / cellSize);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const key = `${gx + ox},${gy + oy}`;
          const cell = grid[key];
          if (!cell) continue;

          for (const j of cell) {
            if (i >= j) continue;
            const p2 = particles[j];
            const isIce2 = p2.type === 'water' && p2.temp <= 0;
            const isSteam2 = p2.type === 'water' && p2.temp >= 100;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist2 = dx * dx + dy * dy;

            if (dist2 < H2 && dist2 > 0.001) {
              const dist = Math.sqrt(dist2);
              const dirX = dx / dist;
              const dirY = dy / dist;

              // Thermal Conduction between adjacent particles
              const tempDiff = p2.temp - p1.temp;
              const heatExchange = tempDiff * 0.04;
              p1.temp += heatExchange;
              p2.temp -= heatExchange;

              // Physical Force Calculation:
              if (dist < REST_DIST) {
                // Short-range repulsion
                const q = 1 - dist / REST_DIST;
                const repelFactor = q * 0.65;
                if (!isIce1) {
                  p1.vx -= dirX * repelFactor;
                  p1.vy -= dirY * repelFactor;
                }
                if (!isIce2) {
                  p2.vx += dirX * repelFactor;
                  p2.vy += dirY * repelFactor;
                }
              } else if (!isSteam1 && !isSteam2) {
                // Medium-range COHESION (surface tension)
                const q = (dist - REST_DIST) / (H - REST_DIST);
                const attractFactor = (1 - q) * surfaceTension * 0.35;
                if (!isIce1) {
                  p1.vx += dirX * attractFactor;
                  p1.vy += dirY * attractFactor;
                }
                if (!isIce2) {
                  p2.vx -= dirX * attractFactor;
                  p2.vy -= dirY * attractFactor;
                }
              }

              // Ice & Obsidian Solid Locking:
              const isObsidian1 = p1.type === 'lava' && p1.temp < 300;
              const isObsidian2 = p2.type === 'lava' && p2.temp < 300;

              if (isIce1 && isIce2) {
                p1.vx = 0; p1.vy = 0; p2.vx = 0; p2.vy = 0;
              } else if (isObsidian1 && isObsidian2) {
                // Hardened volcanic obsidian rock is locked solid
                p1.vx = 0; p1.vy = 0; p2.vx = 0; p2.vy = 0;
              } else if (isIce1 && p2.type === 'water' && p2.temp > 0) {
                // Ice chills touching water and freezes it!
                p2.temp -= 0.8;
                if (p2.temp <= 0) { p2.vx = 0; p2.vy = 0; }
              } else if (isIce2 && p1.type === 'water' && p1.temp > 0) {
                p1.temp -= 0.8;
                if (p1.temp <= 0) { p1.vx = 0; p1.vy = 0; }
              }

              // Liquid Nitrogen (-196°C) Instantly Freezes Water on Contact
              if (p1.type === 'nitrogen' && p2.type === 'water') {
                p2.temp = -12;
                p2.vx = 0; p2.vy = 0;
                p1.temp += 8.0;
              } else if (p1.type === 'water' && p2.type === 'nitrogen') {
                p1.temp = -12;
                p1.vx = 0; p1.vy = 0;
                p2.temp += 8.0;
              }

              // Molten Lava (850°C) vs Water Reaction: Violent Steam Burst!
              if (p1.type === 'lava' && p2.type === 'water') {
                if (p1.temp >= 300) {
                  p2.temp = 125; // Water flashes to steam!
                  p2.vy -= 2.2 + Math.random();
                  p1.temp -= 8.5; // Lava cools down
                }
              } else if (p1.type === 'water' && p2.type === 'lava') {
                if (p2.temp >= 300) {
                  p1.temp = 125;
                  p1.vy -= 2.2 + Math.random();
                  p2.temp -= 8.5;
                }
              }

              // Boiling Oil (>=190°C) vs Water Reaction: Violent Sizzling Spatter!
              if (p1.type === 'oil' && p1.temp >= 190 && p2.type === 'water') {
                p2.temp = 125; // Water flashes to explosive steam!
                p2.vy -= 2.6 + Math.random();
                p1.vy -= 1.8 + Math.random();
                p1.vx += (Math.random() - 0.5) * 2.0; // Sizzling oil spatters!
              } else if (p1.type === 'water' && p2.type === 'oil' && p2.temp >= 190) {
                p1.temp = 125;
                p1.vy -= 2.6 + Math.random();
                p2.vy -= 1.8 + Math.random();
                p2.vx += (Math.random() - 0.5) * 2.0;
              }

              // Molten Lava (>=300°C) vs Oil: Instant explosive oil boiling!
              if (p1.type === 'lava' && p2.type === 'oil') {
                if (p1.temp >= 300) {
                  p2.temp = 230; // Oil boils vigorously into smoke!
                  p2.vy -= 2.2 + Math.random();
                  p1.temp -= 6.0;
                }
              } else if (p1.type === 'oil' && p2.type === 'lava') {
                if (p2.temp >= 300) {
                  p1.temp = 230;
                  p1.vy -= 2.2 + Math.random();
                  p2.temp -= 6.0;
                }
              }

              // Multi-Fluid Density Stratification
              if (p1.type !== p2.type) {
                const d1 = FLUID_DENSITY[p1.type] ?? 1.0;
                const d2 = FLUID_DENSITY[p2.type] ?? 1.0;
                if (d1 < d2) {
                  const diff = Math.min(0.25, (d2 - d1) * 0.12);
                  p1.vy -= diff;
                  p2.vy += diff;
                } else if (d1 > d2) {
                  const diff = Math.min(0.25, (d1 - d2) * 0.12);
                  p1.vy += diff;
                  p2.vy += diff;
                }
              }
            }
          }
        }
      }
    }

    // Solar Radiant Heat from Sun (if Sun is active)
    if (isSunOnRef.current) {
      const { x: sx, y: sy } = sunPosRef.current;
      const intensity = sunIntensityRef.current;
      const solarPower = intensity * 0.085;

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        const dx = p.x - sx;
        const dy = p.y - sy;
        if (dy > -20) {
          const depthAttenuation = Math.max(0.12, 1 - p.y / 380);
          const angleAttenuation = Math.max(0.25, 1 - Math.abs(dx) / 500);
          const heatRate = solarPower * depthAttenuation * angleAttenuation;

          p.temp += heatRate;

          // Solar evaporation of surface water into natural steam clouds
          if (p.type === 'water' && p.y < 240 && p.temp >= 85) {
            if (Math.random() < 0.012 * intensity) {
              p.temp = 105; // Evaporates into rising steam!
              p.vy -= 1.4;
            }
          }

          // Solar boil-off of liquid nitrogen
          if (p.type === 'nitrogen' && p.temp > -160 && Math.random() < 0.03 * intensity) {
            p.vy -= 1.6;
          }
        }
      }
    }

    // Position updates, phase buoyancy, boundaries & wall collisions
    const pad = 12;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const isIce = p.type === 'water' && p.temp <= 0;
      const isSteam = p.type === 'water' && p.temp >= 100;
      const isObsidian = p.type === 'lava' && p.temp < 300;
      const isBoilingOil = p.type === 'oil' && p.temp >= 190;

      // Ambient thermal exchange (fluids slowly adjust toward room temperature)
      p.temp += (ambientTemp - p.temp) * 0.003;

      if (isSteam) {
        // Steam steams up into the air vigorously!
        p.vy -= 1.35 + Math.random() * 0.6;
        p.vx += (Math.random() - 0.5) * 0.8;
        // Thermal cooling as steam rises
        p.temp -= 0.06;
      } else if (isBoilingOil) {
        // Boiling oil releases billowing smoky vapor plumes!
        p.vy -= 1.45 + Math.random() * 0.7;
        p.vx += (Math.random() - 0.5) * 1.0;
        p.temp -= 0.08; // Cools as smoke rises
      } else if (isIce || isObsidian) {
        // Frozen Ice & Solid Obsidian Rock stay firm in place!
        p.vx = 0;
        p.vy = 0;
      } else {
        // Natural density-scaled gravity
        const dens = FLUID_DENSITY[p.type] ?? 1.0;
        const g = gravity * (0.65 + dens * 0.35);
        p.vy += g;
      }

      // Viscosity damping per liquid type
      if (!isIce && !isObsidian) {
        let fluidVisc = viscosity;
        if (p.type === 'honey') fluidVisc = 0.80; // Sluggish viscous syrup
        else if (p.type === 'lava') fluidVisc = 0.91; // Thick molten magma
        else if (p.type === 'mercury') fluidVisc = 0.99; // Ultra fluid quicksilver
        else if (p.type === 'oil') fluidVisc = isBoilingOil ? 0.99 : (p.temp <= 0 ? 0.90 : 0.95);

        p.vx *= (isSteam || isBoilingOil) ? 0.99 : fluidVisc;
        p.vy *= (isSteam || isBoilingOil) ? 0.99 : fluidVisc;

        p.x += p.vx;
        p.y += p.vy;
      }

      // Vapor dissipation at the ceiling
      if ((isSteam || isBoilingOil) && p.y <= pad + 2) {
        if (ambientTemp < 15 && isSteam) {
          p.temp = 85; // Condense back to water droplets in freezing weather
          p.vy = 1.0;
        } else {
          // Dissipate into open air
          p.y = pad + 1;
          p.vy = -0.3;
        }
      }

      // Canvas boundary bouncing
      if (p.x < pad) {
        p.x = pad;
        p.vx = -p.vx * 0.4;
      }
      if (p.x > CANVAS_WIDTH - pad) {
        p.x = CANVAS_WIDTH - pad;
        p.vx = -p.vx * 0.4;
      }
      if (p.y < pad) {
        p.y = pad;
        p.vy = -p.vy * 0.4;
      }
      if (p.y > CANVAS_HEIGHT - pad) {
        p.y = CANVAS_HEIGHT - pad;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.88; // Floor friction
      }

      // Wall segment collisions
      for (const w of walls) {
        const vx = w.x2 - w.x1;
        const vy = w.y2 - w.y1;
        const len2 = vx * vx + vy * vy;
        if (len2 === 0) continue;

        const t = Math.max(0, Math.min(1, ((p.x - w.x1) * vx + (p.y - w.y1) * vy) / len2));
        const projX = w.x1 + t * vx;
        const projY = w.y1 + t * vy;

        const dist2 = (p.x - projX) ** 2 + (p.y - projY) ** 2;
        const collRadius = 6.0;

        if (dist2 < collRadius * collRadius) {
          const dist = Math.sqrt(dist2) || 0.001;
          const nx = (p.x - projX) / dist;
          const ny = (p.y - projY) / dist;

          p.x = projX + nx * collRadius;
          p.y = projY + ny * collRadius;

          const dot = p.vx * nx + p.vy * ny;
          if (dot < 0) {
            p.vx = (p.vx - 1.5 * dot * nx) * 0.6;
            p.vy = (p.vy - 1.5 * dot * ny) * 0.6;
          }

          // Acid slowly dissolves walls
          if (p.type === 'acid' && Math.random() < 0.04) {
            w.x1 += (Math.random() - 0.5) * 1.5;
            w.y1 += (Math.random() - 0.5) * 1.5;
          }
        }
      }
    }
  }, [gravity, viscosity, surfaceTension, ambientTemp, isFaucetOn, spawnCluster]);

  // Render Loop with Cohesive Liquid Fluid Rendering (bridges & metaballs)
  useEffect(() => {
    const loop = () => {
      if (isSimulating) {
        stepPhysics();
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a0f1d';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          // If Sun is OFF, render calm nocturnal starry sky
          if (!isSunOnRef.current) {
            ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
            const stars: [number, number][] = [
              [45, 22], [90, 48], [145, 18], [210, 36], [280, 16], [340, 44],
              [415, 20], [475, 48], [530, 24], [585, 38], [615, 16],
              [65, 75], [170, 82], [245, 65], [380, 80], [445, 70], [515, 85]
            ];
            for (let s = 0; s < stars.length; s++) {
              ctx.fillRect(stars[s][0], stars[s][1], 1.5, 1.5);
            }
          }

          // Render Radiant Sun & Solar Heat Rays (if Sun is active)
          if (isSunOnRef.current) {
            const { x: sx, y: sy } = sunPosRef.current;
            const intensity = sunIntensityRef.current;
            const time = Date.now() * 0.0012;

            ctx.save();

            // 1. Radiant Solar Sunbeams down into the fluid basin
            const beamCount = 6;
            ctx.fillStyle = `rgba(254, 240, 138, ${0.04 * intensity})`;
            for (let b = 0; b < beamCount; b++) {
              const angle = 0.55 + (b / beamCount) * 1.5 + Math.sin(time + b) * 0.06;
              const len = 400;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + Math.cos(angle - 0.12) * len, sy + Math.sin(angle - 0.12) * len);
              ctx.lineTo(sx + Math.cos(angle + 0.12) * len, sy + Math.sin(angle + 0.12) * len);
              ctx.closePath();
              ctx.fill();
            }

            // 2. Solar Corona (glowing halo)
            const coronaRadius = Math.max(45, 75 * Math.sqrt(intensity));
            const coronaGrad = ctx.createRadialGradient(sx, sy, 8, sx, sy, coronaRadius);
            coronaGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
            coronaGrad.addColorStop(0.25, 'rgba(251, 191, 36, 0.45)');
            coronaGrad.addColorStop(0.65, 'rgba(245, 158, 11, 0.15)');
            coronaGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = coronaGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, coronaRadius, 0, Math.PI * 2);
            ctx.fill();

            // 3. Sun Disc with Pulsating Flares
            const flareCount = 10;
            ctx.fillStyle = '#fef08a';
            for (let f = 0; f < flareCount; f++) {
              const fAngle = (f / flareCount) * Math.PI * 2 + time * 0.6;
              const fLen = 22 + Math.sin(time * 3 + f) * 3;
              ctx.beginPath();
              ctx.arc(sx + Math.cos(fAngle) * fLen, sy + Math.sin(fAngle) * fLen, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // 4. Inner Golden Core
            const coreGrad = ctx.createRadialGradient(sx - 3, sy - 3, 2, sx, sy, 18);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.4, '#fef08a');
            coreGrad.addColorStop(0.85, '#f59e0b');
            coreGrad.addColorStop(1, '#d97706');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(sx, sy, 18, 0, Math.PI * 2);
            ctx.fill();

            // 5. Sun Label / Drag Indicator
            ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('☀️ SUN (Drag)', sx, sy + 32);

            ctx.restore();
          }

          // Draw Walls
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          for (const w of wallsRef.current) {
            ctx.beginPath();
            ctx.moveTo(w.x1, w.y1);
            ctx.lineTo(w.x2, w.y2);
            ctx.stroke();
          }

          const particles = particlesRef.current;
          const n = particles.length;

          // Pass 1: Draw Cohesive Fluid Bridges between neighboring particles
          // (This connects separate dots into a continuous body of liquid!)
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';

          for (let i = 0; i < n; i += 2) {
            const p1 = particles[i];
            if (p1.type === 'water' && p1.temp >= 100) continue; // Only water steam is misty, not bridged
            if (p1.type === 'oil' && p1.temp >= 190) continue; // Boiling oil vapor is misty smoke, not bridged

            for (let j = i + 1; j < Math.min(n, i + 8); j++) {
              const p2 = particles[j];
              if (p1.type !== p2.type) continue;
              const d2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

              if (d2 < 144) { // within 12px
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

                if (p1.type === 'oil') {
                  ctx.strokeStyle = p1.temp <= 0 ? 'rgba(180, 83, 9, 0.55)' : (p1.temp >= 120 ? 'rgba(251, 146, 60, 0.65)' : 'rgba(234, 179, 8, 0.45)');
                } else if (p1.type === 'acid') {
                  ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
                } else if (p1.type === 'lava') {
                  ctx.strokeStyle = p1.temp >= 300 ? 'rgba(249, 115, 22, 0.65)' : 'rgba(51, 65, 85, 0.75)';
                } else if (p1.type === 'mercury') {
                  ctx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
                } else if (p1.type === 'honey') {
                  ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
                } else if (p1.type === 'nitrogen') {
                  ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
                } else if (p1.type === 'water' && p1.temp <= 0) {
                  ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)'; // Solid ice bridge
                } else if (p1.temp > 60) {
                  ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)'; // Hot water
                } else {
                  ctx.strokeStyle = 'rgba(14, 165, 233, 0.55)'; // Deep cohesive blue water
                }
                ctx.stroke();
              }
            }
          }

          // Pass 2: Draw Fluid Blobs with temperature/phase coloring
          for (let i = 0; i < n; i++) {
            const p = particles[i];
            ctx.save();

            if (p.type === 'oil') {
              if (p.temp >= 190) {
                // Boiling Oil: Billowing smoky vapor plumes with sizzling core!
                ctx.fillStyle = p.temp >= 260 ? 'rgba(180, 83, 9, 0.45)' : 'rgba(217, 119, 6, 0.42)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6.8, 0, Math.PI * 2);
                ctx.fill();

                // Inner sizzling golden boiling droplet
                ctx.fillStyle = '#fde047';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
                ctx.fill();
              } else if (p.temp <= 0) {
                ctx.fillStyle = '#b45309'; // Chilled viscous dark amber oil
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
                ctx.fill();

                // Specular golden reflection
                ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
                ctx.beginPath();
                ctx.arc(p.x - 1.2, p.y - 1.2, 1.8, 0, Math.PI * 2);
                ctx.fill();
              } else if (p.temp >= 120) {
                // Sizzling hot liquid oil (bright shimmering amber-orange)
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
                ctx.fill();

                // Hot simmer sparkle
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(p.x - 1.2, p.y - 1.2, 2.0, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.fillStyle = '#eab308'; // Classic golden oil
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
                ctx.fill();

                // Specular golden reflection
                ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
                ctx.beginPath();
                ctx.arc(p.x - 1.2, p.y - 1.2, 1.8, 0, Math.PI * 2);
                ctx.fill();
              }
            } else if (p.type === 'acid') {
              // Toxic Acid
              ctx.fillStyle = '#4ade80';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'lava') {
              // Molten Magma vs Solid Obsidian Rock
              if (p.temp >= 300) {
                // Molten Lava
                ctx.fillStyle = p.temp > 650 ? '#f97316' : '#ea580c';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
                ctx.fill();

                // Glowing fiery core
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Hardened Obsidian Rock
                ctx.fillStyle = '#334155';
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
            } else if (p.type === 'mercury') {
              // Liquid Metal Quicksilver: Silver mirror sheen
              ctx.fillStyle = '#cbd5e1';
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Specular metallic gleam
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(p.x - 1.2, p.y - 1.2, 1.8, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'honey') {
              // Viscous Golden Honey
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.8, 0, Math.PI * 2);
              ctx.fill();

              // Glossy honey reflection
              ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
              ctx.beginPath();
              ctx.arc(p.x - 1.2, p.y - 1.2, 1.8, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'nitrogen') {
              // Liquid Nitrogen (-196°C)
              ctx.fillStyle = '#e0f2fe';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
              ctx.fill();

              // Freezing fog halo
              ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'water' && p.temp >= 100) {
              // Boiling Steam (translucent white-blue vapor)
              ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.type === 'water' && p.temp <= 0) {
              // Solid Ice (Crystalline cyan/white with crisp outline)
              ctx.fillStyle = '#bae6fd';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              // Cohesive Liquid Water: Color shifts subtly with temperature
              if (p.temp > 60) {
                ctx.fillStyle = '#fb923c'; // Warm/hot orange-blue
              } else if (p.temp < 10) {
                ctx.fillStyle = '#38bdf8'; // Chilled cyan
              } else {
                ctx.fillStyle = '#0284c7'; // Classic deep azure water
              }
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4.6, 0, Math.PI * 2);
              ctx.fill();

              // Highlight specular shine for liquid feel
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.beginPath();
              ctx.arc(p.x - 1.2, p.y - 1.2, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // Faucet Indicator
          if (isFaucetOn) {
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(320, 16, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      setParticleCount(particlesRef.current.length);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSimulating, stepPhysics, isFaucetOn]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if user clicked on the radiant Sun to drag it
    if (isSunOnRef.current) {
      const distToSun = Math.hypot(x - sunPosRef.current.x, y - sunPosRef.current.y);
      if (distToSun < 38) {
        isDraggingSunRef.current = true;
        sound.playClick();
        return;
      }
    }

    isMouseDownRef.current = true;
    mousePosRef.current = { x, y };

    const tool = activeToolRef.current;

    // IMMEDIATE SPURT on first click (guarantees clicking once drops fluids!)
    if (tool === 'pour_water') {
      spawnCluster(x, y, 'water', 20, 8);
      sound.playSplash();
    } else if (tool === 'pour_steam') {
      spawnCluster(x, y, 'water', 115, 8);
      sound.playSplash();
    } else if (tool === 'pour_ice') {
      spawnCluster(x, y, 'water', -15, 6);
      sound.playClick();
    } else if (tool === 'pour_oil') {
      spawnCluster(x, y, 'oil', 20, 8);
      sound.playSplash();
    } else if (tool === 'pour_boiling_oil') {
      spawnCluster(x, y, 'oil', 225, 8);
      sound.playSplash();
    } else if (tool === 'pour_acid') {
      spawnCluster(x, y, 'acid', 25, 8);
      sound.playSplash();
    } else if (tool === 'pour_lava') {
      spawnCluster(x, y, 'lava', 850, 6);
      sound.playSplash();
    } else if (tool === 'pour_mercury') {
      spawnCluster(x, y, 'mercury', 20, 8);
      sound.playClick();
    } else if (tool === 'pour_honey') {
      spawnCluster(x, y, 'honey', 22, 6);
      sound.playSplash();
    } else if (tool === 'pour_nitrogen') {
      spawnCluster(x, y, 'nitrogen', -196, 8);
      sound.playSplash();
    } else if (tool === 'draw_wall') {
      lastWallPointRef.current = { x, y };
    } else if (tool === 'eraser') {
      wallsRef.current = wallsRef.current.filter(w => {
        const mx = (w.x1 + w.x2) / 2;
        const my = (w.y1 + w.y2) / 2;
        return (mx - x) ** 2 + (my - y) ** 2 > 400;
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Drag the radiant Sun across the sky!
    if (isDraggingSunRef.current) {
      const clampedX = Math.max(30, Math.min(CANVAS_WIDTH - 30, x));
      const clampedY = Math.max(25, Math.min(190, y));
      sunPosRef.current = { x: clampedX, y: clampedY };
      setSunPos({ x: clampedX, y: clampedY });
      return;
    }

    mousePosRef.current = { x, y };

    // Inspect fluid temperature and substance under cursor
    const nearby = particlesRef.current.find(p => (p.x - x) ** 2 + (p.y - y) ** 2 < 400);
    setHoveredInfo(nearby ? { temp: Math.round(nearby.temp), type: nearby.type } : null);

    if (isMouseDownRef.current && activeToolRef.current === 'draw_wall' && lastWallPointRef.current) {
      const prev = lastWallPointRef.current;
      const dist = Math.hypot(x - prev.x, y - prev.y);
      if (dist > 14) {
        wallsRef.current.push({
          x1: prev.x,
          y1: prev.y,
          x2: x,
          y2: y,
        });
        lastWallPointRef.current = { x, y };
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isMouseDownRef.current = false;
    isDraggingSunRef.current = false;
    lastWallPointRef.current = null;
  };

  const clearParticles = () => {
    particlesRef.current = [];
    setParticleCount(0);
  };

  const clearWalls = () => {
    wallsRef.current = [
      { x1: 20, y1: 390, x2: 620, y2: 390 },
      { x1: 20, y1: 20, x2: 20, y2: 390 },
      { x1: 620, y1: 20, x2: 620, y2: 390 },
    ];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title & Presets */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Water Physics Simulator</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Thermodynamic Hydrodynamics
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cohesive fluid simulation with real temperatures: freeze into solid ice, heat into rising steam, or draw custom dams.
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">Presets:</span>
          <button
            onClick={loadDamBreakPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
          >
            Dam Break
          </button>
          <button
            onClick={loadVolcanoPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors flex items-center gap-1"
          >
            <span>🌋</span>
            <span>Volcano &amp; Ocean</span>
          </button>
          <button
            onClick={loadSunGlacierPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors flex items-center gap-1"
          >
            <span>☀️</span>
            <span>Sun &amp; Glacier</span>
          </button>
          <button
            onClick={loadDensityTowerPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>Density Tower</span>
          </button>
          <button
            onClick={loadIcebergPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
          >
            Iceberg
          </button>
          <button
            onClick={loadBoilingGeyserPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
          >
            Geyser
          </button>
          <button
            onClick={loadOilWaterPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
          >
            Oil &amp; Water
          </button>
          <button
            onClick={loadBoilingOilPreset}
            className="px-2.5 py-1 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors flex items-center gap-1"
          >
            <span>🍳</span>
            <span>Boiling Oil &amp; Water</span>
          </button>

          {/* Quick Sun Toggle in Top Toolbar */}
          <div className="flex items-center pl-2 ml-1 border-l border-slate-800">
            <button
              onClick={toggleSun}
              title={isSunOn ? 'Turn off the Sun' : 'Turn on the Sun'}
              className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                isSunOn
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isSunOn ? <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
              <span>Sun: <strong className={isSunOn ? 'text-amber-300 font-bold' : 'text-slate-400'}>{isSunOn ? 'ON' : 'OFF'}</strong></span>
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Controls Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Liquids & Substances Box */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>FLUIDS &amp; PHASES</span>
              <span className="text-[10px] text-cyan-400 font-mono">9 Liquids</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveTool('pour_water')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_water' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-300" />
                <span>Water (20°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_steam')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_steam' ? 'bg-orange-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">♨️</span>
                <span>Steam (115°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_ice')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_ice' ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-sky-200" />
                <span>Ice (-15°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_oil')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_oil' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Oil (20°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_boiling_oil')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_boiling_oil' ? 'bg-amber-700 text-white ring-1 ring-amber-400' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">♨️</span>
                <span>Boil Oil (225°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_acid')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_acid' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Acid (Eats)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_lava')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_lava' ? 'bg-red-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Lava (850°C)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_mercury')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_mercury' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-100 shadow" />
                <span>Mercury (Dense)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_honey')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'pour_honey' ? 'bg-amber-700 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">🍯</span>
                <span>Honey (Syrup)</span>
              </button>
              <button
                onClick={() => setActiveTool('pour_nitrogen')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors col-span-2 ${
                  activeTool === 'pour_nitrogen' ? 'bg-teal-700 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-teal-200" />
                <span>Liquid Nitrogen (-196°C)</span>
              </button>
            </div>
          </div>

          {/* Interaction & Thermal Tools Box */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-slate-300 mb-2">THERMAL &amp; FORCE TOOLS</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setActiveTool('heat_torch')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'heat_torch' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-300" />
                <span>Torch (Heat)</span>
              </button>
              <button
                onClick={() => setActiveTool('freeze_ray')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'freeze_ray' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
                <span>Freeze Ray</span>
              </button>
              <button
                onClick={() => setActiveTool('draw_wall')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'draw_wall' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-300" />
                <span>Draw Walls</span>
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'eraser' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-slate-300" />
                <span>Erase Walls</span>
              </button>
              <button
                onClick={() => setActiveTool('vortex')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'vortex' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-purple-300" />
                <span>Whirlpool</span>
              </button>
              <button
                onClick={() => setActiveTool('drain')}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'drain' ? 'bg-rose-700 text-white' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-rose-300" />
                <span>Drain Fluid</span>
              </button>
            </div>

            {/* Faucet Toggle */}
            <div className="pt-2">
              <button
                onClick={() => setIsFaucetOn(f => !f)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                  isFaucetOn
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Droplets className="w-4 h-4" />
                <span>Top Faucet: {isFaucetOn ? 'STREAMING' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Optional Sun & Solar Atmosphere Card */}
          <div className={`p-4 rounded-xl space-y-3 text-xs border transition-all ${
            isSunOn ? 'bg-slate-900 border-amber-500/40 shadow-sm shadow-amber-950/20' : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {isSunOn ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-slate-400" />}
                <span className={isSunOn ? 'text-amber-300 font-bold' : 'text-slate-300'}>RADIANT SUN</span>
              </span>
              {/* Toggle switch track */}
              <button
                type="button"
                onClick={toggleSun}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSunOn ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                title={isSunOn ? 'Turn off the Sun' : 'Turn on the Sun'}
                aria-label="Toggle Radiant Sun"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSunOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Big 1-Click Action Button */}
            <button
              onClick={toggleSun}
              type="button"
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all border ${
                isSunOn
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isSunOn ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{isSunOn ? 'Turn Sun OFF' : 'Turn Sun ON'}</span>
            </button>

            {isSunOn ? (
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Solar Intensity:</span>
                  <span className="font-mono text-amber-300">{sunIntensity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={sunIntensity}
                  onChange={e => setSunIntensity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Spring Morning</span>
                  <span>Noon</span>
                  <span>Scorching</span>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                  ☀️ <span className="text-amber-200">Interactive:</span> Drag the sun across the canvas sky to focus solar heat and melt icebergs or create steam clouds!
                </div>
              </div>
            ) : (
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Sun is <strong>OFF</strong>. Thermal radiation is disabled (nighttime physics).</span>
              </div>
            )}
          </div>

          {/* Thermal & Physical Knobs */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>THERMODYNAMICS &amp; FORCES</span>
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Ambient Temperature Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ambient Temp:</span>
                </span>
                <span className="font-mono font-bold text-white">{ambientTemp}°C</span>
              </div>
              <input
                type="range"
                min={-20}
                max={250}
                step={2}
                value={ambientTemp}
                onChange={e => setAmbientTemp(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Freezing (-20°C)</span>
                <span>Water Boil (100°C)</span>
                <span>Oil Boil (200°C+)</span>
              </div>
            </div>

            {/* Surface Tension Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Cohesion (Stickiness):</span>
                <span className="font-mono text-white">{surfaceTension.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={surfaceTension}
                onChange={e => setSurfaceTension(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Loose</span>
                <span>Normal Water</span>
                <span>High Tension</span>
              </div>
            </div>

            {/* Gravity Slider */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Gravity:</span>
                <span className="font-mono text-white">{gravity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-0.2}
                max={0.8}
                step={0.02}
                value={gravity}
                onChange={e => setGravity(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Zero-G</span>
                <span>Normal</span>
                <span>Heavy</span>
              </div>
            </div>
          </div>

          {/* Quick Clear Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={clearParticles}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Clear Fluid
            </button>
            <button
              onClick={clearWalls}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Reset Walls
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="lg:col-span-3 flex flex-col items-center">
          <div className="relative p-2 bg-slate-950 rounded-2xl border-4 border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-[320px] h-[210px] sm:w-[540px] sm:h-[354px] md:w-[640px] md:h-[420px] rounded-xl block bg-[#0a0f1d] cursor-crosshair touch-none select-none"
            />

            {/* In-Canvas HUD */}
            <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-400">
                Particles: {particleCount}
              </span>
              {hoveredInfo !== null && (
                <span className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-amber-300 flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  <span>{hoveredInfo.temp}°C</span>
                  <span className="text-slate-400 text-[10px]">
                    (
                    {hoveredInfo.type === 'oil'
                      ? hoveredInfo.temp >= 190
                        ? 'Boiling Oil Vapor'
                        : hoveredInfo.temp >= 120
                        ? 'Hot Sizzling Oil'
                        : hoveredInfo.temp <= 0
                        ? 'Chilled Oil'
                        : 'Liquid Oil'
                      : hoveredInfo.type === 'acid'
                      ? 'Toxic Acid'
                      : hoveredInfo.type === 'lava'
                      ? hoveredInfo.temp < 300
                        ? 'Solid Obsidian Rock'
                        : 'Molten Lava'
                      : hoveredInfo.type === 'mercury'
                      ? 'Quicksilver (Mercury)'
                      : hoveredInfo.type === 'honey'
                      ? 'Viscous Honey'
                      : hoveredInfo.type === 'nitrogen'
                      ? 'Liquid Nitrogen'
                      : hoveredInfo.temp <= 0
                      ? 'Solid Ice'
                      : hoveredInfo.temp >= 100
                      ? 'Steam Vapor'
                      : 'Liquid Water'}
                    )
                  </span>
                </span>
              )}
            </div>

            {/* In-Canvas Sun Status & 1-Click Instant Toggle Button */}
            <button
              onClick={toggleSun}
              type="button"
              className={`absolute top-3.5 right-3.5 z-20 pointer-events-auto cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold shadow-lg backdrop-blur-md transition-all select-none border ${
                isSunOn
                  ? 'bg-amber-950/90 hover:bg-amber-900 border-amber-500/50 text-amber-200 hover:scale-105 active:scale-95 shadow-amber-950/40'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:scale-105 active:scale-95 shadow-black/40'
              }`}
              title={isSunOn ? 'Click to turn Sun OFF' : 'Click to turn Sun ON'}
            >
              {isSunOn ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow shrink-0" />
                  <span className="flex items-center gap-1.5">
                    <span>Sun: <strong className="text-amber-300">ON</strong> ({sunIntensity.toFixed(1)}x)</span>
                    <span className="text-[9px] uppercase tracking-wider text-amber-400/90 bg-amber-900/70 px-1.5 py-0.5 rounded border border-amber-500/40">
                      Click to Turn OFF
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="flex items-center gap-1.5">
                    <span>Sun: <strong className="text-slate-400">OFF</strong></span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600">
                      Click to Turn ON
                    </span>
                  </span>
                </>
              )}
            </button>

            {/* Temperature & Substance Legend Overlay */}
            <div className="absolute bottom-4 right-4 pointer-events-none hidden sm:flex items-center gap-2 text-[10px] font-mono px-2.5 py-1 rounded bg-slate-950/85 border border-slate-800 text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-200 border border-sky-400" />
                <span>Ice (&le;0°)</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-600" />
                <span>Water</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Oil &amp; Boil</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Lava</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Mercury</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Honey</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-300" />
                <span>Nitrogen</span>
              </span>
            </div>
          </div>

          {/* Play / Pause Footer */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setIsSimulating(s => !s)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Pause Simulation' : 'Resume'}</span>
            </button>
            <button
              onClick={loadDamBreakPreset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scene</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
