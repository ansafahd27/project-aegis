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

## 📁 Project Structure
```
├── backend/          # Node.js API Server
├── dashboard/        # Admin Dashboard (HTML/CSS/JS)
├── field-app/        # Mobile Responder App (PWA)
└── docs/             # Comprehensive Documentation
```

## 🎓 VIVA Session Preparation

**Preparing for your VIVA?** We've created comprehensive documentation to help you explain the code:

### 📚 Documentation Files

1. **[VIVA_GUIDE.md](VIVA_GUIDE.md)** - Start here! Guide on how to use all documentation
2. **[VIVA_PREPARATION.md](VIVA_PREPARATION.md)** - Complete technical reference (878 lines)
   - Detailed code explanations
   - Backend, Field App, Dashboard architecture  
   - 20+ VIVA questions with detailed answers
   - Code walkthrough scripts
   - Technical concepts (PWA, IndexedDB, JWT, Service Workers)

3. **[VIVA_QUICK_REFERENCE.md](VIVA_QUICK_REFERENCE.md)** - Last-minute revision (290 lines)
   - 1-minute project summary
   - Top 5 features and 10 questions
   - 2-minute demo script
   - Common mistakes to avoid

4. **[VIVA_FLOWCHARTS.md](VIVA_FLOWCHARTS.md)** - Visual explanations (914 lines)
   - 8 detailed ASCII flowcharts
   - System architecture diagrams
   - Data flow visualizations
   - Step-by-step process explanations

**Total: 2,082 lines of comprehensive VIVA preparation material!**

### Quick Start for VIVA Prep
```bash
# Read in this order:
1. VIVA_GUIDE.md          # How to use the documentation
2. VIVA_PREPARATION.md    # Deep technical understanding
3. VIVA_FLOWCHARTS.md     # Visual explanations
4. VIVA_QUICK_REFERENCE.md # Final revision before VIVA
```

---