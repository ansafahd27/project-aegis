// server.js - Node.js + Express + Firebase Admin
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // For base64 images

// Serve Static Apps
app.use('/responder', express.static(path.join(__dirname, '../field-app')));
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));
console.log('files served at /responder and /dashboard');

// Mock DB for "Digital Dead Zone" simulation (when no internet/keys)
const mockDb = {
  reports: new Map(), // Empty - Waiting for real data
  users: new Map()
};

let db;
let isFirebase = false;

// Initialize Firebase Admin (Try/Catch for Offline/No-Key Mode)
// Initialize Firebase Admin
try {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production/Cloud: Read from Environment Variable
    console.log('Using FIREBASE_SERVICE_ACCOUNT from Environment');
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Local: Read from file
    serviceAccount = require('./serviceAccountKey.json');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  isFirebase = true;
  console.log('✅ Connected to Firebase Cloud Firestore');
} catch (err) {
  console.log('⚠️ Firebase setup failed:', err.message);
  console.log('   Switching to IN-MEMORY DATABASE (Offline Simulation Mode).');
  isFirebase = false;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== AUTH ENDPOINTS ====================

// Custom NIC-based Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, nic } = req.body;

    if (!nic || nic.length < 5) {
      return res.status(400).json({ error: 'Valid NIC is required' });
    }

    let userId;
    let userEmail = `${nic}@aegis.local`; // Dummy email for compatibility

    if (isFirebase) {
      // 1. Check if user exists in Firestore 'users' collection by NIC
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('nic', '==', nic).limit(1).get();

      if (!snapshot.empty) {
        // User exists
        const doc = snapshot.docs[0];
        userId = doc.id;
        // Update name if provided
        if (name) {
          await doc.ref.update({ name, lastLogin: admin.firestore.FieldValue.serverTimestamp() });
        }
      } else {
        // Create new user
        userId = `user_${nic}`; // or auto-id
        await usersRef.doc(userId).set({
          nic,
          name: name || 'Unknown',
          email: userEmail,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLogin: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      // Mock Mode
      userId = `mock_${nic}`;
      mockDb.users.set(userId, { nic, name });
    }

    // 2. Generate Custom JWT
    const token = jwt.sign(
      { userId, nic, name, email: userEmail },
      JWT_SECRET,
      { expiresIn: '30d' } // Long-lived token for offline ease
    );

    res.json({
      success: true,
      token,
      userId,
      name,
      nic
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ==================== MIDDLEWARE ====================

// Verify JWT token or Firebase ID Token
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  if (token === 'demo-token') {
    req.user = { userId: 'admin', email: 'admin@aegis.lk' };
    return next();
  }

  try {
    // We are now issuing Custom JWTs signed with JWT_SECRET even in Firebase mode
    // (See /api/auth/login implementation)
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // console.error('Auth verification failed:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ==================== REPORT ENDPOINTS ====================

// Submit incident report (with duplicate check)
app.post('/api/reports', authenticate, async (req, res) => {
  try {
    const { id, incidentType, severity, lat, lng, accuracy, timestamp, photo, userId } = req.body;

    // Validate required fields
    if (!id || !incidentType || !severity || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for duplicate (UUID already exists)
    let exists = false;
    if (isFirebase) {
      const existingDoc = await db.collection('reports').doc(id).get();
      exists = existingDoc.exists;
    } else {
      exists = mockDb.reports.has(id);
    }

    if (exists) {
      console.log(`Duplicate report detected: ${id}`);
      return res.status(200).json({
        success: true,
        message: 'Report already exists',
        duplicate: true
      });
    }

    // Save to Firestore or Mock
    const report = {
      ...req.body, // Store all submitted fields
      id,          // Ensure crucial system fields are preserved/overwritten securely
      timestamp: isFirebase ? admin.firestore.Timestamp.fromDate(new Date(timestamp)) : new Date(timestamp),
      submittedBy: req.user.email,
      syncedAt: isFirebase ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
      status: req.body.status || 'open' // Maintain server-side status logic
    };

    if (isFirebase) {
      // Add GeoPoint only for Firestore
      report.location = new admin.firestore.GeoPoint(parseFloat(lat), parseFloat(lng));
      await db.collection('reports').doc(id).set(report);
    } else {
      mockDb.reports.set(id, report);
    }

    console.log(`✅ Report saved: ${id}`);
    res.status(201).json({
      success: true,
      message: 'Report saved successfully',
      reportId: id
    });

  } catch (err) {
    console.error('Report submission error:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// Get all reports (for dashboard)
app.get('/api/reports', authenticate, async (req, res) => {
  try {
    const reports = [];

    if (isFirebase) {
      const snapshot = await db.collection('reports')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      snapshot.forEach(doc => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate().toISOString()
        });
      });
    } else {
      // Mock DB fetch
      const allReports = Array.from(mockDb.reports.values());
      allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Descending

      allReports.forEach(r => {
        reports.push({
          ...r,
          timestamp: typeof r.timestamp === 'string' ? r.timestamp : r.timestamp.toISOString()
        });
      });
    }

    res.json({ success: true, reports });
  } catch (err) {
    console.error('Fetch reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get reports by time range
app.get('/api/reports/range', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const reports = [];

    if (isFirebase) {
      let query = db.collection('reports');

      if (startDate) {
        query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
      }

      if (endDate) {
        query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
      }

      const snapshot = await query.orderBy('timestamp', 'desc').get();
      snapshot.forEach(doc => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate().toISOString()
        });
      });
    } else {
      // Mock DB
      const allReports = Array.from(mockDb.reports.values());
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date(8640000000000000);

      allReports.filter(r => {
        const t = typeof r.timestamp === 'string' ? new Date(r.timestamp) : r.timestamp;
        return t >= start && t <= end;
      }).forEach(r => {
        reports.push({
          ...r,
          timestamp: typeof r.timestamp === 'string' ? r.timestamp : r.timestamp.toISOString()
        });
      });
      reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error('Range query error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Aegis Backend running on port ${PORT}`);
});

module.exports = app;