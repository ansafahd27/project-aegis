// Firebase configuration
const FIREBASE_CONFIG = {
  apiUrl: '/api/reports',
};

let isSyncing = false;

async function syncReports() {
  if (!navigator.onLine || isSyncing) return;

  isSyncing = true;
  console.log('🔄 Starting sync...');

  try {
    const session = await getSession();
    if (!session) {
      console.log('No session, skipping sync');
      return;
    }

    const pending = await getPendingReports();

    if (pending.length === 0) {
      console.log('No pending reports to sync');
      return;
    }

    console.log(`Found ${pending.length} pending reports`);

    for (const report of pending) {
      try {
        // Prepare payload (exclude local status)
        const payload = { ...report };
        delete payload.status; // status is for local sync state

        // Send to Firebase
        const response = await fetch(FIREBASE_CONFIG.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const responseData = await response.json();

        // Mark as synced only on success or if duplicate
        if (responseData.success) {
          await updateReportStatus(report.id, 'synced');
          console.log(`✅ Synced: ${report.id} ${responseData.duplicate ? '(Duplicate)' : ''}`);
        }

      } catch (err) {
        console.log(`❌ Failed to sync ${report.id}: ${err.message}`);
        // Report stays pending, will retry later
      }
    }

    // Update UI
    if (typeof displayPendingReports === 'function') {
      displayPendingReports();
    }

    console.log('✅ Sync complete');

  } catch (err) {
    console.error('Sync error:', err);
  } finally {
    isSyncing = false;
  }
}

// Auto-sync on network restore
window.addEventListener("online", () => {
  console.log('Network restored, syncing...');
  syncReports();
});

// Sync on app foreground
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.onLine) {
    syncReports();
  }
});

// Periodic sync (every 30 seconds if online)
setInterval(() => {
  if (navigator.onLine) {
    syncReports();
  }
}, 30000);