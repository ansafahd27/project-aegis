# �� Project Aegis - VIVA Preparation Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Explanation](#architecture-explanation)
3. [Backend Code Explanation](#backend-code-explanation)
4. [Field App Code Explanation](#field-app-code-explanation)
5. [Dashboard Code Explanation](#dashboard-code-explanation)
6. [Technical Concepts](#technical-concepts)
7. [Common VIVA Questions & Answers](#common-viva-questions--answers)
8. [Code Walkthrough Scripts](#code-walkthrough-scripts)

---

## Project Overview

### What is Project Aegis?
**Project Aegis** is a **disaster response coordination platform** that enables field responders to report incidents even in areas with no internet connectivity (Digital Dead Zones). The system has three main components:

1. **Backend API Server** - Node.js/Express with dual-mode database (Firebase or In-Memory)
2. **Field Responder App** - Progressive Web App (PWA) with offline-first capabilities
3. **Command Dashboard** - Real-time visualization and monitoring interface

### Key Innovation: Offline-First Architecture
The system works in **"Digital Dead Zones"** using:
- **IndexedDB** for local storage
- **Service Workers** for offline caching
- **Auto-sync** when connectivity is restored
- **Dual-mode database** (Firebase or mock DB)

---

## Architecture Explanation

### System Architecture Diagram
```
┌─────────────────┐
│  Field Responder│
│   (Mobile PWA)  │
│                 │
│  - IndexedDB    │
│  - Service      │
│    Worker       │
│  - GPS          │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │ (When Online)
         ↓
┌─────────────────┐        ┌─────────────────┐
│  Backend Server │◄───────┤   Dashboard     │
│  (Node.js)      │        │   (Web UI)      │
│                 │        │                 │
│  - Express      │        │  - Leaflet Maps │
│  - CORS         │        │  - Real-time    │
│  - JWT Auth     │        │    Updates      │
└────────┬────────┘        └─────────────────┘
         │
         ↓
┌─────────────────┐
│   Database      │
│                 │
│  Firebase       │
│  Firestore      │
│     OR          │
│  In-Memory      │
│  Mock DB        │
└─────────────────┘
```

### Data Flow

**1. Report Submission (Offline)**
```
User creates report → Saved to IndexedDB → Status: "pending"
                     → Displayed in local pending list
```

**2. Report Synchronization (Online)**
```
Network restored → Auto-sync triggered
                → For each pending report:
                  - POST to /api/reports
                  - Check for duplicates (UUID)
                  - Mark as "synced" on success
                → Update UI
```

**3. Dashboard Monitoring**
```
Dashboard loads → GET /api/reports (with JWT)
              → Parse and display on map
              → Auto-refresh every 5 seconds
              → Show notifications for new reports
```


## Backend Code Explanation

### File: `backend/server.js`

#### 1. Core Imports and Setup
```javascript
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
```

**Explanation:**
- **express**: Web framework for creating REST API
- **cors**: Enables Cross-Origin Resource Sharing (allows dashboard/field-app to connect)
- **firebase-admin**: Server-side Firebase SDK for Firestore database
- **jsonwebtoken**: Creates and verifies JWT tokens for authentication

#### 2. Dual-Mode Database Initialization
The backend supports two modes:
- **Firebase Mode**: Uses Cloud Firestore for persistent storage
- **Mock Mode**: Uses in-memory Map for demos/testing

```javascript
try {
  // Load Firebase credentials from env or file
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  isFirebase = true;
} catch (err) {
  console.log('Switching to IN-MEMORY DATABASE');
  isFirebase = false;
}
```

**Benefits:**
- Works without Firebase for demos
- Automatic fallback for missing credentials
- Same API for both modes

#### 3. NIC-Based Authentication
Instead of traditional email/password, field workers authenticate using their National Identity Card (NIC):

```javascript
app.post('/api/auth/login', async (req, res) => {
  const { name, nic } = req.body;
  
  // Validate NIC
  if (!nic || nic.length < 5) {
    return res.status(400).json({ error: 'Valid NIC is required' });
  }
  
  // Create/update user in database
  // Generate JWT token (30-day expiration)
  const token = jwt.sign(
    { userId, nic, name, email: `${nic}@aegis.local` },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  res.json({ success: true, token, userId, name, nic });
});
```

**Why NIC instead of email?**
- Field workers may not have email addresses
- NIC is mandatory for all citizens
- Simpler for emergency personnel
- Long token expiration supports offline use

#### 4. Report Submission with Duplicate Prevention
```javascript
app.post('/api/reports', authenticate, async (req, res) => {
  const { id, incidentType, severity, lat, lng } = req.body;
  
  // Check for duplicates using UUID
  let exists = false;
  if (isFirebase) {
    const existingDoc = await db.collection('reports').doc(id).get();
    exists = existingDoc.exists;
  } else {
    exists = mockDb.reports.has(id);
  }
  
  if (exists) {
    return res.status(200).json({
      success: true,
      message: 'Report already exists',
      duplicate: true
    });
  }
  
  // Save new report...
});
```

**Duplicate Prevention:**
- Each report has a UUID generated on client
- Server checks if ID already exists
- Returns success without creating duplicate
- Critical for offline sync (prevents multiple submissions)

---

## Field App Code Explanation

### File: `field-app/js/db.js` - IndexedDB Setup

```javascript
const db = new Dexie("AegisDB");

db.version(2).stores({
  reports: "id, status, timestamp, incidentType, severity, lat, lng, photo",
  auth_session: "id, userId, email"
});
```

**Dexie.js** is a wrapper around IndexedDB that provides:
- Simple async/await syntax
- Type-safe queries
- Versioned schema migrations
- Transactions and bulk operations

**Key Functions:**
```javascript
// Save report locally
async function saveReport(data) {
  await db.reports.add(data);
}

// Get pending reports (not yet synced)
async function getPendingReports() {
  return await db.reports.where("status").equals("pending").toArray();
}

// Update status after sync
async function updateReportStatus(id, status) {
  await db.reports.update(id, { status });
}
```

### File: `field-app/js/sync.js` - Synchronization Engine

```javascript
async function syncReports() {
  if (!navigator.onLine || isSyncing) return;
  
  const pending = await getPendingReports();
  if (pending.length === 0) return;
  
  for (const report of pending) {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify(report)
      });
      
      if (response.ok) {
        await updateReportStatus(report.id, 'synced');
      }
    } catch (err) {
      // Report stays pending, will retry later
    }
  }
}

// Auto-sync triggers
window.addEventListener("online", () => syncReports());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.onLine) syncReports();
});
setInterval(() => {
  if (navigator.onLine) syncReports();
}, 30000);
```

**Sync Triggers:**
1. **Network restored** - `online` event fires
2. **App returns to foreground** - `visibilitychange` event
3. **Periodic check** - Every 30 seconds

**Error Handling:**
- Failed syncs keep reports in "pending" status
- Automatic retry on next trigger
- No data loss

### File: `field-app/js/app.js` - GPS and Form Handling

#### GPS Acquisition with Fallback
```javascript
function startGPS(enableHighAccuracy = true) {
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      currentPosition = pos;
      const accuracy = pos.coords.accuracy;
      
      // Visual feedback based on accuracy
      if (accuracy > 50) {
        gpsStatus.style.color = '#f59e0b'; // Amber (weak)
      } else {
        gpsStatus.style.color = '#22c55e'; // Green (good)
      }
    },
    (err) => {
      if (enableHighAccuracy) {
        startGPS(false); // Fallback to low accuracy
      }
    },
    {
      enableHighAccuracy: enableHighAccuracy,
      timeout: 30000,
      maximumAge: 300000
    }
  );
}
```

**GPS Strategy:**
1. Try high-accuracy mode first (GPS satellites)
2. If fails, fall back to low-accuracy (WiFi/cell towers)
3. Show color-coded accuracy indicator
4. Accept cached positions up to 5 minutes old

#### Form Submission
```javascript
document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!currentPosition) {
    showToast('Waiting for GPS location...', 'error');
    return;
  }
  
  const report = {
    id: crypto.randomUUID(), // Unique identifier
    incidentType: document.getElementById("type").value,
    severity: parseInt(document.getElementById("severity").value),
    lat: currentPosition.coords.latitude,
    lng: currentPosition.coords.longitude,
    accuracy: currentPosition.coords.accuracy,
    timestamp: new Date().toISOString(),
    photo: photoData, // Base64 encoded
    userId: session.userId,
    status: "pending"
  };
  
  await saveReport(report);
  showToast("✅ Saved locally!", "success");
  
  if (navigator.onLine) {
    syncReports(); // Try immediate sync
  }
});
```

### File: `field-app/sw.js` - Service Worker

```javascript
const CACHE_NAME = "aegis-v2";
const ASSETS = [
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  // ... other assets
];

// Install: Cache assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Fetch: Cache-first for static, Network-first for API
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // API: Always use network
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Static: Cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

**Service Worker Roles:**
1. **Caching** - Store static assets for offline use
2. **Fetch Interception** - Serve cached resources
3. **PWA Enablement** - Makes app installable

---

## Dashboard Code Explanation

### File: `dashboard/index.html`

#### Map Initialization (Leaflet.js)
```javascript
const map = L.map('map').setView([6.7056, 80.3847], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
```

**Leaflet Benefits:**
- Open-source (no API key needed)
- Lightweight (38 KB)
- Offline-capable with cached tiles
- Easy customization

#### Fetching Reports
```javascript
async function fetchReports() {
  const response = await fetch(`${API_URL}/reports`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN || 'demo-token'}`
    }
  });
  
  const data = await response.json();
  reports = data.reports || [];
  
  // Detect new reports for notifications
  if (!isFirstLoad) {
    reports.forEach(r => {
      if (!knownReportIds.has(r.id)) {
        showNotification('New Incident Reported', r.incidentType, r.severity);
      }
    });
  }
  
  updateDashboard();
  updateStats();
}

// Auto-refresh every 5 seconds
fetchReports();
setInterval(fetchReports, 5000);
```

**Real-Time Updates:**
- Polls server every 5 seconds
- Tracks known report IDs
- Shows toast notifications for new reports
- Updates map and statistics

#### Custom Map Markers
```javascript
function updateDashboard() {
  reports.forEach(report => {
    const icon = L.divIcon({
      html: `<div style="
        background: ${severityColors[report.severity]};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
      ">${report.severity}</div>`,
      iconSize: [30, 30]
    });
    
    const marker = L.marker([report.lat, report.lng], { icon })
      .bindPopup(`
        <strong>${report.incidentType}</strong><br>
        Severity: ${report.severity}<br>
        Time: ${new Date(report.timestamp).toLocaleString()}
      `)
      .addTo(map);
  });
}
```

**Marker Features:**
- Color-coded by severity (red to green)
- Shows severity number inside
- Interactive popups with details
- Auto-updates when new reports arrive

---

## Technical Concepts

### 1. Progressive Web App (PWA)
A PWA is a web app that behaves like a native mobile app:

**Requirements:**
- HTTPS (or localhost for development)
- Service Worker for offline caching
- Web App Manifest (app metadata)
- Responsive design

**Benefits:**
- Installable on home screen
- Works offline
- Fast loading (cached assets)
- Cross-platform (one codebase)

### 2. IndexedDB vs localStorage

| Feature | IndexedDB | localStorage |
|---------|-----------|--------------|
| Storage | 50+ MB | 5-10 MB |
| API | Async | Sync (blocks UI) |
| Data Types | Objects, Blobs | Strings only |
| Queries | Advanced | Key-value only |

**In Aegis:** We use IndexedDB (via Dexie.js) to store reports offline.

### 3. JWT (JSON Web Token)

**Structure:**
```
header.payload.signature
```

**Example Payload:**
```json
{
  "userId": "user_12345",
  "nic": "123456789V",
  "name": "John Doe",
  "iat": 1703001600,
  "exp": 1705593600
}
```

**Benefits:**
- Stateless (no server sessions)
- Scalable (works across multiple servers)
- Secure (signed with secret key)
- Long expiration (30 days for offline use)

### 4. Service Worker Caching Strategies

**Cache-First (for static assets):**
```
Request → Check Cache → Found? Return cached
                      → Not found? Fetch from network
```

**Network-First (for API calls):**
```
Request → Try network → Success? Return fresh data
                     → Failed? Return from cache
```

### 5. Geolocation API

**Methods:**
- `getCurrentPosition()` - Get location once
- `watchPosition()` - Continuous updates

**Accuracy Modes:**
- **High Accuracy**: GPS satellites (slow, accurate)
- **Low Accuracy**: WiFi/cell towers (fast, approximate)

**Error Codes:**
- `PERMISSION_DENIED (1)` - User blocked access
- `POSITION_UNAVAILABLE (2)` - GPS signal lost
- `TIMEOUT (3)` - Took too long

### 6. Firebase Firestore

**NoSQL Document Database:**
```
Collection: reports
  ├─ Document: uuid-1234
  │   ├─ incidentType: "Flood"
  │   ├─ severity: 2
  │   ├─ location: GeoPoint(6.7056, 80.3847)
  │   └─ timestamp: Timestamp
```

**Benefits:**
- Real-time sync
- Offline support
- Scalable (auto-sharding)
- GeoPoint queries

---

## Common VIVA Questions & Answers

### General Questions

**Q1: What problem does your project solve?**

**A:** During disasters, field responders work in areas with no internet (Digital Dead Zones). Traditional systems fail without connectivity. Project Aegis solves this with an offline-first architecture where reports save locally and sync automatically when connection returns.

**Q2: Why PWA instead of native mobile app?**

**A:**
1. **Cross-platform** - One codebase for Android, iOS, desktop
2. **Instant deployment** - No app store approval
3. **Auto-updates** - Users always have latest version
4. **Lightweight** - No large installation
5. **Offline support** - Service Workers work like native apps

**Q3: How does offline synchronization work?**

**A:**
1. User creates report → Saved to IndexedDB (status: "pending")
2. Network restored → Sync engine triggers automatically
3. For each pending report:
   - Send POST to `/api/reports` with JWT token
   - Server checks for duplicates using UUID
   - If successful, mark as "synced" in local DB
4. Failed reports stay pending and retry later

**Q4: How do you prevent duplicate reports?**

**A:** Each report has a UUID generated on the client using `crypto.randomUUID()`. The backend checks if this ID already exists before saving. If it does, it returns success without creating a duplicate. This is critical for offline sync where network retries might send the same report multiple times.

### Backend Questions

**Q5: Why dual-mode database (Firebase + Mock)?**

**A:**
- **Firebase Mode**: For production with persistent cloud storage
- **Mock Mode**: For demos, testing, and when Firebase credentials aren't available
- **Flexibility**: Instructors can test without setting up Firebase
- **Same Code**: Both modes use the same API

**Q6: Explain JWT authentication flow.**

**A:**
1. User enters Name + NIC (National Identity Card)
2. Backend validates NIC (min 5 characters)
3. Creates/updates user in database
4. Generates JWT token containing userId, nic, name
5. Client stores token in IndexedDB (persists offline)
6. Every API request includes: `Authorization: Bearer <token>`
7. Backend verifies token signature before processing

**Q7: What security measures are implemented?**

**A:**
1. **JWT Authentication** - All endpoints protected (except login)
2. **Token Expiration** - 30-day limit
3. **CORS** - Controls which domains can access API
4. **Input Validation** - Checks required fields
5. **HTTPS** - Required in production (protects data in transit)

### Frontend Questions

**Q8: What is IndexedDB and why use it?**

**A:** IndexedDB is a browser database that provides:
- **Large storage**: 50+ MB (vs 5-10 MB for localStorage)
- **Async operations**: Non-blocking (doesn't freeze UI)
- **Complex queries**: Search by multiple fields
- **Transactions**: Atomic operations

We use Dexie.js wrapper for simpler syntax.

**Q9: How does Service Worker enable offline functionality?**

**A:** Service Worker acts as a proxy between app and network:
1. **Install**: Caches all static assets (HTML, CSS, JS)
2. **Fetch Interception**: Intercepts network requests
3. **Strategy**:
   - Static files → Serve from cache (instant load)
   - API calls → Try network first (fresh data)
4. **Offline Fallback**: Serve cached HTML if network fails

**Q10: Why use watchPosition instead of getCurrentPosition?**

**A:**
- **getCurrentPosition**: Gets location once, then stops
- **watchPosition**: Continuously monitors location

**Benefits:**
- Updates accuracy as GPS signal improves
- Shows real-time coordinates while filling form
- Provides better user feedback

### Dashboard Questions

**Q11: How does dashboard update in real-time?**

**A:** Uses **polling** (not WebSockets) for simplicity:
```javascript
setInterval(fetchReports, 5000); // Every 5 seconds
```

**Process:**
1. Call `/api/reports` endpoint
2. Compare new report IDs with known IDs
3. Show notification for new reports
4. Update map markers and statistics
5. Repeat after 5 seconds

**Q12: Why Leaflet instead of Google Maps?**

**A:**
1. **Open-source** - No licensing costs
2. **No API key** - No usage limits
3. **Offline support** - Can cache map tiles
4. **Lightweight** - 38 KB vs 200+ KB
5. **Customizable** - Easy styling

### Architecture Questions

**Q13: Explain data flow when user submits report.**

**A:**

**Offline:**
```
Submit → Validate GPS → Create report with UUID
      → Save to IndexedDB (status: pending)
      → Show success → Display in pending list
```

**Online:**
```
Submit → Save locally (same as offline)
      → Trigger sync
      → POST to /api/reports with JWT
      → Backend validates and saves to Firestore
      → Update status to "synced"
      → Remove from pending list
```

**Q14: What happens if backend server is down?**

**A:**
1. Reports continue saving locally
2. Sync attempts fail (logged to console)
3. Reports stay "pending"
4. Sync retries automatically:
   - On network status change
   - When app returns to foreground
   - Every 30 seconds
5. When server returns, all pending reports sync

**Q15: How would you scale for 1000 concurrent users?**

**A:**

**Backend:**
1. **Load Balancer** - Distribute requests across multiple servers
2. **Firebase Firestore** - Auto-scales (millions of documents)
3. **Caching** - Redis for frequently accessed data
4. **CDN** - Serve static files from edge servers

**Frontend:**
5. **Batch Sync** - Send multiple reports in one request
6. **Rate Limiting** - Prevent excessive API calls
7. **Pagination** - Load dashboard reports in chunks

---

## Code Walkthrough Scripts

### Script 1: Backend Walkthrough (3 min)

"Let me walk you through the backend server.

**[server.js lines 1-14]**
We start with our dependencies: Express for the web server, CORS for cross-origin requests, Firebase Admin for database access, and JWT for authentication.

**[lines 22-54]**
This is our dual-mode database. We try to connect to Firebase Firestore, but if credentials aren't available, we fall back to an in-memory mock database. This makes the system work even without Firebase setup.

**[lines 61-121]**
Here's our custom NIC-based login. Instead of email/password, field workers use their National Identity Card number. We check if the user exists, create them if not, and issue a JWT token valid for 30 days. This long expiration is crucial for offline operation.

**[lines 155-211]**
The report submission endpoint has key feature: duplicate prevention using UUIDs. Each report has a unique ID generated on the client, so if sent twice due to network retry, we detect it and don't create a duplicate."

### Script 2: Field App Offline Features (3 min)

"Now the offline-first architecture.

**[db.js]**
We use Dexie.js, a wrapper around IndexedDB. We define two tables: reports for incidents and auth_session for login credentials. This enables complete offline operation.

**[sync.js]**
This is the sync engine. It monitors three events: network restoration, app foreground, and periodic checks every 30 seconds. When triggered, it fetches pending reports from IndexedDB and sends to backend. Failed syncs keep reports pending for automatic retry.

**[app.js GPS section]**
Our GPS acquisition has intelligent fallback. We try high-accuracy mode using GPS first. If that fails, we automatically fall back to low-accuracy using WiFi and cell towers. Visual feedback shows accuracy with color coding.

**[app.js form submit]**
When submitting, we first save locally to IndexedDB with status 'pending'. Then if online, we immediately try to sync. If offline, the report is safe locally and will sync when connectivity returns."

### Script 3: Dashboard Real-Time Monitoring (2 min)

"The command dashboard provides real-time visualization.

**[index.html lines 320-329]**
We initialize a Leaflet map centered on Ratnapura, Sri Lanka. Leaflet is open-source, needs no API key, and works offline.

**[lines 379-419]**
This fetch function runs every 5 seconds. It calls the backend API, compares new report IDs with known IDs, and shows toast notifications for new reports. Command operators get immediate awareness of field updates.

**[lines 422-480]**
For each report, we create a custom marker color-coded by severity: red for critical, orange for high, yellow for medium. Clicking shows a popup with incident details. The sidebar lists all reports chronologically."

---

## Troubleshooting Guide

### Issue 1: GPS Not Working
**Symptoms:** "GPS Failed" or null position

**Solutions:**
1. **Check HTTPS** - GPS requires secure context
2. **Check permissions** - User may have blocked location
3. **Device settings** - Location services must be on
4. **Timeout** - Increase to 30 seconds

### Issue 2: Service Worker Not Updating
**Symptoms:** Code changes not reflected

**Solutions:**
1. **Change cache version**: `CACHE_NAME = "aegis-v3"`
2. **Hard refresh**: Ctrl+Shift+R
3. **Clear cache**: DevTools → Application → Clear storage

### Issue 3: Reports Not Syncing
**Debug Checklist:**
```javascript
console.log('Online:', navigator.onLine);
console.log('Pending:', pending.length);
console.log('Token:', session ? 'Present' : 'Missing');
```

**Common Causes:**
1. Expired JWT token
2. Backend server down
3. CORS configuration
4. Network firewall

### Issue 4: Dashboard Not Showing Reports
**Debug:**
```javascript
fetch('/api/reports', {
  headers: { 'Authorization': 'Bearer demo-token' }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## Key Takeaways for VIVA

**Remember these points:**

1. **Problem**: Disaster reporting in areas with no connectivity
2. **Solution**: Offline-first PWA with automatic sync
3. **Technologies**:
   - Backend: Node.js, Express, Firebase/Mock, JWT
   - Frontend: Vanilla JS, IndexedDB (Dexie), Service Worker
   - Dashboard: Leaflet Maps, polling
4. **Key Features**:
   - Works completely offline
   - Auto-sync when online
   - Duplicate prevention with UUIDs
   - GPS with fallback
   - Real-time dashboard

**Demo Flow:**
1. Show field app working offline
2. Submit report → saves to IndexedDB
3. Go online → auto-sync
4. Dashboard updates with new report
5. Explain technical implementation

Good luck with your VIVA! 🎓
