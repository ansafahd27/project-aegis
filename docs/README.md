# Project Aegis Documentation

## Overview

Project Aegis Field Responder is a production-ready Progressive Web App for incident response coordination. These docs cover deployment, configuration, and troubleshooting.

## Quick Links

- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** - Complete setup, failure modes, and troubleshooting (START HERE)
- **[firebase-setup.md](firebase-setup.md)** - Firebase configuration options for different scenarios
- **[mobile-hosting-checklist.md](mobile-hosting-checklist.md)** - HTTPS, PWA, and mobile verification steps

## Key Architecture Changes

### Firebase Configuration (Decoupled)

✅ **Before:** Hardcoded credentials in source code (INSECURE)
- API keys exposed in git history
- Cannot deploy independently
- Tied to original project owner

✅ **After:** Dynamic config injection (SECURE)
- `firebase-config.js` (gitignored, never committed)
- `firebase-init.js` (validates and initializes)
- Works with any Firebase project
- Each deployer uses own credentials

### New Files Added

```
field-app/
├── firebase-config.js.template    # Copy and fill with your credentials
├── js/
│   ├── firebase-init.js          # Validates config, initializes Firebase
│   └── firebase-setup.js         # (old, kept for reference)
├── index.html                     # Include firebase-config.js + firebase-init.js
└── .gitignore                     # Includes firebase-config.js

docs/
├── README.md                      # This file
├── DEPLOYMENT-GUIDE.md           # Complete guide + troubleshooting
├── firebase-setup.md             # Firebase configuration guide
└── mobile-hosting-checklist.md   # Mobile PWA checklist
```

## 5-Minute Quick Start

### Step 1: Create firebase-config.js
```bash
cd field-app
cp firebase-config.js.template firebase-config.js
```

### Step 2: Fill Your Credentials
Edit `firebase-config.js` with values from Firebase Console:
```javascript
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 3: Deploy

**Option A: Firebase Hosting (Recommended)**
```bash
firebase deploy --only hosting
```

**Option B: Netlify**
1. Connect GitHub repo
2. Publish directory: `field-app`
3. Deploy

**Option C: Vercel**
1. Import GitHub repo
2. Root directory: `field-app`
3. Deploy

### Step 4: Verify
1. Open HTTPS URL on mobile
2. Open DevTools (F12)
3. Check Console for: ✅ "Firebase initialized successfully"
4. GPS should prompt for permission
5. App should be installable as PWA

## Why HTTPS is Critical

On mobile devices, non-HTTPS origins are blocked from:
- **Geolocation API** - GPS won't work (returns null)
- **Service Workers** - PWA installation won't work
- **Secure APIs** - Payment, biometrics blocked

**Solution:** Use HTTPS everywhere (or `http://localhost` for dev)

All recommended hosts (Firebase, Netlify, Vercel, GitHub Pages) provide automatic HTTPS.

## Common Issues

| Issue | Check | Solution |
|-------|-------|----------|
| "Firebase not initialized" | Browser console | Create & fill `firebase-config.js` |
| GPS returns null | HTTPS enabled? | Deploy to HTTPS URL |
| PWA won't install | Service worker active? | Check DevTools > Application |
| Auth not working | Firebase config valid? | Verify all fields in firebase-config.js |
| Offline mode broken | Service worker registered? | Hard refresh (Ctrl+Shift+R) |

## Detailed Guides

### For New Deployers
👉 **Start with [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)**

Includes:
- Step-by-step setup
- 7 common failure scenarios with fixes
- Configuration reference
- Deployment platform recipes
- Testing checklist

### For Firebase Project Setup
👉 **Read [firebase-setup.md](firebase-setup.md)**

Covers:
- Scenario 1: You own the Firebase project
- Scenario 2: You don't own the project (request access / create new)
- Scenario 3: Demo/offline mode (no Firebase needed)

### For Mobile PWA Verification  
👉 **Use [mobile-hosting-checklist.md](mobile-hosting-checklist.md)**

Includes:
- Why HTTPS matters (with detailed explanation)
- Pre-deployment checklist (8 sections)
- Testing on real Android/iOS devices
- Verification checklist (10 items)
- Troubleshooting PWA installation issues

## Architecture: Before & After

### ❌ Before (Insecure)
```javascript
// field-app/js/firebase-setup.js
const firebaseConfig = {
  apiKey: "AIzaSyDDlmmftmXOBbu7MdMbYA5oX_Q90nBj6K8",  // EXPOSED!
  projectId: "projectaegis-da009",
  // ...
};
firebase.initializeApp(firebaseConfig);
```

**Problems:**
- Credentials in git history forever
- Anyone with repo access can hijack the app
- Deployments depend on project owner
- API key quota exhaustion risk

### ✅ After (Secure)
```
field-app/
├── firebase-config.js           (✗ Gitignored, never committed)
└── js/firebase-init.js          (✓ Validates config, initializes)
```

```javascript
// field-app/firebase-config.js  (GITIGNORED)
window.__FIREBASE_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
};

// field-app/js/firebase-init.js (IN REPO)
function validateFirebaseConfig(cfg) { ... }
const app = firebase.initializeApp(window.__FIREBASE_CONFIG__);
window.__FIREBASE_STATUS__ = { enabled: true };
```

**Benefits:**
- Credentials never in git
- Each deployer manages their own config
- Graceful failure if config missing
- Works offline/demo without Firebase
- Portable to any Firebase project

## Testing

### Desktop (Chrome)
1. `npm run dev` or open `field-app/index.html`
2. DevTools > Application > Service Workers
3. Should show "activated" status
4. Offline mode toggle to test caching

### Mobile (Real Device)
1. Deploy to HTTPS URL
2. Open in Chrome or Safari
3. Menu > "Install app" or "Add to Home Screen"
4. Grant location permission
5. Verify GPS shows coordinates
6. Test offline (Settings > Offline mode on some browsers)

## Support

- Check [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) "Common Failure Modes" section
- Verify Firebase Console > Authentication has email/password enabled
- Confirm deployment URL uses HTTPS
- Run `firebase init hosting && firebase deploy` for Firebase Hosting

## Files Modified

- ✅ Added: `field-app/firebase-config.js.template`
- ✅ Added: `field-app/js/firebase-init.js`
- ✅ Updated: `.gitignore` (firebase-config.js)
- ✅ Docs: Created `docs/` directory with 3 comprehensive guides

## Next Steps

1. Read [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
2. Create `firebase-config.js` from template
3. Deploy to HTTPS host
4. Test on real mobile device
5. Share deployment URL with field responders
