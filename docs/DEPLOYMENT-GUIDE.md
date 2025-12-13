# Project Aegis Field Responder - Complete Deployment Guide

## Overview

This guide covers decoupled Firebase configuration, mobile PWA hosting, and common failure modes for Project Aegis Field Responder.

## Architecture Changes (Security Improvement)

### Before (Hardcoded credentials - ❌ INSECURE)
```javascript
// firebase-setup.js - EXPOSED IN SOURCE CODE
const firebaseConfig = {
  apiKey: "AIzaSyDDlmmftmXOBbu7MdMbYA5oX_Q90nBj6K8", // VISIBLE TO ALL
  projectId: "projectaegis-da009",
  // ...
};
firebase.initializeApp(firebaseConfig);
```

**Problems:**
- API keys visible in git history forever
- Anyone with repo access can impersonate your app
- API keys tied to original project owner
- Cannot deploy independently

### After (Dynamic injection - ✅ SECURE)
```javascript
// firebase-config.js (gitignored) - NOT IN REPO
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  // ...
};

// firebase-init.js - LOADS & VALIDATES CONFIG
validateFirebaseConfig(cfg);
window.__FIREBASE_APP__ = firebase.initializeApp(cfg);
window.__FIREBASE_STATUS__ = { enabled: true };
```

**Benefits:**
- Credentials never in git
- Each deployer uses own Firebase project
- Graceful failure if config missing
- Works in offline/demo mode

## Quick Start (5 Minutes)

### Step 1: Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project (or create new one)
3. Settings > Your Apps > Web
4. Copy config object

### Step 2: Create Config File

```bash
cd field-app
cp firebase-config.js.template firebase-config.js
```

### Step 3: Fill Credentials

Edit `firebase-config.js`:
```javascript
window.__FIREBASE_CONFIG__ = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_DOMAIN",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_BUCKET",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
```

### Step 4: Deploy

**Firebase Hosting:**
```bash
firebase deploy --only hosting
```

**Netlify:**
- Connect GitHub repo, set publish dir to `field-app`

**Vercel:**
- Import GitHub repo, set root to `field-app`

### Step 5: Verify

1. Open HTTPS URL on phone
2. Open DevTools (F12)
3. Check Console for: ✅ "Firebase initialized successfully"
4. GPS should work, app should install as PWA

## Common Failure Modes & Fixes

### Scenario 1: Missing Firebase Config
**Symptom:** Console shows "Firebase configuration is incomplete"

**Cause:** `firebase-config.js` missing or incomplete

**Fix:**
1. Check file exists in `field-app/` directory
2. Verify all fields are filled (no "YOUR_*" values)
3. Reload page (hard refresh: Ctrl+Shift+R)
4. Check console for exact missing fields

### Scenario 2: Firebase SDK Not Loaded
**Symptom:** Console shows "Firebase SDK not loaded"

**Cause:** Script tag not in HTML or CDN failed

**Fix:**
1. Check `index.html` has Firebase SDK script:
   ```html
   <script src="https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/11.0.0/firebase-auth-compat.js"></script>
   ```
2. Check DevTools > Network tab for blocked/failed scripts
3. Try different Firebase SDK version if CDN changed

### Scenario 3: Geolocation Returns Null or Errors
**Symptom:** "Geolocation not available" or coordinates are (0,0)

**Cause 1: HTTP instead of HTTPS**
- Browser blocks Geolocation on non-secure origins
- Use HTTPS (or http://localhost for dev)

**Cause 2: Permissions denied**
- On Android Chrome: Check site permissions
- On iOS Safari: Settings > Privacy > Location
- Grant "While Using App" permission

**Cause 3: Emulator GPS**
- Android emulator GPS can be unreliable
- Test on real device

**Fix:**
1. Test URL: Open DevTools > Console, run:
   ```javascript
   navigator.geolocation.getCurrentPosition(
     pos => console.log("GPS works:", pos.coords),
     err => console.error("GPS blocked:", err.message)
   );
   ```
2. Confirm "secure context":
   ```javascript
   console.log("Secure context:", isSecureContext);
   ```
3. Reload with permissions enabled

### Scenario 4: Service Worker Fails to Register
**Symptom:** DevTools > Application > Service Workers shows no active worker

**Cause:** HTTPS required, or `sw.js` path is wrong

**Fix:**
1. Confirm HTTPS (http:// blocks service workers)
2. Check `sw.js` exists in root directory (not `/js/`)
3. DevTools > Network tab, look for 404 on `/sw.js`
4. Hard refresh and wait 5 seconds
5. Check DevTools > Application > Service Workers:
   - Should show: "Status: activated and running"

### Scenario 5: PWA Won't Install on Android
**Symptom:** No "Install app" option in Chrome menu

**Cause:** Missing manifest, service worker, or HTTPS

**Fix Checklist:**
1. [ ] HTTPS enabled
2. [ ] Service worker registered and active
3. [ ] `manifest.json` linked: `<link rel="manifest" href="/manifest.json" />`
4. [ ] Manifest has required fields:
   ```json
   {
     "name": "Project Aegis",
     "short_name": "Aegis",
     "start_url": "./index.html",
     "display": "standalone",
     "icons": [{"src": "icon.png", "sizes": "192x192"}]
   }
   ```
5. [ ] Wait 30+ seconds, then try Chrome menu again

### Scenario 6: Auth Not Working
**Symptom:** Login button does nothing or shows error

**Cause 1: Firebase not initialized**
- Check console: should show ✅ "Firebase initialized"
- If not: go to Scenario 1 (missing config)

**Cause 2: Firebase project has no auth enabled**
- Firebase Console > Authentication > Sign-in method
- Enable "Email/Password" or other providers

**Cause 3: CORS issues**
- Firebase domain might need to be whitelisted
- Check DevTools > Network tab for blocked requests
- Look for errors with `googleapis.com`

**Fix:**
1. Verify Firebase initialized (Scenario 1)
2. Enable auth in Firebase Console
3. Hard refresh page
4. Check DevTools Network tab for CORS errors

### Scenario 7: App Works Offline, but Login Fails on Mobile
**Symptom:** App loads offline but login not possible

**Expected Behavior:**
- If no Firebase config: Shows "Auth unavailable" + demo mode
- If Firebase config: Requires online for login
- After login: Works offline (cached data)

**Fix:**
- Go online for initial login
- App caches session, works offline after
- Refresh page to logout (clears session)

## Configuration Reference

### firebase-config.js Template
Copy `field-app/firebase-config.js.template`:
```javascript
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",           // From Firebase Console
  authDomain: "YOUR_AUTH_DOMAIN",   // projectid.firebaseapp.com
  projectId: "YOUR_PROJECT_ID",     // From Firebase Console
  storageBucket: "YOUR_BUCKET",     // projectid.appspot.com
  messagingSenderId: "YOUR_SENDER", // Numeric ID
  appId: "YOUR_APP_ID",             // From Firebase Console
  measurementId: "YOUR_MEASUREMENT" // Optional
};
```

### firebase-init.js (No Config Needed)
Automatically:
1. Validates config from `firebase-config.js`
2. Initializes Firebase
3. Exports status to `window.__FIREBASE_STATUS__`
4. Supports demo mode via `?demo=1` URL param

### .gitignore Entry
Already in repo, but verify:
```
firebase-config.js
node_modules/
.DS_Store
*.log
```

## Deployment Platforms

### Firebase Hosting (Recommended)
```bash
firebase init hosting
firebase deploy --only hosting
```
**Pros:** HTTPS ✅, CDN ✅, Free ✅, Fast ✅

### Netlify
1. Connect GitHub
2. Build: (skip, it's static)
3. Publish: `field-app`
4. Deploy

**Pros:** HTTPS ✅, Free tier ✅, Easy ✅

### Vercel
1. Import GitHub
2. Root: `field-app`
3. Deploy

**Pros:** HTTPS ✅, Fast ✅, Framework agnostic ✅

### GitHub Pages
1. Build static files to `docs/` folder
2. Settings > Pages > Source: `docs` branch
3. Enable HTTPS

**Pros:** Free ✅, Integrated with GitHub ✅

## Testing Checklist

- [ ] `firebase-config.js` created, filled, gitignored
- [ ] Browser console: ✅ "Firebase initialized"
- [ ] HTTPS enabled on deployment
- [ ] Service worker active (DevTools > Application)
- [ ] Manifest linked and valid
- [ ] PWA installs on Android (Chrome menu > Install)
- [ ] GPS works on HTTPS (shows coordinates)
- [ ] Login works with valid credentials
- [ ] Offline mode works (toggle in DevTools)
- [ ] No console errors

## Support & Resources

- [Firebase Docs](https://firebase.google.com/docs)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

## Next Steps

1. **Create Firebase project** (if you don't own one)
2. **Extract credentials** from Firebase Console
3. **Create `firebase-config.js`** from template
4. **Deploy to HTTPS** host (Firebase, Netlify, Vercel, etc.)
5. **Test on real mobile device**
6. **Share deployment URL** with field responders
