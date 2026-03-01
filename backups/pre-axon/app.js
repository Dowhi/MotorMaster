/* ===== APP.JS — MotorMaster SPA Router + All Module Views ===== */

/* ---- HELPERS ---- */
const fmt = {
  currency: v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0),
  date: s => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); },
  km: v => v ? Number(v).toLocaleString('es-ES') + ' km' : '—',
  today: () => new Date().toISOString().split('T')[0],
};

function daysBadge(dateStr) {
  const d = getDaysUntil(dateStr);
  if (d === null) return '<span class="badge badge-neutral">—</span>';
  if (d < 0) return `<span class="badge badge-danger">Vencida</span>`;
  if (d === 0) return `<span class="badge badge-danger">HOY</span>`;
  if (d <= 7) return `<span class="badge badge-danger">${d}d</span>`;
  if (d <= 15) return `<span class="badge badge-warning">${d}d</span>`;
  if (d <= 30) return `<span class="badge badge-info">${d}d</span>`;
  return `<span class="badge badge-success">${d}d</span>`;
}
function priorityBadge(p) {
  const m = { 'Alta': 'pri-high', 'Media': 'pri-mid', 'Baja': 'pri-low' };
  return `<span class="priority-tag ${m[p] || 'pri-low'}">${p || 'Baja'}</span>`;
}
function printInvoice() {
  window.print();
}
function stateBadge(s) {
  const m = { 'Pagada': 'badge-success', 'Apto': 'badge-success', 'Completado': 'badge-success', 'Pendiente': 'badge-danger', 'No Apto': 'badge-danger', 'Apto con Defectos': 'badge-warning', 'Programado': 'badge-info' };
  return `<span class="badge ${m[s] || 'badge-neutral'}">${s || '—'}</span>`;
}
const noVehicle = title => `<div class="page-header"><h1 class="page-title">${title}</h1></div>
  <div class="empty-state"><div class="empty-icon">🚗</div><h2>Sin vehículo activo</h2><p>Ve al Garaje para añadir o seleccionar un vehículo.</p><a href="#/garage" class="btn btn-primary">Ir al Garaje</a></div>`;
const emptySection = (icon, msg) => `<div class="empty-state"><div class="empty-icon">${icon}</div><h2>${msg}</h2><p>Pulsa el botón de arriba para añadir el primer registro.</p></div>`;

/* ---- TOAST ---- */
let _toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = '✓  ' + msg;
  t.classList.remove('hiding');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.classList.add('hiding'); }, 2500);
}

/* ---- MODAL ---- */
function openModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

/* ---- INVOICE HELPER ---- */
function setupInvoiceLogic() {
  const container = document.getElementById('invoice-body');
  const addBtn = document.getElementById('btn-add-concept');
  if (!container || !addBtn) return;

  const updateTotals = () => {
    let subtotal = 0;
    container.querySelectorAll('tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.inv-qty').value) || 0;
      const price = parseFloat(tr.querySelector('.inv-price').value) || 0;
      const dto = parseFloat(tr.querySelector('.inv-dto').value) || 0;
      const total = (qty * price) * (1 - dto / 100);
      tr.querySelector('.col-total').textContent = fmt.currency(total);
      subtotal += total;
    });
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    document.getElementById('inv-sub').textContent = fmt.currency(subtotal);
    document.getElementById('inv-iva').textContent = fmt.currency(iva);
    document.getElementById('inv-total-text').textContent = fmt.currency(total);
    const mainCostInput = document.getElementById('rf-coste') || document.getElementById('af-coste');
    if (mainCostInput) mainCostInput.value = total.toFixed(2);
  };

  const addLine = () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="inv-ref" placeholder="Ref..."></td>
      <td><input class="inv-desc" placeholder="Descripción..."></td>
      <td class="col-qty"><input type="number" class="inv-qty" value="1" step="0.1" min="0"></td>
      <td class="col-price"><input type="number" class="inv-price" value="0" step="0.01" min="0"></td>
      <td class="col-dto"><input type="number" class="inv-dto" value="0" min="0" max="100"></td>
      <td class="col-total">0,00 €</td>
      <td><button class="btn-del-line" style="background:none; border:none; color:var(--clr-danger); cursor:pointer; font-size:1.2rem">×</button></td>
    `;
    container.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.oninput = updateTotals);
    tr.querySelector('.btn-del-line').onclick = () => { tr.remove(); updateTotals(); };
    updateTotals();
  };

  addBtn.onclick = addLine;
  addLine();
}

/* ---- ROUTER ---- */
const ROUTES = {
  '': renderDashboard,
  'garage': renderGarage,
  'revisiones': renderRevisiones,
  'averias': renderAverias,
  'recambios': renderRecambios,
  'calendar': renderCalendar,
  'timeline': renderTimeline,
  'guantera': renderGuantera,
  'itv': renderITV,
  'seguro': renderSeguro,
  'multas': renderMultas,
  'otros': renderOtros,
  'settings': renderSettings
};
function getRoute() { return (window.location.hash || '').replace('#/', '').replace('#', ''); }

function router() {
  const route = getRoute();
  const fn = ROUTES[route] || renderDashboard;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.route === route));
  renderVehicleSelector();
  renderAlertBanner(getActiveVehicle()?.id);
  fn();
}

/* ---- VEHICLE SELECTOR ---- */
function renderVehicleSelector() {
  const { vehicles, activeVehicleId } = getState();
  const el = document.getElementById('vehicle-selector');
  if (!el) return;
  if (!vehicles.length) {
    el.innerHTML = `
      <div class="vehicle-selector-empty">
        <p>Sin vehículo</p>
        <button class="btn btn-primary btn-sm" id="btn-side-add">+ Añadir</button>
      </div>`;
    document.getElementById('btn-side-add').onclick = () => {
      window.location.hash = '#/garage';
      setTimeout(() => {
        const btn = document.getElementById('btn-add-veh');
        if (btn) btn.click();
      }, 100);
    };
    return;
  }
  const active = vehicles.find(v => v.id === activeVehicleId);
  el.innerHTML = `
    <div class="vehicle-chip" id="vsel-chip">
      <span class="vehicle-emoji">${active?.icono || '🚗'}</span>
      <div class="vehicle-chip-info">
        <span class="vehicle-name">${active ? active.marca + ' ' + active.modelo : 'Seleccionar'}</span>
        <span class="vehicle-sub">${active ? active.año + (active.matricula ? ' · ' + active.matricula : '') : ''}</span>
      </div>
      <span class="status-dot status-${active ? getVehicleHealth(active.id) : 'ok'}"></span>
      <span class="vehicle-chevron">▾</span>
    </div>
    <div class="vehicle-dropdown hidden" id="vsel-drop">
      ${vehicles.map(v => `<div class="vehicle-option${v.id === activeVehicleId ? ' active' : ''}" data-vid="${v.id}">
        <span>${v.icono || '🚗'}</span> ${v.marca} ${v.modelo}
        <span class="status-dot status-${getVehicleHealth(v.id)}" style="margin-left:auto"></span>
      </div>`).join('')}
      <div class="vehicle-option vehicle-option-add"><a href="#/garage">+ Añadir vehículo</a></div>
    </div>`;
  document.getElementById('vsel-chip').onclick = () => document.getElementById('vsel-drop').classList.toggle('hidden');
  el.querySelectorAll('[data-vid]').forEach(o => o.onclick = () => { setActiveVehicle(o.dataset.vid); router(); });
}

/* ======================== DASHBOARD ======================== */
function renderDashboard() {
  const content = document.getElementById('main-content');
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    content.innerHTML = `<div class="page-header"><h1 class="page-title">Dashboard</h1></div>
      <div class="empty-state">
        <div class="empty-icon">🔧</div>
        <h2>Bienvenido a MotorMaster</h2>
        <p>Añade tu primer vehículo para empezar a gestionar su mantenimiento.</p>
        <button class="btn btn-primary" id="btn-dash-add">+ Añadir vehículo</button>
      </div>`;
    document.getElementById('btn-dash-add').onclick = () => {
      window.location.hash = '#/garage';
      setTimeout(() => {
        const btn = document.getElementById('btn-add-veh');
        if (btn) btn.click();
      }, 100);
    };
    return;
  }
  const vid = vehicle.id;
  const revs = getRevisionesByVehicle(vid);
  const aves = getAveriasByVehicle(vid);
  const recs = getRecambiosByVehicle(vid);
  const multas = getMultasByVehicle(vid);
  const pending = multas.filter(m => m.estado === 'Pendiente');
  const alerts = collectAlerts(vid);

  // Upcoming items (≤30d)
  const upcoming = [];
  revs.filter(r => r.proximaFecha).forEach(r => { const d = getDaysUntil(r.proximaFecha); if (d !== null && d <= 30) upcoming.push({ label: 'Revisión: ' + r.operacion, date: r.proximaFecha, days: d }); });
  getITVByVehicle(vid).filter(i => i.fechaVencimiento).forEach(i => { const d = getDaysUntil(i.fechaVencimiento); if (d !== null && d <= 30) upcoming.push({ label: 'ITV vence', date: i.fechaVencimiento, days: d }); });
  getSeguroByVehicle(vid).filter(s => s.fechaRenovacion).forEach(s => { const d = getDaysUntil(s.fechaRenovacion); if (d !== null && d <= 30) upcoming.push({ label: 'Seguro: ' + s.compania, date: s.fechaRenovacion, days: d }); });
  upcoming.sort((a, b) => a.days - b.days);

  // Cost breakdown
  const cats = [
    { label: 'Revisiones', icon: '🔩', col: 'revisiones', f: 'coste' },
    { label: 'Averías', icon: '⚠️', col: 'averias', f: 'coste' },
    { label: 'Recambios', icon: '📦', col: 'recambios', f: 'precio' },
    { label: 'Seguros', icon: '🛡️', col: 'seguro', f: 'precioAnual' },
    { label: 'Multas', icon: '📋', col: 'multas', f: 'importe', filter: m => m.estado === 'Pagada' },
    { label: 'Otros', icon: '📁', col: 'otros', f: 'importe' },
  ];
  const state = getState();
  const totalGasto = cats.reduce((sum, c) => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)));
    return sum + items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
  }, 0);
  const costRows = cats.map(c => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)));
    const total = items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
    const pct = totalGasto > 0 ? (total / totalGasto * 100).toFixed(1) : 0;
    return `<div class="cost-row">
      <div class="cost-label">${c.icon} ${c.label}</div>
      <div class="cost-bar-wrap"><div class="cost-bar" style="width:${pct}%"></div></div>
      <div class="cost-value">${fmt.currency(total)}</div>
    </div>`;
  }).join('');

  // Year Filter Logic
  const currentYear = new Date().getFullYear();
  const availableYears = [...new Set([
    ...revs.map(r => r.fecha.split('-')[0]),
    ...aves.map(a => a.fecha.split('-')[0]),
    currentYear.toString()
  ])].sort((a, b) => b - a);

  const filterYear = document.getElementById('dash-year-filter')?.value || currentYear.toString();

  const totalGastoYear = cats.reduce((sum, c) => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)) && (r.fecha || r.fechaVencimiento || r.fechaRenovacion || '').startsWith(filterYear));
    return sum + items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
  }, 0);

  const costRowsYear = cats.map(c => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)) && (r.fecha || r.fechaVencimiento || r.fechaRenovacion || '').startsWith(filterYear));
    const total = items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
    const pct = totalGastoYear > 0 ? (total / totalGastoYear * 100).toFixed(1) : 0;
    return `<div class="cost-row">
      <div class="cost-label">${c.icon} ${c.label}</div>
      <div class="cost-bar-wrap"><div class="cost-bar" style="width:${pct}%"></div></div>
      <div class="cost-value">${fmt.currency(total)}</div>
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Dashboard</h1></div>
      <div style="display:flex; gap:10px">
        <select id="dash-year-filter" class="form-input" style="width:auto; padding:5px 10px">${availableYears.map(y => `<option value="${y}" ${y === filterYear ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" onclick="toggleWorkshopMode()">🔧 Modo Taller</button>
      </div>
    </div>
    <div class="vehicle-hero">
      <div class="vehicle-hero-left">
        <div class="vehicle-hero-name">${vehicle.marca} ${vehicle.modelo}</div>
        <div class="vehicle-hero-sub">${vehicle.año}${vehicle.matricula ? ' &nbsp;·&nbsp; ' + vehicle.matricula : ''}</div>
        <div class="vehicle-hero-km"><span class="km-label">Kilometraje actual</span><span class="km-value">${fmt.km(vehicle.km)}</span></div>
      </div>
      <div class="vehicle-hero-right">
        <div class="hero-stat"><div class="hero-stat-value gasto">${fmt.currency(vehicle.gastoTotal)}</div><div class="hero-stat-label">Gasto Acumulado Total</div></div>
      </div>
    </div>
    <div class="summary-grid">
      <div class="card summary-card"><div class="summary-icon">🔩</div><div class="summary-data"><div class="summary-value">${revs.length}</div><div class="summary-label">Revisiones</div></div></div>
      <div class="card summary-card"><div class="summary-icon">⚠️</div><div class="summary-data"><div class="summary-value">${aves.length}</div><div class="summary-label">Averías</div></div></div>
      <div class="card summary-card"><div class="summary-icon">📦</div><div class="summary-data"><div class="summary-value">${recs.length}</div><div class="summary-label">Recambios</div></div></div>
      <div class="card summary-card${pending.length ? ' card-warning' : ''}"><div class="summary-icon">📋</div><div class="summary-data"><div class="summary-value${pending.length ? ' text-warning' : ''}">${pending.length}</div><div class="summary-label">Multas Pend.</div></div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header"><span>🔔 Alertas Activas</span><span class="badge ${alerts.length ? 'badge-danger' : 'badge-success'}">${alerts.length || 'OK'}</span></div>
        <div class="card-body">
          ${alerts.length ? alerts.map(a => `<div class="alert-row alert-row-${a.type}"><span>${a.days <= 0 ? '🚨' : '⚠️'} ${a.message}</span><span class="alert-days">${a.days < 0 ? `Venc. ${Math.abs(a.days)}d` : a.days === 0 ? 'HOY' : a.days + 'd'}</span></div>`).join('') : '<div class="empty-mini">Sin alertas activas 🎉</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span>📅 Próximos Eventos (30d)</span></div>
        <div class="card-body">
          ${upcoming.length ? upcoming.slice(0, 6).map(u => `<div class="upcoming-row"><div><div class="upcoming-label">${u.label}</div><div class="upcoming-date">${fmt.date(u.date)}</div></div>${daysBadge(u.date)}</div>`).join('') : '<div class="empty-mini">Sin eventos próximos</div>'}
        </div>
      </div>
    </div>
    <div class="card"><div class="card-header"><span>💶 Desglose de Gastos Año ${filterYear}</span><span class="gasto">${fmt.currency(totalGastoYear)}</span></div><div class="card-body cost-breakdown">${costRowsYear}</div></div>`;

  document.getElementById('dash-year-filter').onchange = renderDashboard;
}

/* ======================== GARAJE ======================== */
function renderGarage() {
  const { vehicles, activeVehicleId } = getState();
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="page-header"><h1 class="page-title">Garaje</h1><button class="btn btn-primary" id="btn-add-veh">+ Nuevo Vehículo</button></div>
    ${!vehicles.length ? emptySection('🚗', 'Tu garaje está vacío') : `
    <div class="vehicles-grid">${vehicles.map(v => `
      <div class="card vehicle-card${v.id === activeVehicleId ? ' vehicle-card-active' : ''}">
        <div class="vehicle-card-header">
          <div class="vehicle-card-name">${v.icono || '🚗'} ${v.marca} ${v.modelo}</div>
          <span class="status-dot status-${getVehicleHealth(v.id)}" title="Estado de salud"></span>
        </div>
        <div class="vehicle-card-details">
          <div class="detail-row"><span>Año</span><span>${v.año}</span></div>
          <div class="detail-row"><span>Matrícula</span><span>${v.matricula || '—'}</span></div>
          <div class="detail-row"><span>Kilometraje</span><span>${fmt.km(v.km)}</span></div>
          <div class="detail-row"><span>Última revisión</span><span>${fmt.date(v.ultimaRevision)}</span></div>
          <div class="detail-row gasto-row"><span>Gasto Total</span><span class="gasto">${fmt.currency(v.gastoTotal)}</span></div>
        </div>
        <div class="vehicle-card-actions">
          ${v.id !== activeVehicleId ? `<button class="btn btn-secondary btn-sm" data-sel="${v.id}">Seleccionar</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-km="${v.id}">✏️ KM</button>
          <button class="btn btn-danger btn-sm" data-del="${v.id}">✕</button>
        </div>
      </div>`).join('')}
    </div>`}`;

  document.getElementById('btn-add-veh').onclick = () => {
    openModal('Nuevo Vehículo', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Marca *</label><input id="veh-marca" class="form-input" placeholder="Toyota"></div>
        <div class="form-group"><label>Modelo *</label><input id="veh-modelo" class="form-input" placeholder="Corolla"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Año *</label><input id="veh-año" type="number" class="form-input" placeholder="2020" min="1900" max="2030"></div>
        <div class="form-group"><label>Matrícula</label><input id="veh-mat" class="form-input" placeholder="1234 ABC"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Kilometraje actual *</label><input id="veh-km" type="number" class="form-input" placeholder="45000" min="0"></div>
        <div class="form-group"><label>Icono</label>
          <select id="veh-icon" class="form-input">
            <option value="🚗">Turismo (🚗)</option>
            <option value="🚙">SUV / 4x4 (🚙)</option>
            <option value="🚐">Furgoneta (🚐)</option>
            <option value="🏍️">Moto (🏍️)</option>
            <option value="🏎️">Deportivo (🏎️)</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Última revisión conocida</label><input id="veh-ulrev" type="date" class="form-input"></div>
      <div class="form-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-veh">Registrar Vehículo</button>
      </div></div>`);
    document.getElementById('btn-save-veh').onclick = () => {
      const marca = document.getElementById('veh-marca').value.trim();
      const modelo = document.getElementById('veh-modelo').value.trim();
      const año = document.getElementById('veh-año').value;
      const km = document.getElementById('veh-km').value;
      const icono = document.getElementById('veh-icon').value;
      if (!marca || !modelo || !año || !km) { alert('Completa los campos obligatorios (*)'); return; }
      addVehicle({ marca, modelo, año: parseInt(año), km: parseInt(km), matricula: document.getElementById('veh-mat').value.trim(), ultimaRevision: document.getElementById('veh-ulrev').value, icono });
      closeModal(); renderVehicleSelector(); router(); showToast('Vehículo añadido');
    };
  };
  content.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { setActiveVehicle(b.dataset.sel); router(); });
  content.querySelectorAll('[data-km]').forEach(b => b.onclick = () => {
    const v = getState().vehicles.find(v => v.id === b.dataset.km);
    openModal('Actualizar Kilometraje', `<div class="form">
      <div class="form-group"><label>Kilometraje actual (km)</label><input id="km-val" type="number" class="form-input" value="${v?.km || 0}" min="0"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-km">Guardar</button></div></div>`);
    document.getElementById('btn-save-km').onclick = () => { updateVehicleKm(b.dataset.km, parseInt(document.getElementById('km-val').value)); closeModal(); renderGarage(); showToast('Kilometraje actualizado'); };
  });
  content.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (!confirm('¿Eliminar este vehículo y todos sus registros? Esta acción no se puede deshacer.')) return;
    const id = b.dataset.del; const s = getState();
    s.vehicles = s.vehicles.filter(v => v.id !== id);
    ['revisiones', 'averias', 'recambios', 'itv', 'seguro', 'multas', 'otros'].forEach(c => { s[c] = s[c].filter(r => r.vehicleId !== id); });
    if (s.activeVehicleId === id) s.activeVehicleId = s.vehicles[0]?.id || null;
    saveState(); router(); showToast('Vehículo eliminado');
  });
}

/* ======================== REVISIONES ======================== */
function renderRevisiones() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Revisiones'); return; }
  const items = getRevisionesByVehicle(v.id);
  const total = items.reduce((s, r) => s + parseFloat(r.coste || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Revisiones</h1><p class="page-sub">Mantenimiento Preventivo</p></div>
      <button class="btn btn-primary" id="btn-add-rev">+ Añadir Revisión</button></div>
    ${!items.length ? emptySection('🔩', 'Sin revisiones registradas') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Fecha</th><th>Prioridad</th><th>Operación</th><th>Km</th><th>Coste</th><th>Próxima</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(r => `<tr>
        <td data-label="ID"><code class="id-code">${r.id}</code></td>
        <td data-label="Fecha">${fmt.date(r.fecha)}</td>
        <td data-label="Prioridad">${priorityBadge(r.prioridad)}</td>
        <td data-label="Operación"><strong>${r.operacion}</strong>${r.notas ? `<br><small class="text-muted">${r.notas}</small>` : ''}</td>
        <td data-label="Km">${fmt.km(r.km)}</td>
        <td data-label="Coste" class="gasto">${fmt.currency(r.coste)}</td>
        <td data-label="Próxima">${fmt.date(r.proximaFecha)}</td>
        <td data-label="Estado">${daysBadge(r.proximaFecha)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="revisiones" data-id="${r.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Revisiones</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;
  document.getElementById('btn-add-rev').onclick = () => {
    openModal('Nueva Revisión / Factura', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Operación Principal *</label><input id="rf-oper" class="form-input" placeholder="Ej: Cambio aceite"></div>
        <div class="form-group"><label>Km actuales *</label><input id="rf-km" type="number" class="form-input" value="${v.km}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha *</label><input id="rf-fecha" type="date" class="form-input" value="${fmt.today()}"></div>
        <div class="form-group"><label>Prioridad</label><select id="rf-pri" class="form-input"><option>Baja</option><option>Media</option><option>Alta</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Próxima Revisión (Fecha)</label><input id="rf-prox-f" type="date" class="form-input"></div>
        <div class="form-group"><label>Coste Final (€)</label><input id="rf-coste" type="number" class="form-input" readonly></div>
      </div>
      
      <!-- Invoice concepts -->
      <div class="invoice-items-wrap">
        <table class="invoice-table">
          <thead><tr><th>Ref</th><th>Descripción</th><th class="col-qty">Cant.</th><th class="col-price">Precio</th><th class="col-dto">Dto%</th><th class="col-total">Importe</th><th></th></tr></thead>
          <tbody id="invoice-body"></tbody>
        </table>
        <div class="invoice-footer">
          <button class="btn btn-ghost btn-sm" id="btn-add-concept">+ Añadir Concepto</button>
          <div class="invoice-totals">
            <div class="total-line"><span>Subtotal:</span><span id="inv-sub">0,00 €</span></div>
            <div class="total-line"><span>I.V.A. (21%):</span><span id="inv-iva">0,00 €</span></div>
            <div class="total-line total-final"><span>TOTAL:</span><span id="inv-total-text">0,00 €</span></div>
          </div>
        </div>
      </div>

      <div class="form-group"><label>Notas</label><textarea id="rf-notas" class="form-input form-textarea" placeholder="Observaciones adicionales..."></textarea></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-rev">Registrar</button></div>
    </div>`);
    setupInvoiceLogic();
    document.getElementById('btn-save-rev').onclick = () => {
      const fecha = document.getElementById('rf-fecha').value;
      const oper = document.getElementById('rf-oper').value.trim();
      const coste = document.getElementById('rf-coste').value;
      if (!fecha || !oper || coste === '') { alert('Completa los campos obligatorios (*)'); return; }
      const km = document.getElementById('rf-km').value;
      addRevision({ operacion: oper, km: parseFloat(km), fecha, coste: parseFloat(coste), proximaFecha: document.getElementById('rf-prox-f').value, prioridad: document.getElementById('rf-pri').value, notas: document.getElementById('rf-notas').value.trim() });
      updateVehicleKm(v.id, parseFloat(km));
      closeModal(); renderRevisiones(); renderAlertBanner(v.id); showToast('Revisión registrada — Gasto actualizado');
    };
  };
  setupDeleteBtns(renderRevisiones);
}

/* ======================== AVERIAS ======================== */
function renderAverias() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Averías'); return; }
  const items = getAveriasByVehicle(v.id);
  const total = items.reduce((s, a) => s + parseFloat(a.coste || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Averías</h1><p class="page-sub">Mantenimiento Correctivo</p></div>
      <button class="btn btn-primary" id="btn-add-ave">+ Nueva Avería</button></div>
    ${!items.length ? emptySection('⚠️', 'Sin averías registradas') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Fecha</th><th>Prioridad</th><th>Síntomas</th><th>Diagnóstico</th><th>Solución</th><th>Coste</th><th></th></tr></thead>
      <tbody>${items.map(a => `<tr>
        <td data-label="ID"><code class="id-code">${a.id}</code></td>
        <td data-label="Fecha">${fmt.date(a.fecha)}</td>
        <td data-label="Prioridad">${priorityBadge(a.prioridad)}</td>
        <td data-label="Síntomas">${a.sintomas}</td><td data-label="Diagnóstico">${a.diagnostico || '—'}</td><td data-label="Solución">${a.solucion || '—'}</td>
        <td data-label="Coste" class="gasto">${fmt.currency(a.coste)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="averias" data-id="${a.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Averías</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;
  document.getElementById('btn-add-ave').onclick = () => {
    openModal('Nueva Avería', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Síntomas / Avería *</label><input id="af-sint" class="form-input" placeholder="Ej: Ruido al frenar"></div>
        <div class="form-group"><label>Fecha *</label><input id="af-fecha" type="date" class="form-input" value="${fmt.today()}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Prioridad</label><select id="af-pri" class="form-input"><option>Baja</option><option>Media</option><option>Alta</option></select></div>
        <div class="form-group"><label>Coste Final (€)</label><input id="af-coste" type="number" class="form-input" readonly></div>
      </div>
      
      <!-- Invoice concepts -->
      <div class="invoice-items-wrap">
        <table class="invoice-table">
          <thead><tr><th>Ref</th><th>Descripción</th><th class="col-qty">Cant.</th><th class="col-price">Precio</th><th class="col-dto">Dto%</th><th class="col-total">Importe</th><th></th></tr></thead>
          <tbody id="invoice-body"></tbody>
        </table>
        <div class="invoice-footer">
          <button class="btn btn-ghost btn-sm" id="btn-add-concept">+ Añadir Concepto</button>
          <div class="invoice-totals">
            <div class="total-line"><span>Subtotal:</span><span id="inv-sub">0,00 €</span></div>
            <div class="total-line"><span>I.V.A. (21%):</span><span id="inv-iva">0,00 €</span></div>
            <div class="total-line total-final"><span>TOTAL:</span><span id="inv-total-text">0,00 €</span></div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group"><label>Diagnóstico</label><input id="af-diag" class="form-input" placeholder="Causa del problema"></div>
        <div class="form-group"><label>Solución / Reparación</label><input id="af-sol" class="form-input" placeholder="Qué se ha reparado"></div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-ave">Registrar</button></div>
    </div>`);
    setupInvoiceLogic();
    document.getElementById('btn-save-ave').onclick = () => {
      const fecha = document.getElementById('af-fecha').value;
      const sint = document.getElementById('af-sint').value.trim();
      const coste = document.getElementById('af-coste').value;
      if (!fecha || !sint || coste === '') { alert('Completa los campos obligatorios (*)'); return; }
      addAveria({
        sintomas: sint,
        fecha,
        coste: parseFloat(coste),
        diagnostico: document.getElementById('af-diag').value.trim(),
        solucion: document.getElementById('af-sol').value.trim(),
        prioridad: document.getElementById('af-pri').value
      });
      closeModal(); renderAverias(); showToast('Avería registrada — Gasto actualizado');
    };
  };
  setupDeleteBtns(renderAverias);
}

/* ======================== RECAMBIOS ======================== */
function renderRecambios() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Recambios'); return; }
  const items = getRecambiosByVehicle(v.id);
  const total = items.reduce((s, r) => s + parseFloat(r.precio || 0), 0);
  const revOpts = getRevisionesByVehicle(v.id);
  const aveOpts = getAveriasByVehicle(v.id);
  function linkedLabel(r) {
    if (!r.linkedTo) return '—';
    if (r.linkedTo.type === 'revision') { const rv = revOpts.find(x => x.id === r.linkedTo.id); return rv ? `<span class="badge badge-info">Rev: ${rv.operacion}</span>` : 'Rev: Desconocida'; }
    if (r.linkedTo.type === 'averia') { const av = aveOpts.find(x => x.id === r.linkedTo.id); return av ? `<span class="badge badge-warning">Ave: ${fmt.date(av.fecha)}</span>` : 'Ave: Desconocida'; }
    return '—';
  }
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Recambios</h1><p class="page-sub">Inventario de Piezas</p></div>
      <button class="btn btn-primary" id="btn-add-rec">+ Añadir Recambio</button></div>
    ${!items.length ? emptySection('📦', 'Sin recambios registrados') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Pieza</th><th>Marca / Ref.</th><th>Tienda</th><th>Precio</th><th>Vinculado a</th><th></th></tr></thead>
      <tbody>${items.map(r => `<tr>
        <td data-label="ID"><code class="id-code">${r.id}</code></td>
        <td data-label="Pieza"><strong>${r.nombre}</strong></td>
        <td data-label="Marca / Ref.">${r.marca || '—'}<br><small class="text-muted">${r.referencia || ''}</small></td>
        <td data-label="Tienda">${r.tienda || '—'}</td>
        <td data-label="Precio" class="gasto">${fmt.currency(r.precio)}</td>
        <td data-label="Vinculado">${linkedLabel(r)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="recambios" data-id="${r.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Recambios</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;
  document.getElementById('btn-add-rec').onclick = () => {
    const linkOpts = [
      '<option value="">Sin vínculo</option>',
      ...revOpts.map(r => `<option value="revision|${r.id}">Revisión: ${r.operacion} (${fmt.date(r.fecha)})</option>`),
      ...aveOpts.map(a => `<option value="averia|${a.id}">Avería: ${fmt.date(a.fecha)} — ${a.sintomas.substring(0, 30)}</option>`)
    ].join('');
    openModal('Nuevo Recambio / Factura', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Tienda / Proveedor *</label><input id="rr-tienda" class="form-input" placeholder="Ej: Amazon, Oscaro, Taller Pepe"></div>
        <div class="form-group"><label>Coste Final (€)</label><input id="rr-precio" type="number" class="form-input" readonly></div>
      </div>
      <div class="form-group"><label>Vincular a</label><select id="rr-link" class="form-input">${linkOpts}</select></div>

      <!-- Invoice concepts -->
      <div class="invoice-items-wrap">
        <table class="invoice-table">
          <thead><tr><th>Ref</th><th>Descripción</th><th class="col-qty">Cant.</th><th class="col-price">Precio</th><th class="col-dto">Dto%</th><th class="col-total">Importe</th><th></th></tr></thead>
          <tbody id="invoice-body"></tbody>
        </table>
        <div class="invoice-footer">
          <button class="btn btn-ghost btn-sm" id="btn-add-concept">+ Añadir Concepto</button>
          <div class="invoice-totals">
            <div class="total-line"><span>Subtotal:</span><span id="inv-sub">0,00 €</span></div>
            <div class="total-line"><span>I.V.A. (21%):</span><span id="inv-iva">0,00 €</span></div>
            <div class="total-line total-final"><span>TOTAL:</span><span id="inv-total-text">0,00 €</span></div>
          </div>
        </div>
      </div>

      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-rec">Registrar</button></div>
    </div>`);
    setupInvoiceLogic();
    document.getElementById('btn-save-rec').onclick = () => {
      const tienda = document.getElementById('rr-tienda').value.trim();
      const rows = document.getElementById('invoice-body').querySelectorAll('tr');
      if (!tienda || !rows.length) { alert('Completa la tienda y añade al menos un concepto'); return; }

      const lv = document.getElementById('rr-link').value;
      const linkedTo = lv ? { type: lv.split('|')[0], id: lv.split('|')[1] } : null;

      rows.forEach(tr => {
        const ref = tr.querySelector('.inv-ref').value.trim();
        const desc = tr.querySelector('.inv-desc').value.trim();
        if (!desc) return;
        const q = parseFloat(tr.querySelector('.inv-qty').value) || 0;
        const p = parseFloat(tr.querySelector('.inv-price').value) || 0;
        const d = parseFloat(tr.querySelector('.inv-dto').value) || 0;
        // Precio con IVA para el registro individual
        const totalConIva = (q * p) * (1 - d / 100) * 1.21;

        addRecambio({
          nombre: desc,
          referencia: ref,
          tienda: tienda,
          precio: totalConIva,
          linkedTo
        });
      });

      closeModal(); renderRecambios(); showToast('Factura registrada — Conceptos añadidos');
    };
  };
  setupDeleteBtns(renderRecambios);
}

/* ======================== ITV ======================== */
function renderITV() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('ITV'); return; }
  const items = getITVByVehicle(v.id);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">ITV</h1><p class="page-sub">Inspección Técnica de Vehículos</p></div>
      <button class="btn btn-primary" id="btn-add-itv">+ Registrar ITV</button></div>
    ${!items.length ? emptySection('🔍', 'Sin registros de ITV') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Fecha Inspección</th><th>Resultado</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(i => `<tr>
        <td data-label="ID"><code class="id-code">${i.id}</code></td>
        <td data-label="Fecha Insp.">${fmt.date(i.fechaInspeccion)}</td>
        <td data-label="Resultado">${stateBadge(i.resultado)}</td>
        <td data-label="Vencimiento">${fmt.date(i.fechaVencimiento)}</td>
        <td data-label="Estado">${daysBadge(i.fechaVencimiento)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="itv" data-id="${i.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`}`;
  document.getElementById('btn-add-itv').onclick = () => {
    openModal('Registrar ITV', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Fecha de inspección *</label><input id="itv-fecha" type="date" class="form-input" value="${fmt.today()}"></div>
        <div class="form-group"><label>Resultado *</label><select id="itv-res" class="form-input"><option>Apto</option><option>Apto con Defectos</option><option>No Apto</option></select></div>
      </div>
      <div class="form-group"><label>Fecha de vencimiento *</label><input id="itv-venc" type="date" class="form-input"></div>
      <div class="form-group"><label>Notas (centro, nº expediente...)</label><textarea id="itv-notas" class="form-input form-textarea" placeholder="Opcional"></textarea></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-itv">Registrar</button></div>
    </div>`);
    document.getElementById('btn-save-itv').onclick = () => {
      const fecha = document.getElementById('itv-fecha').value;
      const venc = document.getElementById('itv-venc').value;
      if (!fecha || !venc) { alert('Completa los campos obligatorios (*)'); return; }
      addITV({ fechaInspeccion: fecha, resultado: document.getElementById('itv-res').value, fechaVencimiento: venc, notas: document.getElementById('itv-notas').value.trim() });
      closeModal(); renderITV(); renderAlertBanner(v.id); showToast('ITV registrada correctamente');
    };
  };
  setupDeleteBtns(renderITV);
}

/* ======================== SEGURO ======================== */
function renderSeguro() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Seguro'); return; }
  const items = getSeguroByVehicle(v.id);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Seguro</h1><p class="page-sub">Gestión de Pólizas</p></div>
      <button class="btn btn-primary" id="btn-add-seg">+ Registrar Seguro</button></div>
    ${!items.length ? emptySection('🛡️', 'Sin registros de seguro') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Compañía</th><th>Tipo de Póliza</th><th>Precio Anual</th><th>Renovación</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(s => `<tr>
        <td data-label="ID"><code class="id-code">${s.id}</code></td>
        <td data-label="Compañía"><strong>${s.compania}</strong></td>
        <td data-label="Tipo">${s.tipo}</td>
        <td data-label="Precio" class="gasto">${fmt.currency(s.precioAnual)}</td>
        <td data-label="Renovación">${fmt.date(s.fechaRenovacion)}</td>
        <td data-label="Estado">${daysBadge(s.fechaRenovacion)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="seguro" data-id="${s.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`}`;
  document.getElementById('btn-add-seg').onclick = () => {
    openModal('Registrar Seguro', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Compañía *</label><input id="sg-comp" class="form-input" placeholder="Ej: Mapfre"></div>
        <div class="form-group"><label>Tipo de póliza *</label><select id="sg-tipo" class="form-input"><option>Todo Riesgo</option><option>Todo Riesgo con Franquicia</option><option>Terceros Ampliado</option><option>Terceros</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Precio anual (€) *</label><input id="sg-precio" type="number" class="form-input" placeholder="0.00" step="0.01" min="0"></div>
        <div class="form-group"><label>Fecha de renovación *</label><input id="sg-renov" type="date" class="form-input"></div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-seg">Registrar</button></div>
    </div>`);
    document.getElementById('btn-save-seg').onclick = () => {
      const comp = document.getElementById('sg-comp').value.trim();
      const precio = document.getElementById('sg-precio').value;
      const renov = document.getElementById('sg-renov').value;
      if (!comp || precio === '' || !renov) { alert('Completa los campos obligatorios (*)'); return; }
      addSeguro({ compania: comp, tipo: document.getElementById('sg-tipo').value, precioAnual: parseFloat(precio), fechaRenovacion: renov });
      closeModal(); renderSeguro(); renderAlertBanner(v.id); showToast('Seguro registrado — Gasto actualizado');
    };
  };
  setupDeleteBtns(renderSeguro);
}

/* ======================== MULTAS ======================== */
function renderMultas() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Multas'); return; }
  const items = getMultasByVehicle(v.id);
  const totalPag = items.filter(m => m.estado === 'Pagada').reduce((s, m) => s + parseFloat(m.importe || 0), 0);
  const totalPend = items.filter(m => m.estado === 'Pendiente').reduce((s, m) => s + parseFloat(m.importe || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Multas</h1><p class="page-sub">Sanciones y Penalizaciones</p></div>
      <button class="btn btn-primary" id="btn-add-mul">+ Registrar Multa</button></div>
    ${!items.length ? emptySection('📋', 'Sin multas registradas') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Motivo</th><th>Importe</th><th>Estado</th><th>Fecha Límite (descuento)</th><th>Acción</th><th></th></tr></thead>
      <tbody>${items.map(m => `<tr>
        <td data-label="ID"><code class="id-code">${m.id}</code></td>
        <td data-label="Motivo">${m.motivo}</td>
        <td data-label="Importe" class="${m.estado === 'Pagada' ? 'gasto' : 'text-warning'}">${fmt.currency(m.importe)}</td>
        <td data-label="Estado">${stateBadge(m.estado)}</td>
        <td data-label="Límite">${fmt.date(m.fechaLimite)}${m.estado === 'Pendiente' ? ' ' + daysBadge(m.fechaLimite) : ''}</td>
        <td data-label="Acción">${m.estado === 'Pendiente' ? `<button class="btn btn-secondary btn-sm" data-pay="${m.id}">✓ Marcar Pagada</button>` : '—'}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="multas" data-id="${m.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar">
      <span>Pagado: <strong class="gasto">${fmt.currency(totalPag)}</strong> &nbsp;|&nbsp; Pendiente: <strong style="color:var(--clr-warning)">${fmt.currency(totalPend)}</strong></span>
    </div>`}`;
  document.getElementById('btn-add-mul').onclick = () => {
    openModal('Registrar Multa', `<div class="form">
      <div class="form-group"><label>Motivo *</label><input id="ml-motivo" class="form-input" placeholder="Ej: Exceso de velocidad"></div>
      <div class="form-row">
        <div class="form-group"><label>Importe (€) *</label><input id="ml-importe" type="number" class="form-input" placeholder="0.00" step="0.01" min="0"></div>
        <div class="form-group"><label>Estado inicial *</label><select id="ml-estado" class="form-input"><option>Pendiente</option><option>Pagada</option></select></div>
      </div>
      <div class="form-group"><label>Fecha límite para descuento por pronto pago</label><input id="ml-limite" type="date" class="form-input"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-mul">Registrar</button></div>
    </div>`);
    document.getElementById('btn-save-mul').onclick = () => {
      const motivo = document.getElementById('ml-motivo').value.trim();
      const importe = document.getElementById('ml-importe').value;
      if (!motivo || importe === '') { alert('Completa los campos obligatorios (*)'); return; }
      addMulta({ motivo, importe: parseFloat(importe), estado: document.getElementById('ml-estado').value, fechaLimite: document.getElementById('ml-limite').value });
      closeModal(); renderMultas(); renderAlertBanner(v.id); showToast('Multa registrada');
    };
  };
  c.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => { updateMultaEstado(b.dataset.pay, 'Pagada'); renderMultas(); showToast('Multa marcada como pagada — Gasto actualizado'); });
  setupDeleteBtns(renderMultas);
}

/* ======================== OTROS ======================== */
function renderOtros() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Otros'); return; }
  const items = getOtrosByVehicle(v.id);
  const total = items.reduce((s, o) => s + parseFloat(o.importe || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Otros</h1><p class="page-sub">Impuestos y Permisos</p></div>
      <button class="btn btn-primary" id="btn-add-otro">+ Añadir Registro</button></div>
    ${!items.length ? emptySection('📁', 'Sin registros adicionales') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Descripción</th><th>Importe</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(o => `<tr>
        <td data-label="ID"><code class="id-code">${o.id}</code></td>
        <td data-label="Descripción"><strong>${o.descripcion}</strong></td>
        <td data-label="Importe" class="gasto">${fmt.currency(o.importe)}</td>
        <td data-label="Vencimiento">${fmt.date(o.fechaVencimiento)}</td>
        <td data-label="Estado">${daysBadge(o.fechaVencimiento)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="otros" data-id="${o.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Otros</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;
  document.getElementById('btn-add-otro').onclick = () => {
    openModal('Nuevo Registro', `<div class="form">
      <div class="form-group"><label>Descripción *</label><input id="ot-desc" class="form-input" placeholder="Ej: Impuesto de circulación"></div>
      <div class="form-row">
        <div class="form-group"><label>Importe (€) *</label><input id="ot-imp" type="number" class="form-input" placeholder="0.00" step="0.01" min="0"></div>
        <div class="form-group"><label>Fecha de vencimiento</label><input id="ot-venc" type="date" class="form-input"></div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-otro">Registrar</button></div>
    </div>`);
    document.getElementById('btn-save-otro').onclick = () => {
      const desc = document.getElementById('ot-desc').value.trim();
      const imp = document.getElementById('ot-imp').value;
      if (!desc || imp === '') { alert('Completa los campos obligatorios (*)'); return; }
      addOtro({ descripcion: desc, importe: parseFloat(imp), fechaVencimiento: document.getElementById('ot-venc').value });
      closeModal(); renderOtros(); renderAlertBanner(v.id); showToast('Registro añadido — Gasto actualizado');
    };
  };
  setupDeleteBtns(renderOtros);
}

/* ======================== GUANTERA DIGITAL ======================== */
function renderGuantera() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Guantera Digital'); return; }
  const items = getDocsByVehicle(v.id);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Guantera Digital</h1><p class="page-sub">Documentación y Vencimientos del Vehículo</p></div>
      <button class="btn btn-primary" id="btn-add-doc">+ Añadir Documento</button></div>
    ${!items.length ? emptySection('📁', 'Guantera vacía') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Documento</th><th>Referencia / Info</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
      <tbody>${items.map(d => `<tr>
        <td data-label="Documento"><strong>${d.tipo}</strong></td>
        <td data-label="Referencia">${d.referencia || '—'}</td>
        <td data-label="Vencimiento">${fmt.date(d.fechaVencimiento)}</td>
        <td data-label="Estado">${daysBadge(d.fechaVencimiento)}</td>
        <td><button class="btn btn-danger btn-xs" data-delete="documentos" data-id="${d.id}">✕</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`}`;
  document.getElementById('btn-add-doc').onclick = () => {
    openModal('Añadir Documento', `<div class="form">
      <div class="form-group"><label>Tipo de Documento *</label><select id="df-tipo" class="form-input"><option>Permiso de Circulación</option><option>Ficha Técnica</option><option>Carnet de Conducir (Dueño)</option><option>Recibo de Impuestos</option><option>Tarjeta de Asistencia</option><option>Otro</option></select></div>
      <div class="form-group"><label>Referencia / Nota</label><input id="df-ref" class="form-input" placeholder="Ej: Nº Póliza, Centro ITV..."></div>
      <div class="form-group"><label>Fecha de Vencimiento</label><input id="df-venc" type="date" class="form-input"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-doc">Guardar</button></div>
    </div>`);
    document.getElementById('btn-save-doc').onclick = () => {
      const tipo = document.getElementById('df-tipo').value;
      const venc = document.getElementById('df-venc').value;
      addDocumento({ tipo, referencia: document.getElementById('df-ref').value.trim(), fechaVencimiento: venc });
      closeModal(); renderGuantera(); renderAlertBanner(v.id); showToast('Documento guardado');
    };
  };
  setupDeleteBtns(renderGuantera);
}

/* ======================== AJUSTES & DATOS ======================== */
function renderSettings() {
  const c = document.getElementById('main-content');
  c.innerHTML = `
    <div class="page-header"><h1 class="page-title">Ajustes & Datos</h1></div>
    
    <div class="settings-section">
      <div class="settings-header">💾 Copia de Seguridad (JSON)</div>
      <p class="settings-desc">Descarga todos los datos de MotorMaster en un archivo. Puedes usar este archivo para restaurar tu información en otro dispositivo.</p>
      <div class="settings-actions">
        <button class="btn btn-primary" id="btn-export-json">Descargar Backup (.json)</button>
        <button class="btn btn-ghost" id="btn-trigger-import">Importar Backup</button>
        <input type="file" id="input-import" class="hidden" accept=".json">
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-header">📊 Exportar a Hojas de Cálculo (CSV)</div>
      <p class="settings-desc">Genera un archivo CSV compatible con Excel o Google Sheets para analizar tus gastos en detalle.</p>
      <div class="settings-actions">
        <button class="btn btn-secondary" id="btn-export-csv">Exportar a CSV para Sheets</button>
      </div>
    </div>

    <div class="settings-section" style="border-color:var(--clr-danger-dim)">
      <div class="settings-header" style="color:var(--clr-danger)">⚠️ Zona Peligrosa</div>
      <p class="settings-desc">Eliminar todos los datos guardados en el dispositivo. Esta acción es definitiva.</p>
      <button class="btn btn-danger" id="btn-wipe">Borrar Todos los Datos</button>
    </div>
  `;

  // Export JSON
  document.getElementById('btn-export-json').onclick = () => {
    const data = JSON.stringify(getState(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `motormaster_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Copia de seguridad generada');
  };

  // Import JSON
  document.getElementById('btn-trigger-import').onclick = () => document.getElementById('input-import').click();
  document.getElementById('input-import').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.activeVehicleId !== undefined && data.vehicles) {
          if (confirm('¿Importar datos? Los datos actuales serán reemplazados.')) {
            resetState(data);
            window.location.reload();
          }
        } else { alert('Archivo no válido para MotorMaster'); }
      } catch { alert('Error al leer el archivo'); }
    };
    reader.readAsText(file);
  };

  // Export CSV
  document.getElementById('btn-export-csv').onclick = () => {
    const s = getState();
    let csv = 'ID;Fecha;Vehiculo;Modulo;Concepto;Importe;Referencia\n';

    // Revisiones
    s.revisiones.forEach(r => {
      const v = s.vehicles.find(x => x.id === r.vehicleId);
      csv += `${r.id};${r.fecha};${v?.marca} ${v?.modelo};Revisiones;${r.operacion.replace(/;/g, ',')};${r.coste};—\n`;
    });
    // Averías
    s.averias.forEach(a => {
      const v = s.vehicles.find(x => x.id === a.vehicleId);
      csv += `${a.id};${a.fecha};${v?.marca} ${v?.modelo};Averias;${a.sintomas.replace(/;/g, ',')};${a.coste};—\n`;
    });
    // Recambios
    s.recambios.forEach(r => {
      const v = s.vehicles.find(x => x.id === r.vehicleId);
      csv += `${r.id};—;${v?.marca} ${v?.modelo};Recambios;${r.nombre.replace(/;/g, ',')};${r.precio};${r.referencia || '—'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `motormaster_export_full.csv`;
    a.click();
    showToast('Archivo CSV generado para Google Sheets');
  };

  // Wipe
  document.getElementById('btn-wipe').onclick = () => {
    if (confirm('¿ESTÁS SEGURO? Se borrarán todos tus coches y registros permanentemente.')) {
      resetState();
      window.location.reload();
    }
  };
}

/* ======================== CALENDARIO GLOBAL ======================== */
function renderCalendar() {
  const c = document.getElementById('main-content');
  const { vehicles } = getState();
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const allAlerts = [];
  vehicles.forEach(v => {
    collectAlerts(v.id).forEach(a => {
      const d = new Date(a.date + 'T00:00:00');
      allAlerts.push({ ...a, vName: `${v.icono || '🚗'} ${v.marca}`, month: d.getMonth(), day: d.getDate(), year: d.getFullYear() });
    });
  });

  const currentYear = new Date().getFullYear();
  let html = `<div class="page-header"><h1 class="page-title">Calendario Global ${currentYear}</h1></div><div class="calendar-grid">`;

  months.forEach((m, idx) => {
    const monthAlerts = allAlerts.filter(a => a.month === idx && a.year === currentYear).sort((a, b) => a.day - b.day);
    html += `<div class="cal-month">
      <div class="cal-month-name">${m}</div>
      <div class="cal-day-list">
        ${monthAlerts.length ? monthAlerts.map(a => `<div class="cal-event"><span class="cal-event-day">${a.day}</span><div style="font-size:0.8rem"><strong>${a.vName}</strong><br><span class="text-muted">${a.message}</span></div></div>`).join('') : '<div class="text-muted" style="font-size:0.7rem; text-align:center; padding:10px">Sin eventos</div>'}
      </div>
    </div>`;
  });
  html += `</div>`;
  c.innerHTML = html;
}

/* ======================== CRONOLOGIA ======================== */
function renderTimeline() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Cronología'); return; }
  const s = getState();
  const events = [
    { fecha: v.id.split('-')[1] ? new Date(parseInt(v.id.split('-')[1], 36)).toISOString().split('T')[0] : '2020-01-01', titulo: '🚗 Vehículo registrado', desc: 'Alta en MotorMaster', type: 'info' },
    ...s.revisiones.filter(r => r.vehicleId === v.id).map(r => ({ fecha: r.fecha, titulo: '🔩 Revisión: ' + r.operacion, desc: `Coste: ${fmt.currency(r.coste)}`, type: 'success' })),
    ...s.averias.filter(a => a.vehicleId === v.id).map(a => ({ fecha: a.fecha, titulo: '⚠️ Avería: ' + a.sintomas, desc: `Coste: ${fmt.currency(a.coste)}`, type: 'danger' })),
    ...s.recambios.filter(r => r.vehicleId === v.id).map(r => ({ fecha: r.id.split('-')[1] ? new Date(parseInt(r.id.split('-')[1], 36)).toISOString().split('T')[0] : '—', titulo: '📦 Recambio: ' + r.nombre, desc: `Tienda: ${r.tienda}`, type: 'warning' })),
    ...s.itv.filter(i => i.vehicleId === v.id).map(i => ({ fecha: i.fechaVencimiento, titulo: '🔍 ITV Vencimiento', desc: `Estado: ${i.estado}`, type: 'info' }))
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Cronología Visual</h1><p class="page-sub">Historial de vida de ${v.marca}</p></div></div>
    <div class="timeline-wrap">
      ${events.map(e => `<div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-date">${fmt.date(e.fecha)}</div>
        <div class="timeline-content">
          <div class="timeline-type" style="color:var(--clr-${e.type})">${e.type}</div>
          <div style="font-weight:700">${e.titulo}</div>
          <div class="text-muted" style="font-size:0.8rem">${e.desc}</div>
        </div>
      </div>`).join('')}
    </div>`;
}

/* ======================== WORKSHOP MODE ======================== */
function toggleWorkshopMode() {
  document.body.classList.toggle('workshop-mode');
  const isOk = document.body.classList.contains('workshop-mode');
  showToast(isOk ? 'Modo Taller activado 🔧' : 'Modo normal activado');
}

/* ======================== GLOBAL SEARCH ======================== */
function globalSearch(query) {
  if (!query) { router(); return; }
  const q = query.toLowerCase();
  const s = getState();
  const c = document.getElementById('main-content');

  const results = [];
  ['revisiones', 'averias', 'recambios', 'itv', 'seguro', 'multas', 'otros'].forEach(col => {
    s[col].forEach(r => {
      const text = JSON.stringify(r).toLowerCase();
      if (text.includes(q)) {
        const v = s.vehicles.find(v => v.id === r.vehicleId);
        results.push({ ...r, _col: col, _vName: v ? v.marca : '?' });
      }
    });
  });

  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Resultados de: "${query}"</h1><p class="page-sub">${results.length} coincidencias encontradas</p></div></div>
    ${!results.length ? emptySection('🔍', 'No se encontraron resultados') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Vehículo</th><th>Módulo</th><th>Concepto / Info</th><th>Fecha</th><th>Importe</th></tr></thead>
      <tbody>${results.map(r => `<tr>
        <td data-label="Vehículo"><strong>${r._vName}</strong></td>
        <td data-label="Módulo" style="text-transform:capitalize">${r._col}</td>
        <td data-label="Concepto">${r.operacion || r.sintomas || r.nombre || r.tipo || r.motivo || r.descripcion}</td>
        <td data-label="Fecha">${fmt.date(r.fecha || r.fechaVencimiento || r.fechaRenovacion || r.id.split('-')[1] ? new Date(parseInt(r.id.split('-')[1], 36)).toISOString().split('T')[0] : '—')}</td>
        <td data-label="Importe" class="gasto">${fmt.currency(r.coste || r.precio || r.precioAnual || r.importe)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`}
  `;
}

/* ======================== DELETE HELPER ======================== */
function setupDeleteBtns(rerender) {
  document.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    deleteRecord(b.dataset.delete, b.dataset.id);
    rerender();
    showToast('Registro eliminado');
  });
}

/* ======================== INIT ======================== */
window.addEventListener('hashchange', router);
document.getElementById('modal-close').onclick = closeModal;
document.getElementById('modal-overlay').onclick = e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); };
document.addEventListener('click', e => {
  const drop = document.getElementById('vsel-drop');
  if (drop && !drop.classList.contains('hidden') && !e.target.closest('#vehicle-selector')) drop.classList.add('hidden');
});

// Search and Workshop listeners
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.oninput = (e) => globalSearch(e.target.value.trim());
  }
});

router();
