// Initialize Dexie database
const db = new Dexie("AegisDB");

db.version(1).stores({
  reports: "id, status, timestamp, incidentType, severity, lat, lng, photo",
  auth_session: "id"
});

// Upgrade for V2 (Add Name/NIC support)
db.version(2).stores({
  reports: "id, status, timestamp, incidentType, severity, lat, lng, photo",
  auth_session: "id, userId, email" // Basic index
});

// Save report to IndexedDB
async function saveReport(data) {
  await db.reports.add(data);
  console.log('Report saved locally:', data.id);
}

// Get all pending reports
async function getPendingReports() {
  return await db.reports.where("status").equals("pending").toArray();
}

// Get all reports
async function getAllReports() {
  return await db.reports.toArray();
}

// Update report status
async function updateReportStatus(id, status) {
  await db.reports.update(id, { status });
}

// Get cached session
async function getSession() {
  return await db.auth_session.get(1);
}

// Save session
async function saveSession(session) {
  await db.auth_session.put(session);
}

// Clear session (logout)
async function clearSession() {
  await db.auth_session.clear();
}

// Check if session is valid
async function isSessionValid() {
  const session = await getSession();
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    await clearSession();
    return false;
  }
  return true;
}