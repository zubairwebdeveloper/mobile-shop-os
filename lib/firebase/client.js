"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

/**
 * Firebase client SDK (browser). The web config is NOT a secret; access control is enforced by
 * Firestore/Storage rules and server-side checks, never by hiding this config.
 * NEXT_PUBLIC_* variables must be referenced statically so Next.js can inline them.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

const emulatorState = { auth: false, firestore: false, storage: false };

function getClientApp() {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const auth = getAuth(getClientApp());
  if (USE_EMULATORS && !emulatorState.auth) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    emulatorState.auth = true;
  }
  return auth;
}

export function getFirebaseFirestore() {
  const db = getFirestore(getClientApp());
  if (USE_EMULATORS && !emulatorState.firestore) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    emulatorState.firestore = true;
  }
  return db;
}

export function getFirebaseStorage() {
  const storage = getStorage(getClientApp());
  if (USE_EMULATORS && !emulatorState.storage) {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    emulatorState.storage = true;
  }
  return storage;
}

// App Check is NOT wired yet: it needs a real Firebase project and reCAPTCHA keys, and must be
// tested before enforcement is switched on. Planned for Phase 19 (hardening).
