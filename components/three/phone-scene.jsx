"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

function useScreenTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 512, 1024);
    g.addColorStop(0, "#2563eb");
    g.addColorStop(0.55, "#1d3fa8");
    g.addColorStop(1, "#16a085");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 1024);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 28px sans-serif";
    ctx.fillText("ZUBAIR MOBILE", 48, 150);
    ctx.font = "800 76px sans-serif";
    ctx.fillText("Next-gen", 48, 300);
    ctx.fillText("flagships", 48, 385);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.roundRect(48, 860, 416, 90, 28);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "700 34px sans-serif";
    ctx.fillText("From Rs. 89,999", 84, 918);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function Phone({ spin }) {
  const group = useRef(null);
  const screen = useScreenTexture();

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={group} rotation={[0.05, -0.5, 0.04]}>
      {/* body */}
      <RoundedBox args={[1.5, 3.1, 0.17]} radius={0.2} smoothness={4}>
        <meshStandardMaterial color="#1c2740" metalness={0.85} roughness={0.28} />
      </RoundedBox>
      {/* screen */}
      <mesh position={[0, 0, 0.088]}>
        <planeGeometry args={[1.38, 2.98]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* punch hole */}
      <mesh position={[0, 1.35, 0.092]}>
        <circleGeometry args={[0.05, 24]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* camera island (back) */}
      <RoundedBox args={[0.66, 0.66, 0.05]} radius={0.12} position={[-0.38, 1.07, -0.11]}>
        <meshStandardMaterial color="#0b1220" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      {[
        [-0.55, 1.24],
        [-0.22, 1.24],
        [-0.38, 0.9],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.05, 28]} />
          <meshStandardMaterial color="#05070d" metalness={0.9} roughness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

export default function PhoneScene({ spin = true }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-label="Interactive 3D smartphone. Drag to rotate."
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} />
      <directionalLight position={[-4, -2, -3]} intensity={1.1} color="#16a085" />
      <pointLight position={[0, 2, 4]} intensity={8} color="#2563eb" />
      <Float speed={spin ? 1.6 : 0} rotationIntensity={0.15} floatIntensity={0.6}>
        <Phone spin={spin} />
      </Float>
      <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 2.6} maxPolarAngle={Math.PI / 1.7} />
    </Canvas>
  );
}
