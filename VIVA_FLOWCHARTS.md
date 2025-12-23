# 📊 Project Aegis - Visual Flowcharts for VIVA

This document contains ASCII flowcharts to help explain the system during your VIVA session.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROJECT AEGIS                                │
│                  Disaster Response Platform                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
    │   Field App       │  │  Backend Server   │  │   Dashboard       │
    │   (Mobile PWA)    │  │  (Node.js API)    │  │   (Web UI)        │
    ├───────────────────┤  ├───────────────────┤  ├───────────────────┤
    │ • IndexedDB       │  │ • Express         │  │ • Leaflet Maps    │
    │ • Service Worker  │◄─┤ • JWT Auth        │◄─┤ • Real-time       │
    │ • GPS Location    │  │ • CORS            │  │ • Statistics      │
    │ • Offline-First   │  │ • Dual-Mode DB    │  │ • Notifications   │
    └───────────────────┘  └───────┬───────────┘  └───────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
        ┌───────────────────┐       ┌───────────────────┐
        │ Firebase Firestore│       │  In-Memory Mock   │
        │  (Production)     │       │   (Demo/Dev)      │
        └───────────────────┘       └───────────────────┘
```

---

## 2. Report Submission Flow (Offline)

```
User Opens Field App
        │
        ▼
┌───────────────────┐
│ Check Session     │
│ in IndexedDB      │
└────────┬──────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │ NO
         ├────────────► Redirect to Login
         │
         │ YES
         ▼
┌────────────────────┐
│  Request GPS       │
│  watchPosition()   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Show GPS Coords    │
│ with Accuracy      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  User Fills Form   │
│  • Incident Type   │
│  • Severity        │
│  • Photo (opt)     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  User Clicks       │
│  "Save Report"     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Validate GPS      │
│  Available?        │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │ NO
         ├────────────► Show Error Toast
         │
         │ YES
         ▼
┌────────────────────┐
│  Create Report     │
│  • UUID            │
│  • Timestamp       │
│  • Coords          │
│  • status:pending  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Save to IndexedDB │
│  db.reports.add()  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Show Success      │
│  Toast             │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Update Pending    │
│  Reports List      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check: Online?    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Online? │
    └────┬────┘
         │ NO
         ├────────────► Wait for Connection
         │
         │ YES
         ▼
┌────────────────────┐
│  Trigger           │
│  syncReports()     │
└────────────────────┘
```

---

## 3. Synchronization Engine Flow

```
Sync Trigger Event
(online/foreground/timer)
        │
        ▼
┌────────────────────┐
│  Check: Online?    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │  YES?   │
    └────┬────┘
         │ NO
         ├────────────► Exit (Wait)
         │
         │ YES
         ▼
┌────────────────────┐
│  Check: Syncing?   │
└────────┬───────────┘
         │
    ┌────┴────┐
    │Already? │
    └────┬────┘
         │ YES
         ├────────────► Exit (Prevent Double Sync)
         │
         │ NO
         ▼
┌────────────────────┐
│  Set isSyncing =   │
│  true              │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Get Session from  │
│  IndexedDB         │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │ NO
         ├────────────► Exit (Not Authenticated)
         │
         │ YES
         ▼
┌────────────────────┐
│  Get Pending       │
│  Reports           │
│  status=pending    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Any?    │
    └────┬────┘
         │ NO
         ├────────────► Exit (Nothing to Sync)
         │
         │ YES
         ▼
┌────────────────────┐
│  For Each Report   │◄───────┐
└────────┬───────────┘        │
         │                    │
         ▼                    │
┌────────────────────┐        │
│  Prepare Payload   │        │
│  (Remove status)   │        │
└────────┬───────────┘        │
         │                    │
         ▼                    │
┌────────────────────┐        │
│  POST /api/reports │        │
│  with JWT token    │        │
└────────┬───────────┘        │
         │                    │
    ┌────┴────┐               │
    │Success? │               │
    └────┬────┘               │
         │ NO                 │
         ├────────────► Log Error
         │              Keep Pending
         │              Continue Loop ──┘
         │ YES
         ▼
┌────────────────────┐        │
│  Update Status to  │        │
│  "synced"          │        │
└────────┬───────────┘        │
         │                    │
         ▼                    │
┌────────────────────┐        │
│  Log Success       │        │
└────────┬───────────┘        │
         │                    │
         └────────────────────┘
         │
         ▼
┌────────────────────┐
│  Update UI         │
│  (Remove from      │
│   pending list)    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Set isSyncing =   │
│  false             │
└────────────────────┘
```

---

## 4. Backend Authentication Flow

```
Client Request: POST /api/auth/login
{ name: "John", nic: "123456789V" }
        │
        ▼
┌────────────────────┐
│  Validate NIC      │
│  Length >= 5       │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │ NO
         ├────────────► 400 Error: "Valid NIC required"
         │
         │ YES
         ▼
┌────────────────────┐
│  Generate Email    │
│  nic@aegis.local   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check Database    │
│  Mode              │
└────────┬───────────┘
         │
    ┌────┴────┐
    │Firebase?│
    └────┬────┘
         │ NO (Mock Mode)
         ├────────────────────────┐
         │                        │
         │ YES                    ▼
         ▼                ┌───────────────────┐
┌────────────────────┐   │ Create Mock User  │
│ Query Firestore    │   │ mockDb.users.set()│
│ WHERE nic = ?      │   └───────┬───────────┘
└────────┬───────────┘           │
         │                       │
    ┌────┴────┐                  │
    │ Exists? │                  │
    └────┬────┘                  │
         │ NO                    │
         ├──────────┐            │
         │          │            │
         │ YES      ▼            │
         │   ┌──────────────┐   │
         │   │ Create User  │   │
         │   │ in Firestore │   │
         │   └──────┬───────┘   │
         │          │            │
         ▼          ▼            │
   ┌──────────────┐             │
   │ Update       │             │
   │ lastLogin    │             │
   └──────┬───────┘             │
          │                     │
          └──────────┬──────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Generate JWT Token    │
        │  payload: {            │
        │    userId, nic, name,  │
        │    email               │
        │  }                     │
        │  expiresIn: "30d"      │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Response:             │
        │  {                     │
        │    success: true,      │
        │    token: "jwt...",    │
        │    userId: "...",      │
        │    name: "...",        │
        │    nic: "..."          │
        │  }                     │
        └────────────────────────┘
```

---

## 5. Dashboard Real-Time Update Flow

```
Dashboard Page Load
        │
        ▼
┌────────────────────┐
│  Initialize Map    │
│  Leaflet at        │
│  Ratnapura coords  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Call              │
│  fetchReports()    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  GET /api/reports  │
│  with JWT token    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │Success? │
    └────┬────┘
         │ NO
         ├────────────► Show Connection Error
         │
         │ YES
         ▼
┌────────────────────┐
│  Parse Response    │
│  reports array     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check First Load  │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ First?  │
    └────┬────┘
         │ YES
         ├────────────► Skip Notifications
         │              (Prevent spam)
         │ NO
         ▼
┌────────────────────┐
│  Compare Report    │
│  IDs with Known    │
│  IDs               │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  For New Reports:  │
│  Show Toast        │
│  Notification      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Update Known IDs  │
│  Set               │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Clear Old Markers │
│  from Map          │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  For Each Report:  │◄───────┐
│  • Create Marker   │        │
│  • Color by        │        │
│    Severity        │        │
│  • Add Popup       │        │
│  • Add to Map      │        │
└────────┬───────────┘        │
         │                    │
         └────────────────────┘
         │
         ▼
┌────────────────────┐
│  Update Statistics │
│  • Total Reports   │
│  • Critical Count  │
│  • Last Hour       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Update Sidebar    │
│  Report List       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Update Last       │
│  Update Time       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Wait 5 Seconds    │
│  setTimeout()      │
└────────┬───────────┘
         │
         └────────────► Call fetchReports() Again
                        (Infinite Loop)
```

---

## 6. Service Worker Lifecycle

```
Page Load
    │
    ▼
┌────────────────────┐
│  Register SW       │
│  navigator         │
│   .serviceWorker   │
│   .register()      │
└────────┬───────────┘
         │
         ▼
    ┌────────────┐
    │ SW Exists? │
    └────┬───────┘
         │ NO
         ├──────────────────────┐
         │                      │
         │ YES                  ▼
         ▼              ┌───────────────┐
┌────────────────┐     │  SW INSTALL   │
│ SW ACTIVATE    │     │  Event        │
│ Event          │     └───────┬───────┘
└────────┬───────┘             │
         │                     ▼
         │             ┌───────────────┐
         │             │ Open Cache    │
         │             │ CACHE_NAME    │
         │             └───────┬───────┘
         │                     │
         │                     ▼
         │             ┌───────────────┐
         │             │ Download &    │
         │             │ Cache Assets  │
         │             │ cache.addAll()│
         │             └───────┬───────┘
         │                     │
         │                     ▼
         │             ┌───────────────┐
         │             │ skipWaiting() │
         │             └───────┬───────┘
         │                     │
         └─────────────────────┘
         │
         ▼
┌────────────────────┐
│  SW FETCH Event    │
│  (Intercept        │
│   Requests)        │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check Request     │
│  URL               │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ /api/*? │
    └────┬────┘
         │ YES
         ├────────────► Pass Through to Network
         │              (Don't Cache API)
         │ NO
         ▼
┌────────────────────┐
│  Check Cache       │
│  caches.match()    │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │ YES
         ├────────────────────────┐
         │                        │
         │ NO                     ▼
         ▼                ┌───────────────┐
┌────────────────┐       │ Return Cached │
│ Fetch from     │       │ Response      │
│ Network        │       │ (Fast!)       │
└────────┬───────┘       └───────┬───────┘
         │                       │
    ┌────┴────┐                  │
    │Success? │                  │
    └────┬────┘                  │
         │ YES                   │
         ├──────────┐            │
         │          │            │
         │ NO       ▼            │
         │   ┌──────────────┐   │
         │   │ Update Cache │   │
         │   │ with New     │   │
         │   │ Response     │   │
         │   └──────┬───────┘   │
         │          │            │
         ▼          ▼            │
   ┌──────────────┐             │
   │ Return Error │             │
   │ or Fallback  │             │
   └──────────────┘             │
         │                      │
         └──────────────────────┘
```

---

## 7. GPS Acquisition with Fallback

```
Start GPS Acquisition
        │
        ▼
┌────────────────────┐
│  Call              │
│  startGPS(true)    │
│  High Accuracy     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  watchPosition()   │
│  enableHigh        │
│  Accuracy: true    │
│  timeout: 30s      │
└────────┬───────────┘
         │
    ┌────┴────┐
    │Success? │
    └────┬────┘
         │ NO (Error)
         ├────────────────────┐
         │                    │
         │ YES                ▼
         ▼            ┌───────────────┐
┌────────────────┐   │ Check if High │
│ Get Position   │   │ Accuracy Mode │
│ Object         │   └───────┬───────┘
└────────┬───────┘           │
         │              ┌────┴────┐
         ▼              │  YES?   │
┌────────────────┐     └────┬────┘
│ Extract Coords │          │ NO
│ • latitude     │          ├──────────► Show GPS Failed
│ • longitude    │          │
│ • accuracy     │          │ YES
└────────┬───────┘          ▼
         │          ┌───────────────┐
         ▼          │ Retry with    │
┌────────────────┐ │ startGPS      │
│ Check Accuracy │ │ (false)       │
└────────┬───────┘ │ Low Accuracy  │
         │         └───────┬───────┘
    ┌────┴────┐           │
    │ > 50m?  │           ▼
    └────┬────┘   ┌───────────────┐
         │ YES    │ watchPosition │
         ├────────┤ enableHigh    │
         │        │ Accuracy:false│
         │ NO     │ (WiFi/Cell)   │
         ▼        └───────┬───────┘
┌────────────────┐        │
│ Show Green     │        │
│ "Good" Status  │        ▼
└────────┬───────┘  ┌─────────────┐
         │          │ Get Approx  │
         │          │ Position    │
         │          └──────┬──────┘
         │                 │
         │                 ▼
         │          ┌─────────────┐
         │          │ Show Amber  │
         │          │ "Weak"      │
         │          │ Status      │
         │          └──────┬──────┘
         │                 │
         └─────────────────┘
         │
         ▼
┌────────────────────┐
│  Store in          │
│  currentPosition   │
│  (Ready for Submit)│
└────────────────────┘
```

---

## 8. Duplicate Prevention Mechanism

```
Field App: Create Report
        │
        ▼
┌────────────────────┐
│  Generate UUID     │
│  crypto.random     │
│  UUID()            │
│  Example:          │
│  "a1b2c3-..."      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Save to IndexedDB │
│  with UUID as id   │
└────────┬───────────┘
         │
         ▼
     [OFFLINE]
         │
         ▼
┌────────────────────┐
│  Network Restored  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Sync Attempt #1   │
│  POST /api/reports │
│  { id: "a1b2c3..." }
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Backend Receives  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Check Database    │
│  for id="a1b2c3"   │
└────────┬───────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │ NO
         ├──────────────────────┐
         │                      │
         │ YES                  ▼
         ▼              ┌───────────────┐
┌────────────────┐     │ Save New      │
│ Return 200     │     │ Report to DB  │
│ {success:true, │     └───────┬───────┘
│  duplicate:    │             │
│  true}         │             ▼
└────────┬───────┘     ┌───────────────┐
         │             │ Return 201    │
         │             │ {success:true,│
         │             │  reportId}    │
         │             └───────┬───────┘
         │                     │
         └─────────────────────┘
         │
         ▼
┌────────────────────┐
│  Field App         │
│  Receives Success  │
│  Mark as "synced"  │
└────────┬───────────┘
         │
         ▼
    [Scenario: Network drops during sync]
         │
         ▼
┌────────────────────┐
│  Sync Attempt #2   │
│  POST /api/reports │
│  (Same UUID)       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Backend: UUID     │
│  Already Exists    │
│  (DUPLICATE!)      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Return success    │
│  with duplicate    │
│  flag              │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Field App:        │
│  Mark as "synced"  │
│  No duplicate      │
│  entry created!    │
└────────────────────┘
```

---

## Quick Reference: Technology Stack

```
┌─────────────────────────────────────────────┐
│              TECHNOLOGY STACK                │
├─────────────────────────────────────────────┤
│                                              │
│  BACKEND                                     │
│  ├─ Runtime: Node.js                         │
│  ├─ Framework: Express.js                    │
│  ├─ Auth: JWT (jsonwebtoken)                 │
│  ├─ Database:                                │
│  │   ├─ Production: Firebase Firestore       │
│  │   └─ Dev/Demo: In-Memory Map              │
│  └─ Middleware: CORS                         │
│                                              │
│  FIELD APP                                   │
│  ├─ Type: Progressive Web App (PWA)          │
│  ├─ Local Storage: IndexedDB (Dexie.js)      │
│  ├─ Offline: Service Worker                  │
│  ├─ Location: Geolocation API                │
│  ├─ UUID: crypto.randomUUID()                │
│  └─ UI: Vanilla JavaScript + CSS             │
│                                              │
│  DASHBOARD                                   │
│  ├─ Maps: Leaflet.js                         │
│  ├─ HTTP: Fetch API                          │
│  ├─ Updates: Polling (setInterval)           │
│  └─ UI: Vanilla JavaScript + CSS             │
│                                              │
│  DEPLOYMENT                                  │
│  ├─ Backend: Render/Heroku/Railway           │
│  ├─ Field App: Firebase Hosting/Netlify      │
│  └─ Database: Firebase Cloud                 │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Summary: Complete Request-Response Cycle

```
┌──────────────┐
│  Field User  │
│  (Mobile)    │
└──────┬───────┘
       │ 1. Creates Report
       │    (Flood, Severity 2)
       ▼
┌──────────────────┐
│   Field App      │
│   (PWA)          │
├──────────────────┤
│ 2. Generate UUID │
│ 3. Save IndexedDB│
│    status:pending│
└──────┬───────────┘
       │ 4. Sync Trigger
       │    (Online Event)
       ▼
┌──────────────────┐
│  POST Request    │
│  /api/reports    │
│  Auth: JWT Token │
│  Body: {report}  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Backend Server  │
│  (Node.js)       │
├──────────────────┤
│ 5. Verify JWT    │
│ 6. Check UUID    │
│ 7. Save to DB    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Firebase        │
│  Firestore       │
├──────────────────┤
│ 8. Store Report  │
│    Collection    │
└──────┬───────────┘
       │
       │ 9. Success Response
       ▼
┌──────────────────┐
│  Field App       │
├──────────────────┤
│ 10. Mark synced  │
│ 11. Remove from  │
│     pending list │
└──────────────────┘
       
       
       [Meanwhile...]
       
       
┌──────────────────┐
│   Dashboard      │
│   (Command)      │
├──────────────────┤
│ 12. Poll every   │
│     5 seconds    │
└──────┬───────────┘
       │ GET /api/reports
       ▼
┌──────────────────┐
│  Backend Server  │
├──────────────────┤
│ 13. Fetch from   │
│     Firestore    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   Dashboard      │
├──────────────────┤
│ 14. Update Map   │
│ 15. Add Marker   │
│ 16. Show Toast   │
│     "New Report!"│
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Command Center  │
│  Operator        │
│  👤             │
│  Sees Report!    │
└──────────────────┘
```

---

## Print This Page!

These flowcharts visually explain the entire system. Use them during your VIVA to:
- Explain architecture clearly
- Show data flow step-by-step
- Answer "how does it work?" questions
- Demonstrate understanding of the system

**Good luck! 🚀**
