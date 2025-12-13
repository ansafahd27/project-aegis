/**
 * Firebase Initialization Module
 * 
 * This module handles Firebase configuration validation and initialization.
 * It supports both auth-enabled and auth-disabled (demo) modes.
 * 
 * Configuration: Expects window.__FIREBASE_CONFIG__ to be set by firebase-config.js
 */

function validateFirebaseConfig(cfg) {
  "use strict";
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  const missing = required.filter((k) => !cfg || !cfg[k]);

  if (missing.length > 0) {
    throw new Error(
      "Firebase configuration is incomplete. Missing: " + missing.join(", ")
    );
  }
}

let firebaseEnabled = false;
let firebaseInitError = null;

// Check for demo mode via URL parameter
const urlParams = new URLSearchParams(location.search);
const forceDemoMode = urlParams.get("demo") === "1";

if (forceDemoMode) {
  firebaseInitError = new Error(
    "Demo mode activated via URL parameter. Authentication disabled."
  );
  console.log("🔧 Firebase demo mode enabled. Auth will be bypassed.");
} else if (typeof firebase === "undefined") {
  firebaseInitError = new Error(
    "Firebase SDK is not loaded. Check script tags in HTML."
  );
  console.error("❌ Firebase SDK not loaded");
} else {
  try {
    const cfg = window.__FIREBASE_CONFIG__;
    validateFirebaseConfig(cfg);

    const app = firebase.initializeApp(cfg);
    window.__FIREBASE_APP__ = app;
    firebaseEnabled = true;
    console.log("✅ Firebase initialized successfully");
  } catch (err) {
    console.error("❌ Firebase initialization failed:", err);
    firebaseInitError = err;
  }
}

// Export status object for use in login logic
window.__FIREBASE_STATUS__ = {
  enabled: firebaseEnabled,
  error: firebaseInitError,
  isDemoMode: forceDemoMode
};

console.log(
  "🔐 Firebase Status:",
  firebaseEnabled ? "Ready" : "Not Available",
  firebaseInitError ? `(${firebaseInitError.message})` : ""
);
