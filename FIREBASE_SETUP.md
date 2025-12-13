# 🔥 Firestore Setup Guide

To enable **Real-Time Database** features, you need to provide a valid Firebase Service Account Key.

## Steps to Get Your Key

1.  **Create a Project**: Go to [console.firebase.google.com](https://console.firebase.google.com/) and create a new project (or use an existing one).
2.  **Create Database**:
    *   Go to **Firestore Database** in the left menu.
    *   Click "Create Database".
    *   Choose **Start in Test Mode** (for development).
3.  **Get Credentials**:
    *   Click the **Gear Icon ⚙️** > **Project Settings**.
    *   Go to the **Service accounts** tab.
    *   Click **Generate new private key**.
    *   This will download a `.json` file.
4.  **Install Key**:
    *   Rename the downloaded file to `serviceAccountKey.json`.
    *   Place it inside the `backend/` folder (overwrite the dummy one if it exists).
5.  **Restart Server**:
    *   Stop the running server (Ctrl+C).
    *   Run `cmd /c npm start` again.

## Verification
When you start the server, you should see:
✅ `Connected to Firebase Cloud Firestore`
(Instead of the "Offline Simulation" warning).
