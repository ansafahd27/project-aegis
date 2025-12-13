# 🛡️ Project Aegis

**Project Aegis** is a disaster response coordination platform designed to bridge the gap between field responders and command centers. It operates effectively even in "Digital Dead Zones" (areas with no internet connectivity).

## 🏗️ Architecture

The system consists of three main components:

1.  **Backend API** (`/backend`)
    *   Node.js + Express server.
    *   Handles data synchronization and reliable storage.
    *   **Dual Mode Database**:
        *   *Firebase Firestore*: When `serviceAccountKey.json` is present.
        *   *In-Memory Mock DB*: Fallback for offline demos or when keys are missing.

2.  **Command Dashboard** (`/dashboard`)
    *   Real-time incident visualization using Leaflet Maps.
    *   Live statistics and incoming reports feed.
    *   Connects to the backend API to fetch data.

3.  **Field Responder App** (`/field-app`)
    *   Progressive Web App (PWA) for mobile devices.
    *   **Offline-First**: Uses IndexedDB (via Dexie.js) to save reports when offline.
    *   **Auto-Sync**: Automatically pushes data to the backend when connectivity is restored.

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) installed on your machine.
*   A modern web browser.

### 1. Start the Backend server

The backend is the heart of the system. You must start it first.

```bash
cd backend
npm install
npm start
```

*   The server will run at `http://localhost:3000`.
*   Note: If you see a warning about "Firebase keys not found", this is normal! The server will switch to **Offline Simulation Mode** (In-Memory DB).

### 2. Open the Command Dashboard

Simply open the `dashboard/index.html` file in your browser.
*   You can drag and drop the file into Chrome/Edge.
*   Or use a live server extension if you prefer.

### 3. Open the Field App

Open `field-app/index.html` in your browser (simulate a mobile device using DevTools for the best experience).
*   **Login**: Enter any email and use password `aegis2024`.
*   **Grant Permissions**: Allow Location Access when prompted to simulated GPS coordinates.
*   **Test Offline**: Try disconnecting your network (or use the "Offline" preset in DevTools Network tab). Submit a report, then go back online to see it sync!

## 🧪 Simulation Features

*   **Mock GPS**: The field app simulates GPS accuracy.
*   **Mock Reports**: The backend accepts reports and stores them temporarily in memory (if no database is configured).

### Troubleshooting

#### Windows PowerShell Error
If you see `npm : File ... cannot be loaded because running scripts is disabled`, run this instead:
```bash
cmd /c npm start
```
Or run the server file directly:
```bash
node server.js
```
├── backend/          # Node.js API Server
├── dashboard/        # Admin Dashboard (HTML/CSS/JS)
└── field-app/        # Mobile Responder App (PWA)
```