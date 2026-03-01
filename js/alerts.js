/* ===== ALERTS.JS — Proximity alert logic ===== */

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
}

function collectAlerts(vehicleId) {
    const state = getState();
    const alerts = [];
    const THRESHOLD = 30;

    function pushAlert(message, dateStr) {
        const days = getDaysUntil(dateStr);
        if (days !== null && days <= THRESHOLD) {
            alerts.push({ message, days, date: dateStr, type: days <= 7 ? 'danger' : 'warning' });
        }
    }

    state.revisiones.filter(r => r.vehicleId === vehicleId && r.proximaFecha)
        .forEach(r => pushAlert(`Revisión: ${r.operacion}`, r.proximaFecha));

    state.itv.filter(i => i.vehicleId === vehicleId && i.fechaVencimiento)
        .forEach(i => pushAlert('ITV vence', i.fechaVencimiento));

    state.seguro.filter(s => s.vehicleId === vehicleId && s.fechaRenovacion)
        .forEach(s => pushAlert(`Seguro: renovar (${s.compania})`, s.fechaRenovacion));

    state.multas.filter(m => m.vehicleId === vehicleId && m.estado === 'Pendiente' && m.fechaLimite)
        .forEach(m => pushAlert(`Multa pendiente: ${m.motivo}`, m.fechaLimite));

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
    banner.innerHTML = alerts.map(a => {
        const txt = a.days < 0 ? `Vencido hace ${Math.abs(a.days)}d` : a.days === 0 ? 'Vence HOY' : `Faltan ${a.days} días`;
        return `<div class="alert-item alert-${a.type}">
      <span class="alert-icon">${a.days <= 0 ? '🚨' : '⚠️'}</span>
      <span class="alert-msg"><strong>ALERTA DE PROXIMIDAD:</strong> ${a.message} — ${txt}</span>
    </div>`;
    }).join('');
}

function getVehicleHealth(vehicleId) {
    const alerts = collectAlerts(vehicleId);
    if (!alerts.length) return 'ok';
    if (alerts.some(a => a.type === 'danger' || a.days < 0)) return 'danger';
    return 'warn';
}
