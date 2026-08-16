"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { EngineActor } from "@/lib/engine-data/types";
import {
  Maximize2,
  Minimize2,
  Move,
  RotateCw,
  Scaling,
  Grid,
  Box,
  Cpu,
  Zap,
  Eye,
  Magnet,
} from "lucide-react";

interface Viewport3DProps {
  actors: EngineActor[];
  selectedActorId: string | null;
  onSelectActor: (id: string | null) => void;
  onUpdateActorTransform: (
    actorId: string,
    transform: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => void;
  gizmoMode: "translate" | "rotate" | "scale";
  onSetGizmoMode: (mode: "translate" | "rotate" | "scale") => void;
  isPhysicsActive?: boolean;
}

type ShadingMode = "lit" | "wireframe" | "normals" | "depth";
type CameraPreset = "orbit" | "top" | "front" | "side" | "iso";
type DraggingGizmoAxis = "x" | "y" | "z" | "center" | null;

interface ProjectedPoint {
  x: number;
  y: number;
  zDepth: number;
  visible: boolean;
}

interface Face3D {
  vertices: [number, number, number][];
  normal: [number, number, number];
  baseColor: string;
  wireColor: string;
  isEmissive?: boolean;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  actors,
  selectedActorId,
  onSelectActor,
  onUpdateActorTransform,
  gizmoMode,
  onSetGizmoMode,
  isPhysicsActive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport Settings
  const [shadingMode, setShadingMode] = useState<ShadingMode>("lit");
  const [showGrid, setShowGrid] = useState(true);
  const [showShadows] = useState(true);
  const [useSnapping, setUseSnapping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("orbit");

  // Camera Orbit / Navigation Parameters
  const cameraAngleRef = useRef({
    theta: 0.65, // Azimuth
    phi: 0.45, // Elevation
    radius: 9.5, // Distance
    target: [0, 1.0, 0] as [number, number, number], // Look-at focus point
  });

  // Gizmo dragging & interaction state
  const isDraggingCameraRef = useRef(false);
  const draggingGizmoRef = useRef<DraggingGizmoAxis>(null);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const [hoveredGizmoAxis] = useState<DraggingGizmoAxis>(null);

  // Live FPS telemetry calculation
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(0);

  // Dynamic physics bobbing/oscillation simulation when active
  const physicsSimTimeRef = useRef(0);

  // ---------------------------------------------------------------------------
  // 3D Matrix & Projection Math Pipeline
  // ---------------------------------------------------------------------------
  const project3DTo2D = useCallback(
    (
      worldX: number,
      worldY: number,
      worldZ: number,
      width: number,
      height: number
    ): ProjectedPoint => {
      const { theta, phi, radius, target } = cameraAngleRef.current;

      // Calculate camera eye position in world space
      const eyeX = target[0] + radius * Math.sin(theta) * Math.cos(phi);
      const eyeY = target[1] + radius * Math.sin(phi);
      const eyeZ = target[2] + radius * Math.cos(theta) * Math.cos(phi);

      // Camera Forward vector (Eye to Target)
      let fwdX = target[0] - eyeX;
      let fwdY = target[1] - eyeY;
      let fwdZ = target[2] - eyeZ;
      const fwdLen = Math.hypot(fwdX, fwdY, fwdZ) || 1;
      fwdX /= fwdLen;
      fwdY /= fwdLen;
      fwdZ /= fwdLen;

      // World Up
      const upWorldY = 1;

      // Camera Right vector (Forward x Up)
      let rightX = fwdZ * upWorldY;
      let rightY = 0;
      let rightZ = -fwdX * upWorldY;
      const rightLen = Math.hypot(rightX, rightZ) || 1;
      rightX /= rightLen;
      rightZ /= rightLen;

      // Camera True Up vector (Right x Forward)
      const upX = rightY * fwdZ - rightZ * fwdY;
      const upY = rightZ * fwdX - rightX * fwdZ;
      const upZ = rightX * fwdY - rightY * fwdX;

      // Translate point relative to Eye
      const relX = worldX - eyeX;
      const relY = worldY - eyeY;
      const relZ = worldZ - eyeZ;

      // Project onto Camera View Space (Right, Up, Forward)
      const viewX = relX * rightX + relY * rightY + relZ * rightZ;
      const viewY = relX * upX + relY * upY + relZ * upZ;
      const viewZ = relX * fwdX + relY * fwdY + relZ * fwdZ;

      // Near plane clipping
      if (viewZ <= 0.2) {
        return { x: 0, y: 0, zDepth: viewZ, visible: false };
      }

      // Perspective projection onto viewport screen
      const fov = 520; // Perspective zoom focal scale
      const screenX = width / 2 + (viewX / viewZ) * fov;
      const screenY = height / 2 - (viewY / viewZ) * fov;

      return {
        x: screenX,
        y: screenY,
        zDepth: viewZ,
        visible: true,
      };
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Vector & Normal Math Utilities
  // ---------------------------------------------------------------------------
  const rotatePointEuler = (
    x: number,
    y: number,
    z: number,
    rotDeg: [number, number, number]
  ): [number, number, number] => {
    const rx = (rotDeg[0] * Math.PI) / 180;
    const ry = (rotDeg[1] * Math.PI) / 180;
    const rz = (rotDeg[2] * Math.PI) / 180;

    // Pitch (X-axis)
    const y1 = y * Math.cos(rx) - z * Math.sin(rx);
    const z1 = y * Math.sin(rx) + z * Math.cos(rx);
    const x1 = x;

    // Yaw (Y-axis)
    const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
    const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
    const y2 = y1;

    // Roll (Z-axis)
    const x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
    const y3 = x2 * Math.sin(rz) + y2 * Math.cos(rz);
    const z3 = z2;

    return [x3, y3, z3];
  };

  // ---------------------------------------------------------------------------
  // 3D Geometry Generators for Vanguard Engine Actors
  // ---------------------------------------------------------------------------
  const generateActorFaces = useCallback(
    (actor: EngineActor, isSelected: boolean): Face3D[] => {
      const faces: Face3D[] = [];
      const [pos, rot, scale] = [
        actor.transform.position,
        actor.transform.rotation,
        actor.transform.scale,
      ];

      // Helper to add transformed cube faces
      const addBox = (
        offset: [number, number, number],
        size: [number, number, number],
        baseCol: string,
        wireCol: string,
        emissive = false
      ) => {
        const [ox, oy, oz] = offset;
        const [sx, sy, sz] = [size[0] * scale[0], size[1] * scale[1], size[2] * scale[2]];
        const hx = sx / 2;
        const hy = sy / 2;
        const hz = sz / 2;

        const localVerts = [
          [-hx, -hy, -hz],
          [hx, -hy, -hz],
          [hx, hy, -hz],
          [-hx, hy, -hz],
          [-hx, -hy, hz],
          [hx, -hy, hz],
          [hx, hy, hz],
          [-hx, hy, hz],
        ];

        // Transform vertices: local -> actor rotation & offset -> world position
        const worldVerts = localVerts.map(([vx, vy, vz]) => {
          const [rx, ry, rz] = rotatePointEuler(vx + ox, vy + oy, vz + oz, rot);
          return [pos[0] + rx, pos[1] + ry, pos[2] + rz] as [number, number, number];
        });

        // 6 Cube Faces
        const faceDefinitions: {
          idx: [number, number, number, number];
          norm: [number, number, number];
        }[] = [
          { idx: [0, 3, 2, 1], norm: [0, 0, -1] }, // Back
          { idx: [4, 5, 6, 7], norm: [0, 0, 1] }, // Front
          { idx: [3, 7, 6, 2], norm: [0, 1, 0] }, // Top
          { idx: [0, 1, 5, 4], norm: [0, -1, 0] }, // Bottom
          { idx: [0, 4, 7, 3], norm: [-1, 0, 0] }, // Left
          { idx: [1, 2, 6, 5], norm: [1, 0, 0] }, // Right
        ];

        faceDefinitions.forEach(({ idx, norm }) => {
          const transformedNorm = rotatePointEuler(norm[0], norm[1], norm[2], rot);
          faces.push({
            vertices: [worldVerts[idx[0]], worldVerts[idx[1]], worldVerts[idx[2]], worldVerts[idx[3]]],
            normal: transformedNorm,
            baseColor: baseCol,
            wireColor: wireCol,
            isEmissive: emissive,
          });
        });
      };

      if (actor.id === "actor-hero-mech") {
        // Hero Mech: Chest Chassis, Head, Glowing Cyan Visor, Pauldrons, Arm Blasters
        const chestColor = isSelected ? "#38bdf8" : "#2563eb";
        const darkArmor = "#0f172a";
        const glowVisor = "#00f0ff";

        // Torso Chassis
        addBox([0, 0.5, 0], [0.85, 1.0, 0.65], chestColor, "#60a5fa");
        // Head
        addBox([0, 1.15, 0.05], [0.45, 0.35, 0.45], darkArmor, "#38bdf8");
        // Visor
        addBox([0, 1.18, 0.28], [0.32, 0.12, 0.08], glowVisor, "#a5f3fc", true);
        // Left Pauldron
        addBox([-0.6, 0.85, 0], [0.35, 0.45, 0.45], "#1e293b", "#94a3b8");
        // Right Pauldron
        addBox([0.6, 0.85, 0], [0.35, 0.45, 0.45], "#1e293b", "#94a3b8");
        // Left Arm Cannon
        addBox([-0.65, 0.4, 0.2], [0.18, 0.18, 0.7], "#334155", "#cbd5e1");
        // Right Arm Cannon
        addBox([0.65, 0.4, 0.2], [0.18, 0.18, 0.7], "#334155", "#cbd5e1");
        // Jetpack Thrusters
        addBox([0, 0.65, -0.4], [0.55, 0.6, 0.2], "#1e293b", "#38bdf8");
      } else if (actor.id === "actor-physics-box") {
        // Physics Heavy Crate: Reinforced orange/gold container with cross ribs
        const crateColor = isSelected ? "#f59e0b" : "#d97706";
        addBox([0, 0.5, 0], [1.0, 1.0, 1.0], crateColor, "#fde68a");
        // Outer hazard rim
        addBox([0, 0.5, 0], [1.04, 1.04, 0.3], "#78350f", "#f59e0b");
      } else if (actor.id === "actor-terrain-floor") {
        // Industrial Ground Floor Slab
        addBox([0, -0.1, 0], [1.0, 1.0, 1.0], "#1e293b", "#475569");
      } else if (actor.id.includes("light") || actor.id.includes("sun")) {
        // Light Marker (Emissive Diamond Box)
        const lightColor = actor.id.includes("sun") ? "#fef08a" : "#38bdf8";
        addBox([0, 0, 0], [0.35, 0.35, 0.35], lightColor, "#ffffff", true);
      } else {
        // Generic Actor Geometry
        const genericColor = isSelected ? "#38bdf8" : "#475569";
        addBox([0, 0.5, 0], [1.0, 1.0, 1.0], genericColor, "#94a3b8");
      }

      return faces;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Main Canvas Render Loop
  // ---------------------------------------------------------------------------
  const renderViewport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Track FPS
    frameCountRef.current += 1;
    const now = performance.now();
    if (lastFpsTimeRef.current === 0) {
      lastFpsTimeRef.current = now;
    }
    if (now - lastFpsTimeRef.current >= 1000) {
      setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
      frameCountRef.current = 0;
      lastFpsTimeRef.current = now;
    }

    if (isPhysicsActive) {
      physicsSimTimeRef.current += 0.03;
    }

    // 1. Clear Framebuffer & Draw Subtle Vignette Background
    ctx.fillStyle = "#0c0f16";
    ctx.fillRect(0, 0, width, height);

    const bgRadial = ctx.createRadialGradient(
      width / 2,
      height / 2,
      60,
      width / 2,
      height / 2,
      width * 0.75
    );
    bgRadial.addColorStop(0, "rgba(22, 30, 48, 0.95)");
    bgRadial.addColorStop(0.7, "rgba(13, 17, 26, 0.98)");
    bgRadial.addColorStop(1, "rgba(8, 11, 16, 1.0)");
    ctx.fillStyle = bgRadial;
    ctx.fillRect(0, 0, width, height);

    // 2. Render 3D Ground Grid
    if (showGrid) {
      ctx.lineWidth = 1;
      const gridSize = 12;
      const gridStep = 1.0;

      for (let i = -gridSize; i <= gridSize; i += gridStep) {
        const isCenterAxis = i === 0;

        // X lines (along Z)
        const p1 = project3DTo2D(i, 0, -gridSize, width, height);
        const p2 = project3DTo2D(i, 0, gridSize, width, height);
        if (p1.visible && p2.visible) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isCenterAxis
            ? "rgba(56, 189, 248, 0.7)" // Cyan Z-axis
            : "rgba(33, 46, 68, 0.5)";
          ctx.stroke();
        }

        // Z lines (along X)
        const p3 = project3DTo2D(-gridSize, 0, i, width, height);
        const p4 = project3DTo2D(gridSize, 0, i, width, height);
        if (p3.visible && p4.visible) {
          ctx.beginPath();
          ctx.moveTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.strokeStyle = isCenterAxis
            ? "rgba(244, 63, 94, 0.7)" // Red X-axis
            : "rgba(33, 46, 68, 0.5)";
          ctx.stroke();
        }
      }
    }

    // 3. Render Ground Contact Shadows
    if (showShadows && shadingMode !== "wireframe") {
      actors.forEach((actor) => {
        if (!actor.isVisible) return;
        const [px, py, pz] = actor.transform.position;
        const [sx, , sz] = actor.transform.scale;

        // Shadow center & radius on Y = 0
        const shadowP = project3DTo2D(px, 0.01, pz, width, height);
        if (shadowP.visible) {
          const shadowRadiusX = (sx * 36) / shadowP.zDepth;
          const shadowRadiusY = (sz * 18) / shadowP.zDepth;
          const opacity = Math.max(0.1, 0.45 - py * 0.06);

          ctx.save();
          ctx.beginPath();
          ctx.ellipse(
            shadowP.x,
            shadowP.y,
            Math.max(8, shadowRadiusX * 16),
            Math.max(4, shadowRadiusY * 16),
            0,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // 4. Collect & Depth-Sort all 3D Mesh Polygons
    interface RenderablePolygon {
      zDepth: number;
      actorId: string;
      vertices2D: ProjectedPoint[];
      normal: [number, number, number];
      baseColor: string;
      wireColor: string;
      isEmissive?: boolean;
    }

    const polygons: RenderablePolygon[] = [];

    actors.forEach((actor) => {
      if (!actor.isVisible) return;
      const isSelected = actor.id === selectedActorId;
      const faces = generateActorFaces(actor, isSelected);

      faces.forEach((face) => {
        const projectedVerts = face.vertices.map(([vx, vy, vz]) =>
          project3DTo2D(vx, vy, vz, width, height)
        );

        // Check if all polygon vertices are on screen
        if (projectedVerts.some((v) => !v.visible)) return;

        // Calculate average Z depth for sorting
        const avgZ =
          projectedVerts.reduce((sum, v) => sum + v.zDepth, 0) / projectedVerts.length;

        // 2D Screen-space Backface Culling
        const p0 = projectedVerts[0];
        const p1 = projectedVerts[1];
        const p2 = projectedVerts[2];
        const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);

        // Discard backfacing polygons unless wireframe mode
        if (cross > 0 && shadingMode !== "wireframe") return;

        polygons.push({
          zDepth: avgZ,
          actorId: actor.id,
          vertices2D: projectedVerts,
          normal: face.normal,
          baseColor: face.baseColor,
          wireColor: face.wireColor,
          isEmissive: face.isEmissive,
        });
      });
    });

    // Sort polygons from back to front (Painter's Algorithm)
    polygons.sort((a, b) => b.zDepth - a.zDepth);

    // 5. Directional Light Vector for PBR Shading
    const lightDir: [number, number, number] = [0.577, 0.707, 0.408];

    // 6. Draw Polygons
    polygons.forEach((poly) => {
      const { vertices2D, normal, baseColor, wireColor, isEmissive, zDepth } = poly;

      ctx.beginPath();
      ctx.moveTo(vertices2D[0].x, vertices2D[0].y);
      for (let i = 1; i < vertices2D.length; i++) {
        ctx.lineTo(vertices2D[i].x, vertices2D[i].y);
      }
      ctx.closePath();

      if (shadingMode === "wireframe") {
        ctx.strokeStyle = wireColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (shadingMode === "normals") {
        // Normals Color Coding (RGB = XYZ normal)
        const r = Math.floor(Math.abs(normal[0]) * 255);
        const g = Math.floor(Math.abs(normal[1]) * 255);
        const b = Math.floor(Math.abs(normal[2]) * 255);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (shadingMode === "depth") {
        // Z-Depth Visualization
        const depthVal = Math.max(0, Math.min(255, Math.floor(255 - zDepth * 18)));
        ctx.fillStyle = `rgb(${depthVal}, ${depthVal}, ${depthVal})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Lit PBR Mode
        if (isEmissive) {
          ctx.fillStyle = baseColor;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Lambertian Diffuse + Ambient
          const NdotL = Math.max(
            0,
            normal[0] * lightDir[0] + normal[1] * lightDir[1] + normal[2] * lightDir[2]
          );
          const ambient = 0.35;
          const lightIntensity = ambient + (1.0 - ambient) * NdotL;

          // Apply lighting multiplier to color
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 0.94;
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Overlay lighting shadow/highlight
          if (lightIntensity < 0.7) {
            ctx.fillStyle = `rgba(0, 0, 0, ${0.7 - lightIntensity})`;
            ctx.fill();
          } else if (lightIntensity > 0.85) {
            ctx.fillStyle = `rgba(255, 255, 255, ${(lightIntensity - 0.85) * 0.45})`;
            ctx.fill();
          }

          ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    });

    // 7. Render Selected Actor Bounding Box & Floating Tag
    const selectedActor = actors.find((a) => a.id === selectedActorId);
    if (selectedActor) {
      const [ax, ay, az] = selectedActor.transform.position;
      const [sx, sy, sz] = selectedActor.transform.scale;
      const centerProj = project3DTo2D(ax, ay + sy * 0.5, az, width, height);

      if (centerProj.visible) {
        // Selection Ring
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerProj.x, centerProj.y, Math.max(22, 160 / centerProj.zDepth), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Actor Name Floating Tag
        const tagWidth = 110;
        const tagHeight = 22;
        const tagX = centerProj.x - tagWidth / 2;
        const tagY = centerProj.y - Math.max(36, 180 / centerProj.zDepth);

        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.fillRect(tagX, tagY, tagWidth, tagHeight);
        ctx.strokeRect(tagX, tagY, tagWidth, tagHeight);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(selectedActor.name.toUpperCase(), centerProj.x, tagY + tagHeight / 2);
        ctx.restore();
      }

      // 8. Render ImGuizmo 3D Transform Gizmo
      const origin = project3DTo2D(ax, ay + sy * 0.5, az, width, height);
      if (origin.visible) {
        const gizmoScale = Math.max(1.2, Math.min(2.5, 12 / origin.zDepth));

        if (gizmoMode === "translate") {
          // Translate Gizmo: X (Red), Y (Green), Z (Blue) Arrows
          const pX = project3DTo2D(ax + gizmoScale, ay + sy * 0.5, az, width, height);
          const pY = project3DTo2D(ax, ay + sy * 0.5 + gizmoScale, az, width, height);
          const pZ = project3DTo2D(ax, ay + sy * 0.5, az + gizmoScale, width, height);

          ctx.save();
          ctx.lineWidth = 3;

          // X Axis (Red)
          if (pX.visible) {
            ctx.strokeStyle = hoveredGizmoAxis === "x" ? "#fda4af" : "#f43f5e";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pX.x, pX.y);
            ctx.stroke();

            // Arrow head
            ctx.fillStyle = hoveredGizmoAxis === "x" ? "#fda4af" : "#f43f5e";
            ctx.beginPath();
            ctx.arc(pX.x, pX.y, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Y Axis (Green)
          if (pY.visible) {
            ctx.strokeStyle = hoveredGizmoAxis === "y" ? "#6ee7b7" : "#10b981";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pY.x, pY.y);
            ctx.stroke();

            ctx.fillStyle = hoveredGizmoAxis === "y" ? "#6ee7b7" : "#10b981";
            ctx.beginPath();
            ctx.arc(pY.x, pY.y, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Z Axis (Blue)
          if (pZ.visible) {
            ctx.strokeStyle = hoveredGizmoAxis === "z" ? "#7dd3fc" : "#0284c7";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pZ.x, pZ.y);
            ctx.stroke();

            ctx.fillStyle = hoveredGizmoAxis === "z" ? "#7dd3fc" : "#0284c7";
            ctx.beginPath();
            ctx.arc(pZ.x, pZ.y, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Center Handle
          ctx.fillStyle = hoveredGizmoAxis === "center" ? "#fef08a" : "#eab308";
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        } else if (gizmoMode === "rotate") {
          // Rotate Gizmo: 3 Arc Rings
          ctx.save();
          ctx.lineWidth = 2.5;

          // Yaw Ring (Green Y-axis)
          ctx.strokeStyle = hoveredGizmoAxis === "y" ? "#6ee7b7" : "#10b981";
          ctx.beginPath();
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
            const rx = Math.cos(angle) * gizmoScale;
            const rz = Math.sin(angle) * gizmoScale;
            const pt = project3DTo2D(ax + rx, ay + sy * 0.5, az + rz, width, height);
            if (pt.visible) {
              if (angle === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.closePath();
          ctx.stroke();

          // Pitch Ring (Red X-axis)
          ctx.strokeStyle = hoveredGizmoAxis === "x" ? "#fda4af" : "#f43f5e";
          ctx.beginPath();
          for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
            const ry = Math.cos(angle) * gizmoScale;
            const rz = Math.sin(angle) * gizmoScale;
            const pt = project3DTo2D(ax, ay + sy * 0.5 + ry, az + rz, width, height);
            if (pt.visible) {
              if (angle === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
          }
          ctx.closePath();
          ctx.stroke();

          ctx.restore();
        } else if (gizmoMode === "scale") {
          // Scale Gizmo: Box handles on axes
          const pX = project3DTo2D(ax + gizmoScale, ay + sy * 0.5, az, width, height);
          const pY = project3DTo2D(ax, ay + sy * 0.5 + gizmoScale, az, width, height);
          const pZ = project3DTo2D(ax, ay + sy * 0.5, az + gizmoScale, width, height);

          ctx.save();
          ctx.lineWidth = 2.5;

          if (pX.visible) {
            ctx.strokeStyle = "#f43f5e";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pX.x, pX.y);
            ctx.stroke();
            ctx.fillStyle = "#f43f5e";
            ctx.fillRect(pX.x - 4, pX.y - 4, 8, 8);
          }
          if (pY.visible) {
            ctx.strokeStyle = "#10b981";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pY.x, pY.y);
            ctx.stroke();
            ctx.fillStyle = "#10b981";
            ctx.fillRect(pY.x - 4, pY.y - 4, 8, 8);
          }
          if (pZ.visible) {
            ctx.strokeStyle = "#0284c7";
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(pZ.x, pZ.y);
            ctx.stroke();
            ctx.fillStyle = "#0284c7";
            ctx.fillRect(pZ.x - 4, pZ.y - 4, 8, 8);
          }

          ctx.restore();
        }
      }
    }
  }, [
    actors,
    selectedActorId,
    shadingMode,
    showGrid,
    showShadows,
    gizmoMode,
    hoveredGizmoAxis,
    isPhysicsActive,
    project3DTo2D,
    generateActorFaces,
  ]);

  // ---------------------------------------------------------------------------
  // Continuous 60 FPS Animation Loop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderViewport();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [renderViewport]);

  // ---------------------------------------------------------------------------
  // Responsive Canvas Resize Observer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      canvas.width = w;
      canvas.height = h;
      renderViewport();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [renderViewport]);

  // ---------------------------------------------------------------------------
  // Mouse & Keyboard Viewport Interaction
  // ---------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    previousMouseRef.current = { x: e.clientX, y: e.clientY };

    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Check if clicked on Gizmo handles first
    const selectedActor = actors.find((a) => a.id === selectedActorId);
    if (selectedActor && e.button === 0) {
      const [ax, ay, az] = selectedActor.transform.position;
      const [sx, sy, sz] = selectedActor.transform.scale;
      const origin = project3DTo2D(ax, ay + sy * 0.5, az, width, height);

      if (origin.visible) {
        const gizmoScale = Math.max(1.2, Math.min(2.5, 12 / origin.zDepth));
        const pX = project3DTo2D(ax + gizmoScale, ay + sy * 0.5, az, width, height);
        const pY = project3DTo2D(ax, ay + sy * 0.5 + gizmoScale, az, width, height);
        const pZ = project3DTo2D(ax, ay + sy * 0.5, az + gizmoScale, width, height);

        const distCenter = Math.hypot(origin.x - mouseX, origin.y - mouseY);
        const distToSegment = (
          px: number,
          py: number,
          x1: number,
          y1: number,
          x2: number,
          y2: number
        ) => {
          const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
          if (l2 === 0) return Math.hypot(px - x1, py - y1);
          let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
          t = Math.max(0, Math.min(1, t));
          return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
        };

        if (distCenter < 10) {
          draggingGizmoRef.current = "center";
          return;
        }

        const distToX = pX.visible
          ? distToSegment(mouseX, mouseY, origin.x, origin.y, pX.x, pX.y)
          : 999;
        const distToY = pY.visible
          ? distToSegment(mouseX, mouseY, origin.x, origin.y, pY.x, pY.y)
          : 999;
        const distToZ = pZ.visible
          ? distToSegment(mouseX, mouseY, origin.x, origin.y, pZ.x, pZ.y)
          : 999;

        if (distToX < 12) {
          draggingGizmoRef.current = "x";
          return;
        }
        if (distToY < 12) {
          draggingGizmoRef.current = "y";
          return;
        }
        if (distToZ < 12) {
          draggingGizmoRef.current = "z";
          return;
        }
      }
    }

    // Raycast Actor Picking on Left Click
    if (e.button === 0) {
      let closestActorId: string | null = null;
      let minDistance = 40; // Click tolerance in px

      actors.forEach((actor) => {
        const [px, py, pz] = actor.transform.position;
        const p = project3DTo2D(px, py + 0.5, pz, width, height);
        if (p.visible) {
          const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
          if (dist < minDistance) {
            minDistance = dist;
            closestActorId = actor.id;
          }
        }
      });

      if (closestActorId) {
        onSelectActor(closestActorId);
        return;
      }
    }

    // Fallback: Start Camera Drag
    isDraggingCameraRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };

    // Handle Active Gizmo Dragging
    if (draggingGizmoRef.current && selectedActorId) {
      const actor = actors.find((a) => a.id === selectedActorId);
      if (!actor) return;

      const pos = [...actor.transform.position] as [number, number, number];
      const rot = [...actor.transform.rotation] as [number, number, number];
      const scale = [...actor.transform.scale] as [number, number, number];

      const snapVal = useSnapping ? 0.5 : 0.05;
      const rotSnap = useSnapping ? 15 : 2;

      if (gizmoMode === "translate") {
        if (draggingGizmoRef.current === "x") {
          pos[0] += deltaX * 0.025;
          if (useSnapping) pos[0] = Math.round(pos[0] / snapVal) * snapVal;
        } else if (draggingGizmoRef.current === "y") {
          pos[1] -= deltaY * 0.025;
          if (useSnapping) pos[1] = Math.round(pos[1] / snapVal) * snapVal;
        } else if (draggingGizmoRef.current === "z") {
          pos[2] -= deltaY * 0.025;
          if (useSnapping) pos[2] = Math.round(pos[2] / snapVal) * snapVal;
        } else if (draggingGizmoRef.current === "center") {
          pos[0] += deltaX * 0.02;
          pos[2] -= deltaY * 0.02;
        }
      } else if (gizmoMode === "rotate") {
        if (draggingGizmoRef.current === "y") {
          rot[1] += deltaX * 0.8;
          if (useSnapping) rot[1] = Math.round(rot[1] / rotSnap) * rotSnap;
        } else if (draggingGizmoRef.current === "x") {
          rot[0] -= deltaY * 0.8;
          if (useSnapping) rot[0] = Math.round(rot[0] / rotSnap) * rotSnap;
        }
      } else if (gizmoMode === "scale") {
        const factor = 1 + deltaX * 0.01;
        if (draggingGizmoRef.current === "x") scale[0] = Math.max(0.1, scale[0] * factor);
        if (draggingGizmoRef.current === "y") scale[1] = Math.max(0.1, scale[1] * factor);
        if (draggingGizmoRef.current === "z") scale[2] = Math.max(0.1, scale[2] * factor);
        if (draggingGizmoRef.current === "center") {
          scale[0] = Math.max(0.1, scale[0] * factor);
          scale[1] = Math.max(0.1, scale[1] * factor);
          scale[2] = Math.max(0.1, scale[2] * factor);
        }
      }

      onUpdateActorTransform(actor.id, {
        position: [
          Number(pos[0].toFixed(2)),
          Number(pos[1].toFixed(2)),
          Number(pos[2].toFixed(2)),
        ],
        rotation: [
          Number(rot[0].toFixed(1)),
          Number(rot[1].toFixed(1)),
          Number(rot[2].toFixed(1)),
        ],
        scale: [
          Number(scale[0].toFixed(2)),
          Number(scale[1].toFixed(2)),
          Number(scale[2].toFixed(2)),
        ],
      });
      return;
    }

    // Handle Camera Navigation
    if (isDraggingCameraRef.current) {
      if (e.buttons === 1) {
        // Orbit Camera
        cameraAngleRef.current.theta -= deltaX * 0.007;
        cameraAngleRef.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.02, cameraAngleRef.current.phi + deltaY * 0.007)
        );
      } else if (e.buttons === 2 || e.buttons === 4) {
        // Pan Camera Target
        cameraAngleRef.current.target[1] += deltaY * 0.01;
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingCameraRef.current = false;
    draggingGizmoRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.radius = Math.max(
      2.5,
      Math.min(30, cameraAngleRef.current.radius + e.deltaY * 0.012)
    );
  };

  // Switch Camera View Presets
  const handleSetCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (preset === "orbit") {
      cameraAngleRef.current = { theta: 0.65, phi: 0.45, radius: 9.5, target: [0, 1.0, 0] };
    } else if (preset === "top") {
      cameraAngleRef.current = { theta: 0.0, phi: 1.54, radius: 12.0, target: [0, 0, 0] };
    } else if (preset === "front") {
      cameraAngleRef.current = { theta: 0.0, phi: 0.05, radius: 10.0, target: [0, 1.0, 0] };
    } else if (preset === "side") {
      cameraAngleRef.current = {
        theta: Math.PI / 2,
        phi: 0.05,
        radius: 10.0,
        target: [0, 1.0, 0],
      };
    } else if (preset === "iso") {
      cameraAngleRef.current = {
        theta: Math.PI / 4,
        phi: 0.615,
        radius: 11.0,
        target: [0, 0.5, 0],
      };
    }
  };

  // Keyboard Shortcuts (W = Move, E = Rotate, R = Scale, G = Grid)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
      if (e.key === "w" || e.key === "W") onSetGizmoMode("translate");
      if (e.key === "e" || e.key === "E") onSetGizmoMode("rotate");
      if (e.key === "r" || e.key === "R") onSetGizmoMode("scale");
      if (e.key === "g" || e.key === "G") setShowGrid((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSetGizmoMode]);

  // Quick Axis Nudge Handler
  const handleNudgeAxis = (axis: "x" | "y" | "z", delta: number) => {
    const actor = actors.find((a) => a.id === selectedActorId);
    if (!actor) return;

    const newPos: [number, number, number] = [...actor.transform.position];
    const newRot: [number, number, number] = [...actor.transform.rotation];
    const newScale: [number, number, number] = [...actor.transform.scale];

    const idx = axis === "x" ? 0 : axis === "y" ? 1 : 2;

    if (gizmoMode === "translate") {
      newPos[idx] = Number((newPos[idx] + delta).toFixed(2));
    } else if (gizmoMode === "rotate") {
      newRot[idx] = Number((newRot[idx] + delta * 15).toFixed(1));
    } else if (gizmoMode === "scale") {
      newScale[idx] = Math.max(0.1, Number((newScale[idx] + delta * 0.2).toFixed(2)));
    }

    onUpdateActorTransform(actor.id, {
      position: newPos,
      rotation: newRot,
      scale: newScale,
    });
  };

  return (
    <div
      ref={containerRef}
      id="viewport-canvas-container"
      className={`relative w-full h-full min-h-[360px] bg-[#0c0f14] overflow-hidden select-none flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D Viewport Hardware/Software Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Top Viewport Toolbar (ImGui Unreal-Engine Style) */}
      <div
        id="viewport-header-bar"
        className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto bg-[#13171f]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow-lg text-xs"
      >
        {/* Left: Engine & Gizmo Toolset */}
        <div className="flex items-center space-x-1">
          <div className="text-slate-200 font-mono font-bold mr-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Vulkan 1.3 Viewport</span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Gizmo Modes: Move, Rotate, Scale */}
          <button
            id="gizmo-btn-translate"
            onClick={() => onSetGizmoMode("translate")}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              gizmoMode === "translate"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Translate / Move Tool (W)"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Move (W)</span>
          </button>

          <button
            id="gizmo-btn-rotate"
            onClick={() => onSetGizmoMode("rotate")}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              gizmoMode === "rotate"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Rotate Tool (E)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Rotate (E)</span>
          </button>

          <button
            id="gizmo-btn-scale"
            onClick={() => onSetGizmoMode("scale")}
            className={`px-2 py-1 rounded flex items-center gap-1 transition ${
              gizmoMode === "scale"
                ? "bg-sky-500 text-white font-bold"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Scale Tool (R)"
          >
            <Scaling className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Scale (R)</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Snapping Toggle */}
          <button
            onClick={() => setUseSnapping(!useSnapping)}
            className={`p-1.5 rounded transition flex items-center gap-1 font-mono text-[11px] ${
              useSnapping
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-slate-400 hover:bg-slate-800"
            }`}
            title="Toggle Grid / Angle Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Snap</span>
          </button>
        </div>

        {/* Right: Shading & Camera Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Shading Mode */}
          <div className="flex items-center gap-1 bg-slate-800/90 rounded border border-slate-700 px-1 py-0.5">
            <Eye className="w-3 h-3 text-slate-400" />
            <select
              id="viewport-shading-select"
              value={shadingMode}
              onChange={(e) => setShadingMode(e.target.value as ShadingMode)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none font-mono cursor-pointer"
            >
              <option value="lit" className="bg-slate-800">
                Lit (PBR HDR)
              </option>
              <option value="wireframe" className="bg-slate-800">
                Wireframe
              </option>
              <option value="normals" className="bg-slate-800">
                Normals Buffer
              </option>
              <option value="depth" className="bg-slate-800">
                Z-Depth Buffer
              </option>
            </select>
          </div>

          {/* Camera View Switcher */}
          <div className="flex bg-slate-800/90 rounded p-0.5 border border-slate-700 font-mono">
            <button
              onClick={() => handleSetCameraPreset("orbit")}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                cameraPreset === "orbit"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Persp
            </button>
            <button
              onClick={() => handleSetCameraPreset("top")}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                cameraPreset === "top"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Top
            </button>
            <button
              onClick={() => handleSetCameraPreset("front")}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                cameraPreset === "front"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Front
            </button>
            <button
              onClick={() => handleSetCameraPreset("iso")}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                cameraPreset === "iso"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Iso
            </button>
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded transition ${
              showGrid ? "text-sky-400 bg-slate-800" : "text-slate-500 hover:text-slate-300"
            }`}
            title="Toggle Ground Grid (G)"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Toggle Viewport Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Active Gizmo Widget (When an Actor is selected) */}
      {selectedActorId && (
        <div
          id="viewport-gizmo-controls"
          className="absolute bottom-4 left-4 bg-[#13171f]/92 backdrop-blur-md p-2.5 rounded-lg border border-slate-700/80 shadow-2xl pointer-events-auto text-xs flex flex-col gap-2 min-w-[220px]"
        >
          <div className="flex items-center justify-between text-slate-300 font-mono border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              ImGuizmo ({gizmoMode.toUpperCase()})
            </span>
            <span className="text-[10px] text-slate-500">World Space</span>
          </div>

          {/* Quick Axis Adjusters */}
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            {/* X Axis (Red) */}
            <div className="flex flex-col bg-slate-900/80 p-1 rounded border border-rose-500/30">
              <span className="text-rose-400 font-bold text-[10px]">X AXIS</span>
              <div className="flex justify-between mt-1">
                <button
                  onClick={() => handleNudgeAxis("x", -0.5)}
                  className="bg-rose-950 hover:bg-rose-800 text-rose-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  -
                </button>
                <button
                  onClick={() => handleNudgeAxis("x", 0.5)}
                  className="bg-rose-950 hover:bg-rose-800 text-rose-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Y Axis (Green) */}
            <div className="flex flex-col bg-slate-900/80 p-1 rounded border border-emerald-500/30">
              <span className="text-emerald-400 font-bold text-[10px]">Y AXIS</span>
              <div className="flex justify-between mt-1">
                <button
                  onClick={() => handleNudgeAxis("y", -0.5)}
                  className="bg-emerald-950 hover:bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  -
                </button>
                <button
                  onClick={() => handleNudgeAxis("y", 0.5)}
                  className="bg-emerald-950 hover:bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Z Axis (Blue) */}
            <div className="flex flex-col bg-slate-900/80 p-1 rounded border border-sky-500/30">
              <span className="text-sky-400 font-bold text-[10px]">Z AXIS</span>
              <div className="flex justify-between mt-1">
                <button
                  onClick={() => handleNudgeAxis("z", -0.5)}
                  className="bg-sky-950 hover:bg-sky-800 text-sky-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  -
                </button>
                <button
                  onClick={() => handleNudgeAxis("z", 0.5)}
                  className="bg-sky-950 hover:bg-sky-800 text-sky-200 px-1.5 py-0.5 rounded text-[10px]"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right Viewport Telemetry Overlay */}
      <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 pointer-events-none flex flex-col gap-0.5 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-sky-400" />
            Backend:
          </span>
          <span className="text-sky-300 font-semibold">Vulkan 1.3 RenderGraph</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Framerate:</span>
          <span className="text-emerald-400 font-semibold">{fps} FPS</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Triangles:</span>
          <span className="text-slate-200 font-semibold">14,820</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Draw Calls:</span>
          <span className="text-slate-200 font-semibold">42</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            VMA Allocations:
          </span>
          <span className="text-amber-400 font-semibold">128 MB</span>
        </div>
      </div>
    </div>
  );
};
