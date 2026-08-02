/* ===== ALERTS.JS — Proximity alert logic ===== */

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
}

function collectAlerts(vehicleId, threshold = 30) {
    const state = getState();
    const alerts = [];

    function pushAlert(message, dateStr) {
        const days = getDaysUntil(dateStr);
        if (days !== null && (threshold === null || days <= threshold)) {
            alerts.push({ message, days, date: dateStr, type: days <= 7 ? 'danger' : 'warning' });
        }
    }

    state.revisiones.filter(r => r.vehicleId === vehicleId && r.proximaFecha)
        .forEach(r => pushAlert(`Revisión: ${r.operacion}`, r.proximaFecha));

    state.itv.filter(i => i.vehicleId === vehicleId && i.fechaVencimiento)
        .forEach(i => pushAlert('ITV vence', i.fechaVencimiento));

    state.seguro.filter(s => s.vehicleId === vehicleId && (s.fechaVencimiento || s.fechaRenovacion))
        .forEach(s => pushAlert(`Seguro: renovar (${s.compania})`, s.fechaVencimiento || s.fechaRenovacion));

    state.multas.filter(m => m.vehicleId === vehicleId && m.estado === 'Pendiente' && m.fechaLimite)
        .forEach(m => pushAlert(`Multa: ${m.expediente || m.hecho || m.motivo || 'pago pendiente'}`, m.fechaLimite));

    state.otros.filter(o => o.vehicleId === vehicleId && o.fechaVencimiento)
        .forEach(o => pushAlert(o.descripcion, o.fechaVencimiento));

    return alerts.sort((a, b) => a.days - b.days);
}

function renderAlertBanner(vehicleId) {
    const banner = document.getElementById('alert-banner');
    if (!banner) return;
    if (!vehicleId) { banner.classList.add('hidden'); return; }
    const alerts = collectAlerts(vehicleId);
    if (!alerts.length) { banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    // Limitar a 3 alertas máximas para no romper el layout con position:fixed
    const visibleAlerts = alerts.slice(0, 3);
    const hiddenCount = alerts.length - visibleAlerts.length;
    banner.innerHTML = visibleAlerts.map(a => {
        const txt = a.days < 0 ? `Vencido hace ${Math.abs(a.days)}d` : a.days === 0 ? 'Vence HOY' : `Faltan ${a.days} días`;
        return `<div class="alert-item alert-${a.type}">
      <span class="alert-icon" aria-hidden="true">${a.days <= 0 ? '🚨' : '⚠️'}</span>
      <span class="alert-msg"><strong>ALERTA DE PROXIMIDAD:</strong> ${a.message} — ${txt}</span>
    </div>`;
    }).join('')
    + (hiddenCount > 0 ? `<div class="alert-item alert-warning" style="cursor:pointer;" onclick="window.location.hash='#/alerts'">ℹ️ Ver ${hiddenCount} alerta${hiddenCount > 1 ? 's' : ''} más →</div>` : '');
    if (typeof updateGlobalAlertBadge === 'function') updateGlobalAlertBadge();
}

function getVehicleHealth(vehicleId) {
    const alerts = collectAlerts(vehicleId);
    if (!alerts.length) return 'ok';
    if (alerts.some(a => a.type === 'danger' || a.days < 0)) return 'danger';
    return 'warn';
}
function collectAllGlobalAlerts(threshold = 30) {
    const { vehicles } = getState();
    const allAlerts = [];
    vehicles.forEach(v => {
        const vehicleAlerts = collectAlerts(v.id, threshold).map(a => ({
            ...a,
            vehicleId: v.id,
            vehicleName: `${v.icono || '🚗'} ${v.marca}`
        }));
        allAlerts.push(...vehicleAlerts);
    });
    return allAlerts.sort((a, b) => a.days - b.days);
}
