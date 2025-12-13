# Firebase Setup Guide

## Overview

Project Aegis uses Firebase for authentication. To deploy the Field Responder PWA independently, you need to configure Firebase credentials without hardcoding sensitive information into source code.

## Scenario 1: You Own the Firebase Project

### Step 1: Get Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Project Settings** (gear icon in sidebar)
4. Go to **Your Apps** section
5. Find your Web app (or create one)
6. Copy the configuration object:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 2: Create `firebase-config.js`

1. Navigate to `field-app/` directory in your deployment environment
2. Create a new file called `firebase-config.js` (do NOT commit this)
3. Copy `firebase-config.js.template` as a reference
4. Replace all `YOUR_*` values with your actual Firebase credentials
5. Save the file

### Step 3: Verify Configuration

1. Open the app in a browser
2. Open browser DevTools (F12)
3. Check the Console tab
4. Look for one of these messages:
   - ✅ "Firebase initialized successfully" = Ready to use
   - ❌ "Firebase configuration is incomplete" = Check your firebase-config.js

## Scenario 2: You Don't Own the Firebase Project

If the original Firebase project is owned by someone else, you have two options:

### Option A: Request Firebase Viewer + Auth Admin Access

1. Ask the project owner to grant you these roles:
   - **Firebase Viewer** - Read-only access to project settings
   - **Firebase Authentication Admin** - Manage authentication without billing access

2. Once granted, follow "Scenario 1" steps above

### Option B: Create Your Own Firebase Project

1. **Create a new Firebase project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Follow the setup wizard
   - Enable Authentication (same providers as original: Email/Password, etc.)

2. **Get credentials from your new project** (follow Scenario 1 steps)

3. **Optionally migrate users** (if owner cooperates):
   - Export users from original project: Firebase Console > Authentication > Users > Export
   - Import to your new project: Authentication > Users > Import

4. **Deploy with your project's credentials**

## Scenario 3: Firebase-Optional (Demo Mode)

If you want to test the app without any Firebase project:

1. **Skip creating `firebase-config.js`** - the app will auto-detect missing config
2. **Or force demo mode via URL:**
   ```
   https://your-domain.com/login.html?demo=1
   ```
3. The app will:
   - Show a clear message that auth is unavailable
   - Allow basic UI navigation for training/demo
   - Restrict sensitive features

## Deployment Checklist

- [ ] `firebase-config.js` created in `field-app/` directory
- [ ] All Firebase credentials filled in (no "YOUR_*" placeholders)
- [ ] `firebase-config.js` is in `.gitignore` (never commit it)
- [ ] Browser console shows ✅ "Firebase initialized successfully"
- [ ] Login form appears without errors
- [ ] HTTPS enabled on deployment (required for PWA + Geolocation)

## Troubleshooting

### "Firebase configuration is incomplete"
- Check that `firebase-config.js` exists in the `field-app/` directory
- Verify all fields are filled (no undefined or empty strings)
- Check browser console for exact missing fields

### "Firebase SDK not loaded"
- Verify script tags in `index.html` load Firebase SDK before `firebase-init.js`
- Check network tab in DevTools for failed script loads
- Ensure CDN URLs are correct (Firebase SDK CDN may have changed)

### "Auth is not working on mobile"
- Confirm app is served over **HTTPS** (http:// blocks Geolocation API)
- Check browser permissions - allow location when prompted
- Test on real device, not just emulator

## More Information

- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firebase CLI](https://firebase.google.com/docs/cli)
