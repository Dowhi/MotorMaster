/* ===== ALERTS.JS — Proximity alert logic (Fecha + Km) ===== */

function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
}

/* ─── KM-BASED ALERT DETECTION ─────────────────────────── */
const KM_TYPES = [
  { id: 'aceite',       keywords: ['aceite', 'oil', 'lubric'],                   label: 'Aceite / Lubricante',   defaultInterval: 15000 },
  { id: 'filtros',      keywords: ['filtro', 'filter', 'aire', 'habitaculo'],     label: 'Filtros',               defaultInterval: 30000 },
  { id: 'frenos',       keywords: ['fren', 'pastilla', 'brake', 'disco freno'],   label: 'Frenos / Pastillas',    defaultInterval: 60000 },
  { id: 'distribucion', keywords: ['distribuc', 'correa', 'timing', 'cadena'],    label: 'Distribución / Correa', defaultInterval: 120000 },
];

/**
 * Detecta alertas basadas en km de mantenimiento.
 * Compara el km actual del vehículo con el último km registrado
 * para cada tipo de mantenimiento más su intervalo configurado.
 */
function collectKmAlerts(vehicleId) {
    const state = getState();
    const vehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.km) return [];

    const alerts = [];
    const currentKm = parseFloat(vehicle.km) || 0;
    const intervals = state.kmIntervals?.[vehicleId] || {};
    const revisiones = state.revisiones.filter(r => r.vehicleId === vehicleId);

    KM_TYPES.forEach(type => {
        const interval = parseFloat(intervals[type.id]) || type.defaultInterval;

        // Buscar revisiones que coincidan con este tipo por palabra clave
        const matching = revisiones.filter(r => {
            const op = (r.operacion || '').toLowerCase();
            return type.keywords.some(kw => op.includes(kw));
        });

        if (!matching.length) return; // Sin historial, no podemos calcular

        // Último km en que se hizo este tipo de mantenimiento
        const lastKm = Math.max(...matching.map(r => parseFloat(r.km) || 0));
        const nextKm = lastKm + interval;
        const kmRemaining = nextKm - currentKm;
        // Umbral de alerta: 10% del intervalo o 1500 km, lo que sea mayor
        const threshold = Math.max(interval * 0.10, 1500);

        if (kmRemaining <= threshold) {
            alerts.push({
                message: `${type.label}: ${kmRemaining <= 0
                    ? `¡Vencido hace ${Math.abs(Math.round(kmRemaining)).toLocaleString('es-ES')} km!`
                    : `próximo en ${Math.round(kmRemaining).toLocaleString('es-ES')} km`}`,
                kmRemaining,
                nextKm: Math.round(nextKm),
                lastKm: Math.round(lastKm),
                type: kmRemaining <= 0 ? 'danger' : 'warning',
                isKm: true
            });
        }
    });

    return alerts.sort((a, b) => a.kmRemaining - b.kmRemaining);
}

/* ─── DATE-BASED ALERT DETECTION ───────────────────────── */
function collectAlerts(vehicleId, threshold = 30) {
    const state = getState();
    const alerts = [];

    function pushAlert(message, dateStr) {
        const days = getDaysUntil(dateStr);
        if (days !== null && (threshold === null || days <= threshold)) {
            alerts.push({ message, days, date: dateStr, type: days <= 7 ? 'danger' : 'warning' });
        }
    }

    // 1. ITV: Solo el registro con vencimiento más lejano/reciente determina el estado del vehículo
    const vehicleItvs = state.itv.filter(i => i.vehicleId === vehicleId && i.fechaVencimiento);
    if (vehicleItvs.length) {
        vehicleItvs.sort((a, b) => b.fechaVencimiento > a.fechaVencimiento ? 1 : -1);
        const latestItv = vehicleItvs[0];
        pushAlert('ITV vence', latestItv.fechaVencimiento);
    }

    // 2. Seguro: Solo la póliza con vencimiento más lejano/reciente por vehículo
    const vehicleSeguros = state.seguro.filter(s => s.vehicleId === vehicleId && (s.fechaVencimiento || s.fechaRenovacion));
    if (vehicleSeguros.length) {
        vehicleSeguros.sort((a, b) => (b.fechaVencimiento || b.fechaRenovacion) > (a.fechaVencimiento || a.fechaRenovacion) ? 1 : -1);
        const latestSeg = vehicleSeguros[0];
        pushAlert(`Seguro: renovar (${latestSeg.compania})`, latestSeg.fechaVencimiento || latestSeg.fechaRenovacion);
    }

    // 3. Revisiones: Agrupar por tipo de operación y tomar únicamente la fecha próxima más reciente
    const revsByOp = {};
    state.revisiones.filter(r => r.vehicleId === vehicleId && r.proximaFecha).forEach(r => {
        const key = (r.operacion || 'Revision').toLowerCase().trim();
        if (!revsByOp[key] || r.proximaFecha > revsByOp[key].proximaFecha) {
            revsByOp[key] = r;
        }
    });
    Object.values(revsByOp).forEach(r => pushAlert(`Revisión: ${r.operacion}`, r.proximaFecha));

    // 4. Multas pendientes de pago
    state.multas.filter(m => m.vehicleId === vehicleId && m.estado === 'Pendiente' && m.fechaLimite)
        .forEach(m => pushAlert(`Multa: ${m.expediente || m.hecho || m.motivo || 'pago pendiente'}`, m.fechaLimite));

    // 5. Otros impuestos / tasas
    state.otros.filter(o => o.vehicleId === vehicleId && o.fechaVencimiento)
        .forEach(o => pushAlert(o.descripcion, o.fechaVencimiento));

    return alerts.sort((a, b) => a.days - b.days);
}

/* ─── BANNER DE ALERTAS ─────────────────────────────────── */
function renderAlertBanner(vehicleId) {
    const banner = document.getElementById('alert-banner');
    if (!banner) return;
    if (!vehicleId) { banner.classList.add('hidden'); return; }

    const dateAlerts = collectAlerts(vehicleId);
    const kmAlerts   = collectKmAlerts(vehicleId);
    // Mezclar: las de fecha llevan 'days', las de km convertimos a days sintético para ordenar
    const merged = [
        ...dateAlerts,
        ...kmAlerts.map(a => ({ ...a, days: a.kmRemaining <= 0 ? -999 : 999 }))
    ].sort((a, b) => a.days - b.days);

    if (!merged.length) { banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');

    const visibleAlerts = merged.slice(0, 3);
    const hiddenCount   = merged.length - visibleAlerts.length;

    banner.innerHTML = visibleAlerts.map(a => {
        let txt;
        if (a.isKm) {
            txt = a.kmRemaining <= 0
                ? `¡Vencido hace ${Math.abs(Math.round(a.kmRemaining)).toLocaleString('es-ES')} km!`
                : `Faltan ${Math.round(a.kmRemaining).toLocaleString('es-ES')} km`;
        } else {
            txt = a.days < 0 ? `Vencido hace ${Math.abs(a.days)}d` : a.days === 0 ? 'Vence HOY' : `Faltan ${a.days} días`;
        }
        const isExpired = a.isKm ? a.kmRemaining <= 0 : a.days <= 0;
        return `<div class="alert-item alert-${a.type}">
      <span class="alert-icon" aria-hidden="true">${isExpired ? '🚨' : '⚠️'}</span>
      <span class="alert-msg"><strong>ALERTA${a.isKm ? ' KM' : ' DE PROXIMIDAD'}:</strong> ${a.message}</span>
    </div>`;
    }).join('')
    + (hiddenCount > 0 ? `<div class="alert-item alert-warning" style="cursor:pointer;" onclick="window.location.hash='#/alerts'">ℹ️ Ver ${hiddenCount} alerta${hiddenCount > 1 ? 's' : ''} más →</div>` : '');

    if (typeof updateGlobalAlertBadge === 'function') updateGlobalAlertBadge();
}

/* ─── ESTADO DE SALUD DEL VEHÍCULO ─────────────────────── */
function getVehicleHealth(vehicleId) {
    const dateAlerts = collectAlerts(vehicleId);
    const kmAlerts   = collectKmAlerts(vehicleId);
    if (!dateAlerts.length && !kmAlerts.length) return 'ok';
    if (dateAlerts.some(a => a.type === 'danger' || a.days < 0) || kmAlerts.some(a => a.type === 'danger')) return 'danger';
    return 'warn';
}

/* ─── ALERTAS GLOBALES (todos los vehículos) ────────────── */
function collectAllGlobalAlerts(threshold = 30) {
    const { vehicles } = getState();
    const allAlerts = [];
    vehicles.forEach(v => {
        const vLabel = `${v.icono || '🚗'} ${v.marca}`;

        collectAlerts(v.id, threshold).forEach(a => {
            allAlerts.push({ ...a, vehicleId: v.id, vehicleName: vLabel });
        });

        collectKmAlerts(v.id).forEach(a => {
            allAlerts.push({
                ...a,
                // Para ordenar junto con dateAlerts, asignamos un days sintético
                days: a.kmRemaining <= 0 ? -1 : 999,
                vehicleId: v.id,
                vehicleName: vLabel
            });
        });
    });
    return allAlerts.sort((a, b) => a.days - b.days);
}
