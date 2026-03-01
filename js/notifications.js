/* ===== NOTIFICATIONS.JS — Browser Push Notifications logic ===== */

async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        showToast("⚠️ Este navegador no soporta notificaciones.");
        return false;
    }

    if (Notification.permission === "granted") return true;

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            showToast("✅ ¡Notificaciones de escritorio activadas!");
            return true;
        } else {
            showToast("❌ Permiso de notificaciones denegado.");
            return false;
        }
    } catch (err) {
        console.error("Error al pedir permiso:", err);
        return false;
    }
}

function sendPushNotification(title, message, vehicleId = null) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Throttle: no repetir la misma notificación en 6 horas
    const key = `notify_${title}_${vehicleId}`;
    const lastNotified = localStorage.getItem(key);
    const now = Date.now();
    if (lastNotified && (now - parseInt(lastNotified) < 21600000)) {
        return;
    }

    const options = {
        body: message,
        icon: 'img/icon-512.png',
        badge: 'img/icon-512.png',
        tag: vehicleId || 'global',
        vibrate: [200, 100, 200],
        silent: false
    };

    // Intentar vía Service Worker (mejor para PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
        });
    } else {
        new Notification(title, options);
    }

    localStorage.setItem(key, now);
}

function checkAndNotifyCriticalAlerts() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Solo avisamos si hay alertas de tipo "danger" (7 días o menos)
    const allAlerts = collectAllGlobalAlerts();
    const critical = allAlerts.filter(a => a.type === 'danger' || a.days <= 0);

    critical.forEach(a => {
        const title = `⚠️ MotorMaster: ${a.vehicleName}`;
        const msg = `${a.message} — ${a.days < 0 ? '¡Vencido!' : a.days === 0 ? '¡VENCE HOY!' : `Quedan ${a.days} días`}`;
        sendPushNotification(title, msg, a.vehicleId);
    });
}
