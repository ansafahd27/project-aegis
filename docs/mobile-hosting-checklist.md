# Mobile Hosting Checklist

## Why HTTPS is Mandatory

### The Problem with HTTP
On mobile devices, `http://` (non-secure) origins are blocked from accessing:
- **Geolocation API** - Returns error or blank coordinates
- **Service Workers** - Cannot be registered, breaking PWA install
- **Payment APIs** - Blocked for security

### The Solution: HTTPS
`https://` origins (and `http://localhost` for dev) are "secure contexts" and allow full API access.

**Result:** GPS works, PWA installs, offline mode functions correctly.

## Pre-Deployment Checklist

### 1. Firebase Configuration
- [ ] `firebase-config.js` created in `field-app/` directory
- [ ] All fields populated (no "YOUR_*" placeholders)
- [ ] Browser console shows: ✅ "Firebase initialized successfully"
- [ ] `.gitignore` includes `firebase-config.js`

### 2. HTTPS Deployment
- [ ] App served over **HTTPS only**
- [ ] Redirect `http://` to `https://`
- [ ] SSL certificate is valid (not expired, matches domain)
- [ ] No browser warnings about insecure content

Hosting options (all support HTTPS):
- Firebase Hosting
- Netlify
- Vercel  
- GitHub Pages (automatic HTTPS)

### 3. PWA & Service Worker
- [ ] `manifest.json` linked in `index.html`: `<link rel="manifest" href="/manifest.json" />`
- [ ] `sw.js` exists in root directory
- [ ] Service worker registered in JavaScript
- [ ] Browser DevTools > Application > Service Workers shows "activated"
- [ ] Offline mode works (test with DevTools offline toggle)

### 4. Manifest Configuration
- [ ] `name`, `short_name`, `start_url` defined
- [ ] `display: "standalone"` for app-like experience
- [ ] `icons` array includes at least a 192x192 PNG
- [ ] All icon paths are correct and accessible

### 5. Testing on Real Device

#### Android (Chrome)
1. Open app URL: `https://your-domain.com`
2. Wait for app to load fully
3. Tap menu (3 dots) > "Install app" or "Add to Home screen"
4. App should install as PWA icon on home screen
5. Open app and verify:
   - No address bar (full screen mode)
   - Geolocation permission prompt appears
   - Location is captured correctly
   - Works offline (DevTools: toggle offline while running)

#### iOS (Safari)
1. Open app URL: `https://your-domain.com`
2. Tap Share icon > "Add to Home Screen"
3. Name the app and add
4. App should appear on home screen
5. Open and test same features as Android

#### Desktop (Chrome)
1. Open DevTools > Application tab
2. Service Workers section should show "activated"
3. Manifest section should show all fields populated
4. Storage > Cache shows service worker cache
5. Toggle offline mode and reload - app should still work

### 6. Geolocation Testing

```javascript
// Test in browser console
navigator.geolocation.getCurrentPosition(
  (pos) => console.log("GPS:", pos.coords),
  (err) => console.error("Error:", err)
);
```

**Expected:**
- On HTTP: `PositionError: User denied Geolocation`
- On HTTPS: Prompts user, returns coordinates

### 7. Network & Performance
- [ ] Page loads in < 3 seconds on 4G
- [ ] Images optimized (< 200KB total)
- [ ] Service worker cache working (DevTools > Network)
- [ ] No 404 errors in console
- [ ] No CORS errors (check console)

### 8. Security Checklist
- [ ] Firebase config NOT in HTML (using `firebase-config.js` only)
- [ ] No API keys visible in source code
- [ ] No plaintext secrets in git history
- [ ] CORS headers correct (Firebase domain whitelisted if needed)
- [ ] Content Security Policy headers set (optional but recommended)

## Verification Checklist

| Item | Status | Notes |
|------|--------|-------|
| HTTPS enabled | ☐ | Domain must use HTTPS |
| Service Worker registered | ☐ | DevTools shows "activated" |
| Manifest valid | ☐ | All required fields present |
| Firebase initialized | ☐ | Console: ✅ success message |
| Geolocation working | ☐ | Permission prompt appears on HTTPS |
| PWA installs on mobile | ☐ | Test on real Android/iOS device |
| Offline mode works | ☐ | Toggle DevTools offline |
| No console errors | ☐ | F12 > Console tab is clean |
| Login functional | ☐ | Can authenticate and stay logged in |
| Responsive on mobile | ☐ | Text readable, buttons tappable |

## Deployment Recipes

### Firebase Hosting
```bash
firebase deploy --only hosting
```
- Automatic HTTPS ✅
- CDN worldwide ✅
- Free tier available ✅

### Netlify  
1. Connect GitHub repo
2. Build command: (leave blank for static)
3. Publish directory: `field-app`
- Automatic HTTPS ✅
- Free tier includes SSL ✅

### Vercel
1. Import GitHub repo
2. Root directory: `field-app`
3. Deploy
- Automatic HTTPS ✅
- Instant global CDN ✅

### GitHub Pages
1. Build static files to `docs/` or `gh-pages` branch
2. Settings > Pages > enable
3. Force HTTPS in settings
- Automatic HTTPS ✅
- No build step needed ✅

## Troubleshooting

### "Geolocation not working"
- ✅ Confirm HTTPS (http:// blocks API)
- ✅ Check permissions: iOS Safari settings, Android Chrome site permissions
- ✅ Use real device, not emulator (emulator GPS is spotty)
- ✅ Grant location permission when prompted

### "Service Worker failed to register"
- ✅ Confirm HTTPS
- ✅ Check `sw.js` path is correct (root, not `/js/`)
- ✅ Reload page, then check DevTools > Application > Service Workers
- ✅ Check console for 404 or CORS errors

### "PWA won't install on Android"
- ✅ HTTPS required
- ✅ Service worker must be registered
- ✅ Manifest must be valid
- ✅ Wait ~30 seconds before install prompt appears
- ✅ Chrome address bar > 3-dot menu > "Install app"

### "Firebase config missing on production"
- ✅ Ensure `firebase-config.js` is in the deployment directory
- ✅ Check file permissions (readable, not blocked)
- ✅ Verify path in `index.html` script tag
- ✅ DevTools Console: look for 404 on `/firebase-config.js`
