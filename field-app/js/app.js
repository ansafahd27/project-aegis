// Register Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(() => {
    console.log('Service Worker registered');
  });
}

// Check authentication on page load
(async () => {
  const valid = await isSessionValid();
  if (!valid) {
    window.location.href = 'login.html';
    return;
  }

  const session = await getSession();
  const displayName = session.name ? `${session.name} (${session.nic || 'No NIC'})` : session.email;
  document.getElementById('userInfo').textContent = `👤 ${displayName}`;
  document.getElementById('logoutBtn').style.display = 'inline-block';

  // Load pending reports
  displayPendingReports();
})();

// Logout handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await clearSession();
  window.location.href = 'login.html';
});

// Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  // Ensure toastContainer exists, create if not (or assume it's in HTML)
  if (!container) {
    console.error('Toast container not found. Please add <div id="toastContainer"></div> to your HTML.');
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <span class="toast-title">${type === 'error' ? 'Error' : 'Notification'}</span>
      <span class="toast-msg">${message}</span>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Network status UI
const statusText = document.getElementById("status");
function updateStatus() {
  const online = navigator.onLine;
  statusText.textContent = online ? "🟢 Online" : "🔴 Offline";
  statusText.style.color = online ? "green" : "red";

  if (online) {
    syncReports(); // Auto-sync when coming online
  }
}
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);
updateStatus();

// GPS capture with accuracy check
let currentPosition = null;
const gpsStatus = document.getElementById('gpsStatus');

// GPS watcher with fallback
let watchId = null;

function startGPS(enableHighAccuracy = true) {
  if (watchId) navigator.geolocation.clearWatch(watchId);

  gpsStatus.textContent = enableHighAccuracy ? '📍 Acquiring precision GPS...' : '📍 Acquiring approximate location...';
  gpsStatus.style.color = 'orange';

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      currentPosition = pos;
      const accuracy = pos.coords.accuracy;

      if (accuracy > 50) {
        gpsStatus.innerHTML = `
          📍 <strong>${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</strong><br>
          <span style="font-size:0.8em">Accuracy: ${accuracy.toFixed(0)}m (Weak)</span>
        `;
        gpsStatus.style.color = '#f59e0b'; // Amber
      } else {
        gpsStatus.innerHTML = `
          📍 <strong>${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}</strong><br>
          <span style="font-size:0.8em">Accuracy: ${accuracy.toFixed(0)}m (Good)</span>
        `;
        gpsStatus.style.color = '#22c55e'; // Green
      }
    },
    (err) => {
      console.warn(`GPS Error (${enableHighAccuracy ? 'High' : 'Low'}): ${err.message}`);
      if (enableHighAccuracy) {
        console.log("Retrying with low accuracy...");
        startGPS(false); // Fallback to low accuracy
      } else {
        gpsStatus.textContent = `❌ GPS Failed: ${err.message}. ensure device location is ON.`;
        gpsStatus.style.color = '#ef4444'; // Red
      }
    },
    {
      enableHighAccuracy: enableHighAccuracy,
      timeout: 30000,       // Increase wait time to 30s
      maximumAge: 300000    // Accept cached positions up to 5 minutes old
    }
  );
}

startGPS(true);

// Severity Slider Logic
const severityInput = document.getElementById('severity');
const severityValue = document.getElementById('severityValue');
const severityLabelsMap = {
  1: "CRITICAL 🔴",
  2: "High 🟠",
  3: "Medium 🟡",
  4: "Low 🔵",
  5: "Minimal 🟢"
};

function updateSeverityUI() {
  const val = severityInput.value;
  severityValue.textContent = severityLabelsMap[val];
}

severityInput.addEventListener('input', updateSeverityUI);
updateSeverityUI(); // Init

// Refresh GPS handler
document.getElementById('refreshGpsBtn').addEventListener('click', () => {
  console.log('Manual GPS refresh triggered');
  showToast('Refreshing GPS...', 'info');
  currentPosition = null; // Clear old position
  startGPS(true); // Restart with high accuracy
});

// Handle form submit
document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentPosition) {
    showToast('Waiting for GPS location...', 'error');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    // Get session for user info
    const session = await getSession();

    // Handle photo if selected
    let photoData = null;
    const photoInput = document.getElementById('photo');
    if (photoInput.files[0]) {
      photoData = await fileToBase64(photoInput.files[0]);
    }

    const report = {
      id: crypto.randomUUID(),
      incidentType: document.getElementById("type").value,
      severity: parseInt(document.getElementById("severity").value),
      lat: currentPosition.coords.latitude,
      lng: currentPosition.coords.longitude,
      accuracy: currentPosition.coords.accuracy,
      timestamp: new Date().toISOString(),
      photo: photoData,
      userId: session.userId,
      status: "pending"
    };

    await saveReport(report);

    // Show confirmation
    showToast("✅ Saved locally!", "success");

    // Reset form
    document.getElementById("reportForm").reset();

    // Update pending list
    displayPendingReports();

    // Try to sync if online
    if (navigator.onLine) {
      syncReports();
    }

  } catch (err) {
    showToast(`Error: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Report';
  }
});

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Display pending reports
async function displayPendingReports() {
  const pending = await getPendingReports();
  const list = document.getElementById('pendingList');

  if (pending.length === 0) {
    list.innerHTML = '<li>No pending reports</li>';
    return;
  }

  list.innerHTML = pending.map(r => `
    <li>
      <strong>${r.incidentType}</strong> - Severity ${r.severity}<br>
      <small>${new Date(r.timestamp).toLocaleString()}</small>
    </li>
  `).join('');
}

// Sync on visibility change (foreground)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.onLine) {
    syncReports();
  }
});