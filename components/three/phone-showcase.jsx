"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";

// three.js / R3F ko lazy-load karte hain: sirf wide screens par, aur WebGL support ho to.
// Mobile / WebGL-less / error ki surat mein CSS fallback dikhta hai.
const PhoneScene = dynamic(() => import("@/components/three/phone-scene"), {
  ssr: false,
  loading: () => null,
});

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const QUERY = "(min-width: 1024px)";
let webglOk;

function subscribe(callback) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot() {
  if (!window.matchMedia(QUERY).matches) return false;
  if (webglOk === undefined) webglOk = hasWebGL();
  return webglOk;
}

export function PhoneShowcase({ fallback }) {
  const reduce = useReducedMotion();
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);

  if (!enabled) return fallback;

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-[90px]" aria-hidden="true" />
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <PhoneScene spin={!reduce} />
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-xs text-muted-foreground">
        Drag to rotate
      </p>
    </div>
  );
}
