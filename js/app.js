/* ===== APP.JS — MotorMaster SPA Router + All Module Views v1.4.1 ===== */

/* ---- HELPERS ---- */
const fmt = {
  currency: v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0),
  date: s => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); },
  km: v => v ? Number(v).toLocaleString('es-ES') + ' km' : '—',
  today: () => new Date().toISOString().split('T')[0],
};

// Filter State
let filters = {
  revisiones: { q: '', priority: '', dateFrom: '', dateTo: '' },
  averias: { q: '', priority: '', dateFrom: '', dateTo: '' },
  recambios: { q: '', link: '', dateFrom: '', dateTo: '' }
};

function renderFilterBar(type) {
  const f = filters[type];
  const isRevisionOrAveria = type === 'revisiones' || type === 'averias';

  return `
    <div class="filter-bar">
      <div class="filter-group">
        <label>Buscar</label>
        <input type="text" class="filter-input" id="filt-q" placeholder="Filtra por texto..." value="${f.q}" autocomplete="off">
      </div>
      ${isRevisionOrAveria ? `
      <div class="filter-group">
        <label>Prioridad</label>
        <select class="filter-input" id="filt-pri">
          <option value="">Todas</option>
          <option value="Alta" ${f.priority === 'Alta' ? 'selected' : ''}>Alta</option>
          <option value="Media" ${f.priority === 'Media' ? 'selected' : ''}>Media</option>
          <option value="Baja" ${f.priority === 'Baja' ? 'selected' : ''}>Baja</option>
        </select>
      </div>` : `
      <div class="filter-group">
        <label>Vínculo</label>
        <select class="filter-input" id="filt-link">
          <option value="">Todos</option>
          <option value="revision" ${f.link === 'revision' ? 'selected' : ''}>Revisión</option>
          <option value="averia" ${f.link === 'averia' ? 'selected' : ''}>Avería</option>
          <option value="none" ${f.link === 'none' ? 'selected' : ''}>Sin vínculo</option>
        </select>
      </div>`}
      <div class="filter-group">
        <label>Desde</label>
        <input type="date" class="filter-input" id="filt-from" value="${f.dateFrom}">
      </div>
      <div class="filter-group">
        <label>Hasta</label>
        <input type="date" class="filter-input" id="filt-to" value="${f.dateTo}">
      </div>
      <button class="btn-filter-reset" id="btn-filt-reset">Limpiar</button>
    </div>
  `;
}

function setupFilterListeners(type, rerender) {
  const q = document.getElementById('filt-q');
  const pri = document.getElementById('filt-pri');
  const link = document.getElementById('filt-link');
  const from = document.getElementById('filt-from');
  const to = document.getElementById('filt-to');
  const reset = document.getElementById('btn-filt-reset');

  if (q) {
    q.oninput = (e) => {
      filters[type].q = e.target.value;
      rerender();
      const newQ = document.getElementById('filt-q');
      if (newQ) {
        newQ.focus();
        newQ.setSelectionRange(newQ.value.length, newQ.value.length);
      }
    };
  }

  if (pri) pri.onchange = (e) => { filters[type].priority = e.target.value; rerender(); };
  if (link) link.onchange = (e) => { filters[type].link = e.target.value; rerender(); };
  if (from) from.onchange = (e) => { filters[type].dateFrom = e.target.value; rerender(); };
  if (to) to.onchange = (e) => { filters[type].dateTo = e.target.value; rerender(); };
  if (reset) reset.onclick = () => {
    filters[type] = { q: '', priority: '', link: '', dateFrom: '', dateTo: '' };
    rerender();
  };
}

let selectedYear = new Date().getFullYear();


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
function whatsappShare(msg) {
  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
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
function setupInvoiceLogic(existingItems = null) {
  const container = document.getElementById('invoice-body');
  const addBtn = document.getElementById('btn-add-concept');
  const ivaToggle = document.getElementById('inv-iva-inc');
  if (!container || !addBtn) return;

  container.innerHTML = ''; // Limpiar previo

  const updateTotals = () => {
    let accumulatedItemsTotal = 0;
    container.querySelectorAll('tr').forEach(tr => {
      const qty = parseFloat(tr.querySelector('.inv-qty').value) || 0;
      const price = parseFloat(tr.querySelector('.inv-price').value) || 0;
      const dto = parseFloat(tr.querySelector('.inv-dto').value) || 0;
      const rowTotal = (qty * price) * (1 - dto / 100);
      tr.querySelector('.col-total').textContent = fmt.currency(rowTotal);
      accumulatedItemsTotal += rowTotal;
    });

    const isIvaInc = ivaToggle ? ivaToggle.checked : true;
    let totalFactura, baseImponible, iva;

    if (isIvaInc) {
      totalFactura = accumulatedItemsTotal;
      baseImponible = totalFactura / 1.21;
      iva = totalFactura - baseImponible;
    } else {
      baseImponible = accumulatedItemsTotal;
      iva = baseImponible * 0.21;
      totalFactura = baseImponible + iva;
    }

    document.getElementById('inv-sub').textContent = fmt.currency(baseImponible);
    document.getElementById('inv-iva').textContent = fmt.currency(iva || 0);
    document.getElementById('inv-total-text').textContent = fmt.currency(totalFactura);

    const mainCostInput = document.getElementById('rf-coste') || document.getElementById('af-coste') || document.getElementById('rr-precio');
    if (mainCostInput) mainCostInput.value = totalFactura.toFixed(2);
  };

  if (ivaToggle) ivaToggle.onchange = updateTotals;

  const addLine = (item = null) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-ref"><input class="inv-ref" placeholder="Ref..." value="${item ? (item.ref || '') : ''}"></td>
      <td class="col-desc"><input class="inv-desc" placeholder="Descripción..." value="${item ? (item.desc || '') : ''}"></td>
      <td class="col-qty"><input type="number" class="inv-qty" value="${item ? item.qty : 1}" step="0.1" min="0"></td>
      <td class="col-price"><input type="number" class="inv-price" value="${item ? item.price : 0}" step="0.01" min="0"></td>
      <td class="col-dto"><input type="number" class="inv-dto" value="${item ? item.dto : 0}" min="0" max="100"></td>
      <td class="col-total">0,00 €</td>
      <td><button class="btn-del-line" style="background:none; border:none; color:var(--clr-danger); cursor:pointer; font-size:1.2rem">×</button></td>
    `;
    container.appendChild(tr);
    tr.querySelectorAll('input').forEach(i => i.oninput = updateTotals);
    tr.querySelector('.btn-del-line').onclick = () => { tr.remove(); updateTotals(); };
    updateTotals();
  };

  addBtn.onclick = () => addLine();

  if (existingItems && existingItems.length) {
    existingItems.forEach(it => addLine(it));
  } else {
    addLine();
  }
}

function getInvoiceItems() {
  const container = document.getElementById('invoice-body');
  if (!container) return [];
  const items = [];
  container.querySelectorAll('tr').forEach(tr => {
    const ref = tr.querySelector('.inv-ref').value.trim();
    const desc = tr.querySelector('.inv-desc').value.trim();
    if (!desc) return;
    const qty = parseFloat(tr.querySelector('.inv-qty').value) || 0;
    const price = parseFloat(tr.querySelector('.inv-price').value) || 0;
    const dto = parseFloat(tr.querySelector('.inv-dto').value) || 0;
    items.push({ ref, desc, qty, price, dto });
  });
  return items;
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
  'trip': renderTripChecklist,
  'guantera': renderGuantera,
  'itv': renderITV,
  'seguro': renderSeguro,
  'multas': renderMultas,
  'otros': renderOtros,
  'alerts': renderGlobalAlerts,
  'settings': renderSettings
};
function getRoute() { return (window.location.hash || '').replace('#/', '').replace('#', ''); }

function renderUserProfile() {
  const el = document.getElementById('user-profile');
  if (!el) return;
  const user = firebase.auth().currentUser;

  if (!user) {
    el.innerHTML = `
      <button class="w-full bg-primary/10 border border-primary/30 rounded-lg py-2 px-3 flex items-center gap-2 hover:bg-primary/20 transition-all group" id="btn-login-google">
        <span class="material-symbols-outlined text-primary text-sm">account_circle</span>
        <span class="text-[10px] font-bold text-primary uppercase tracking-tight">Activar Sincronización</span>
      </button>
    `;
    document.getElementById('btn-login-google').onclick = async () => {
      try {
        await googleLogin();
        showToast('¡Sesión iniciada! Sincronizando datos...');
      } catch (err) {
        alert('Error al iniciar sesión: ' + err.message);
      }
    };
  } else {
    el.innerHTML = `
      <div class="flex items-center gap-2 bg-slate-800/40 p-2 rounded-lg border border-white/5">
        <img src="${user.photoURL || 'https://via.placeholder.com/32'}" class="w-8 h-8 rounded-full border border-primary/30">
        <div class="flex-1 overflow-hidden">
          <p class="text-[10px] font-bold text-slate-200 truncate">${user.displayName}</p>
          <button class="text-[8px] text-red-400 hover:text-red-300 uppercase font-black tracking-widest" id="btn-logout">Cerrar Sesión</button>
        </div>
      </div>
    `;
    document.getElementById('btn-logout').onclick = () => {
      if (confirm('¿Cerrar sesión? Los datos dejarán de sincronizarse.')) {
        logout();
        showToast('Sesión cerrada');
      }
    };
  }
}

function router() {
  const route = getRoute();
  const fn = ROUTES[route] || renderDashboard;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.route === route));
  renderUserProfile();
  renderVehicleSelector();
  renderHeaderLicensePlate();
  renderAlertBanner(getActiveVehicle()?.id);
  updateGlobalAlertBadge();
  if (typeof checkAndNotifyCriticalAlerts === 'function') checkAndNotifyCriticalAlerts();
  fn();
}

/* User 6: TRIPS */
function renderTripChecklist() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Trips'); return; }
  const trips = getState().viajes.filter(t => t.vehicleId === v.id);
  const items = ['Presión neumáticos', 'Nivel aceite', 'Líquido limpiaparabrisas', 'Revisar juego luces', 'Botiquín / Triángulos', 'Estado de la rueda de repuesto', 'Documentación física', 'Nivel de refrigerante'];

  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Checklist de Viaje</h1><p class="page-sub">Preparación para trayectos largos</p></div>
    <button class="btn btn-primary" id="btn-add-trip">+ Nuevo Viaje</button></div>
    <div class="summary-grid">${trips.map(t => `<div class="card summary-card" style="flex-direction:column; align-items:flex-start;">
      <h3>Viaje a ${t.destino} (${fmt.date(t.fecha)})</h3>
      <div style="margin-top:10px; width:100%; display: flex; flex-direction: column; gap: 4px;">
        ${items.map((it, i) => `<label class="check-item ${t.checks[i] ? 'done' : ''}" style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 1px 0;">
          <input type="checkbox" ${t.checks[i] ? 'checked' : ''} data-tid="${t.id}" data-idx="${i}" style="width: 18px; height: 18px; accent-color: var(--clr-accent);"> 
          <span style="${t.checks[i] ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${it}</span>
        </label>`).join('')}
      </div>
      <div style="margin-top:10px; width:100%; display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-xs btn-ghost" data-edit="viajes" data-id="${t.id}" title="Editar Destino">✎ Editar</button>
        <button class="btn btn-danger btn-xs btn-ghost" onclick="deleteRecord('viajes','${t.id}'); renderTripChecklist();">✕ Borrar Viaje</button>
      </div>
    </div>`).join('')}</div>`;

  document.getElementById('btn-add-trip').onclick = () => {
    const dest = prompt('Destino del viaje:');
    if (dest) { addTripChecklist({ destino: dest, fecha: fmt.today() }); renderTripChecklist(); }
  };
  setupEditBtns(renderTripChecklist);
  document.querySelectorAll('.check-item input').forEach(inp => {
    inp.onchange = (e) => {
      updateTripCheck(e.target.dataset.tid, e.target.dataset.idx, e.target.checked);
      renderTripChecklist();
    };
  });
}

/* ======================== GUANTERA DIGITAL ======================== */
function renderGuantera() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Guantera Digital'); return; }
  const docs = getDocsByVehicle(v.id);

  c.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Guantera Digital</h1><p class="page-sub">Documentación original de ${v.marca} ${v.modelo}</p></div>
      <button class="btn btn-primary" id="btn-add-doc">+ Añadir Documento</button>
    </div>
    
    ${!docs.length ? emptySection('📁', 'No hay documentos guardados') : `
    <div class="summary-grid">
      ${docs.map(d => `
      <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
        <div style="height: 140px; background: var(--clr-surface-2); display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${d.fileType?.startsWith('image') ? `<img src="${d.fileData}" style="width: 100%; height: 100%; object-fit: cover;">` : `<span style="font-size: 3rem;">📄</span>`}
        </div>
        <div style="padding: var(--sp-md); flex: 1;">
          <h3 style="font-size: 0.95rem; margin-bottom: 4px;">${d.nombre}</h3>
          <p style="font-size: 0.75rem; color: var(--clr-text-muted); margin-bottom: 12px;">${d.categoria} • ${fmt.date(d.fechaSubida)}</p>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="viewDocument('${d.id}')">Ver</button>
            <button class="btn btn-secondary btn-sm" data-edit="documentos" data-id="${d.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecord('documentos','${d.id}'); renderGuantera();">✕</button>
          </div>
        </div>
      </div>`).join('')}
    </div>`}
  `;

  document.getElementById('btn-add-doc').onclick = () => openDocumentoModal(null, renderGuantera);
  setupEditBtns(renderGuantera);
}

function openDocumentoModal(id = null, rerender) {
  const isEdit = id !== null;
  const data = isEdit ? getState().documentos.find(d => d.id === id) : null;

  openModal(isEdit ? 'Editar Documento' : 'Registrar Documento', `<div class="form space-y-4">
    <div class="form-group">
      <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Nombre del Documento *</label>
      <input id="doc-name" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ring-primary/30" placeholder="Ej: Permiso de Circulación" value="${data ? data.nombre : ''}">
    </div>
    <div class="form-group">
      <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Categoría</label>
      <select id="doc-cat" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 ring-primary/30 appearance-none">
        <option value="Propiedad / Compra" ${data?.categoria === 'Propiedad / Compra' ? 'selected' : ''}>Propiedad / Compra</option>
        <option value="Seguro / Póliza" ${data?.categoria === 'Seguro / Póliza' ? 'selected' : ''}>Seguro / Póliza</option>
        <option value="Ficha Técnica / ITV" ${data?.categoria === 'Ficha Técnica / ITV' ? 'selected' : ''}>Ficha Técnica / ITV</option>
        <option value="Impuesto Circulación" ${data?.categoria === 'Impuesto Circulación' ? 'selected' : ''}>Impuesto Circulación</option>
        <option value="Otros" ${data?.categoria === 'Otros' ? 'selected' : ''}>Otros</option>
      </select>
    </div>
    ${!isEdit ? `
    <div class="form-group">
      <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Archivo (Imagen o PDF) *</label>
      <div style="display: flex; gap: 8px;">
        <input type="file" id="doc-file" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30" accept="image/*,application/pdf" capture="environment">
      </div>
      <p class="text-[10px] text-slate-500 italic mt-1.5">Máximo 2MB recomendado para asegurar el guardado.</p>
    </div>` : ''}
    <div class="form-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-doc">${isEdit ? 'Actualizar' : 'Guardar Documento'}</button>
    </div>
  </div>`);

  document.getElementById('btn-save-doc').onclick = async (btnEvt) => {
    const name = document.getElementById('doc-name').value.trim();
    const cat = document.getElementById('doc-cat').value;
    const btn = btnEvt.target;

    if (isEdit) {
      if (!name) { alert('Completa los campos obligatorios'); return; }
      updateDocumento(id, { nombre: name, categoria: cat });
      closeModal();
      rerender();
      showToast('Documento actualizado correctamente');
    } else {
      const fileInput = document.getElementById('doc-file');
      const file = fileInput.files[0];
      const user = firebase.auth().currentUser;

      if (!name || !file) { alert('Completa los campos obligatorios'); return; }

      const originalText = btn.textContent;
      btn.textContent = 'Subiendo...';
      btn.disabled = true;

      try {
        let fileDataUrl = '';
        if (user) {
          const storageRef = firebase.storage().ref(`users/${user.uid}/docs/${Date.now()}_${file.name}`);
          const snapshot = await storageRef.put(file);
          fileDataUrl = await snapshot.ref.getDownloadURL();
        } else {
          if (file.size > 2 * 1024 * 1024) throw new Error('Sin sesión, el archivo es demasiado grande (>2MB).');
          fileDataUrl = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => res(e.target.result);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }
        addDocumento({ nombre: name, categoria: cat, fileData: fileDataUrl, fileType: file.type, fechaSubida: fmt.today() });
        closeModal();
        rerender();
        showToast('Documento guardado con éxito');
      } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }
  };
}

function viewDocument(id) {
  const d = getState().documentos.find(doc => doc.id === id);
  if (!d) return;

  const content = d.fileType.startsWith('image')
    ? `<img src="${d.fileData}" style="width: 100%; border-radius: 8px;">`
    : `<iframe src="${d.fileData}" style="width: 100%; height: 500px; border: none; border-radius: 8px;"></iframe>`;

  openModal(d.nombre, `<div style="text-align: center;">${content}</div>`);
}

/* User 5: Sale Report View */
function openSaleReport(vid) {
  const v = getState().vehicles.find(v => v.id === vid);
  const revs = getRevisionesByVehicle(vid);
  const aves = getAveriasByVehicle(vid);
  const recs = getRecambiosByVehicle(vid);
  const html = `
    <div style="padding:40px; font-family:var(--font-body); color: #fff;">
      <h1 class="page-title" style="color:var(--clr-accent)">MotorMaster — Certificado de Historial</h1>
      <div class="vehicle-hero" style="background: #111; border: 1px solid #333; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <div style="text-align: center; width: 100%;">
          <h2 style="margin:0; font-size: 1.8rem;">${v.marca} ${v.modelo}</h2>
          <p style="margin:10px 0 0; color: #94A3B8;">${v.matricula || 'Sin Matrícula'} &nbsp;•&nbsp; ${v.año} &nbsp;•&nbsp; ${fmt.km(v.km)}</p>
        </div>
      </div>
      <h3 style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 15px;">Historial de Mantenimiento Preventivo</h3>
      <table class="report-table" style="width:100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead><tr><th style="width:15%">FECHA</th><th style="width:40%">OPERACION</th><th style="width:40%">TALLER/COMERCIO</th><th style="width:8%;text-align:center">KMS</th><th style="width:8%;text-align:center">COSTE</th></tr></thead>
        <tbody>${revs.length ? revs.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => `<tr><td>${fmt.date(r.fecha)}</td><td>${r.operacion}</td><td>${r.taller || '—'}</td><td style="text-align:right">${r.km}</td><td style="text-align:right">${fmt.currency(r.coste)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding: 10px;">Sin registros</td></tr>'}</tbody>
      </table>

      <h3 style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 15px;">Historial de Reparaciones</h3>
      <table class="report-table" style="width:100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead><tr><th style="width:15%">FECHA</th><th style="width:40%">AVERÍA/SÍNTOMA</th><th style="width:40%">TALLER/COMERCIO</th><th style="width:8%;text-align:center">KMS</th><th style="width:8%;text-align:center">COSTE</th></tr></thead>
        <tbody>${aves.length ? aves.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(a => `<tr><td>${fmt.date(a.fecha)}</td><td>${a.sintomas}</td><td>${a.taller || '—'}</td><td style="text-align:right">${a.km}</td><td style="text-align:right">${fmt.currency(a.coste)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding: 10px;">Sin registros</td></tr>'}</tbody>
      </table>

      <h3 style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 15px;">Historial de Recambios</h3>
      <table class="report-table" style="width:100%; border-collapse: collapse;">
        <thead><tr><th style="width:15%">FECHA</th><th style="width:40%">PIEZA/ARTÍCULO</th><th style="width:40%">TIENDA</th><th style="width:8%;text-align:center">KMS</th><th style="width:8%;text-align:center">COSTE</th></tr></thead>
        <tbody>${recs.length ? recs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(r => `<tr><td>${fmt.date(r.fecha || '')}</td><td>${r.nombre}${r.marca || r.referencia ? `<br><small style="opacity:0.7">${r.marca || ''} ${r.referencia || ''}</small>` : ''}</td><td>${r.tienda || '—'}</td><td style="text-align:right">${r.km}</td><td style="text-align:right">${fmt.currency(r.precio)}</td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding: 10px;">Sin registros</td></tr>'}</tbody>
      </table>
      <p style="margin-top:40px; font-size:0.8rem; text-align:center; opacity: 0.7;">Informe generado por MotorMaster — Valor de mercado incrementado por transparencia técnica.</p>
    </div>
  `;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Informe de Venta - ${v.matricula || v.modelo}</title>
    <link rel="stylesheet" href="css/tokens.css">
    <link rel="stylesheet" href="css/app.css">
    <style>
      body { background: #0A1322 !important; color: white !important; font-family: 'Roboto', sans-serif !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 0.8rem !important; }
      .report-table { 
          width: 100% !important; 
          border-collapse: collapse !important; 
          display: table !important; 
          table-layout: fixed !important; 
          margin-bottom: 20px !important;
      }
      .report-table thead { display: table-header-group !important; }
      .report-table tr { display: table-row !important; background: transparent !important; }
      .report-table th, .report-table td { 
        display: table-cell !important; 
        padding: 6px 10px !important; 
        border-bottom: 1px solid #334155 !important; 
        text-align: left;
        color: white !important;
        font-size: 0.75rem !important;
      }
      .report-table td::before { content: none !important; } /* Kill 'data-label' mobile stacks */
      .report-table th { 
        background: #1E293B !important; 
        color: #94A3B8 !important; 
        text-transform: uppercase; 
        font-size: 0.7rem !important; 
      }
      .priority-tag { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; }
      .pri-high { background: rgba(236,72,153,0.2) !important; color: #ec4899 !important; }
      .pri-mid { background: rgba(245,158,11,0.2) !important; color: #f59e0b !important; }
      .pri-low { background: rgba(34,197,94,0.2) !important; color: #22c55e !important; }
      
      @media print {
        body { background: white !important; color: black !important; }
        .report-table th, .report-table td { border-bottom: 1px solid #ddd !important; color: black !important; }
        .report-table th { background: #f1f5f9 !important; color: #475569 !important; }
        .vehicle-hero { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: black !important; }
        h1, h2, h3 { color: black !important; }
        p { color: #64748b !important; }
      }
    </style></head><body>${html}</body></html>`);
  setTimeout(() => win.print(), 500);
}

function renderDashboard() {
  const content = document.getElementById('main-content');
  const vehicle = getActiveVehicle();
  if (!vehicle) {
    content.innerHTML = `<div class="page-header"><h1 class="page-title">Dashboard</h1></div>
      <div class="empty-state">
        <div class="empty-icon">🔧</div>
        <h2>Bienvenido a MotorMaster</h2>
        <p>Añade tu primer vehículo para empezar a gestionar su mantenimiento.</p>
        <a href="#/garage" class="btn btn-primary">+ Añadir vehículo</a>
      </div>`;
    return;
  }
  const vid = vehicle.id;
  const state = getState();
  const revs = getRevisionesByVehicle(vid);
  const aves = getAveriasByVehicle(vid);
  const recs = getRecambiosByVehicle(vid);
  const multas = getMultasByVehicle(vid);
  const pending = multas.filter(m => m.estado === 'Pendiente');
  const alerts = collectAlerts(vid, null);

  const filterYear = selectedYear.toString();
  const cats = [
    { label: 'Revisiones', icon: '🔩', col: 'revisiones', f: 'coste' },
    { label: 'Averías', icon: '⚠️', col: 'averias', f: 'coste' },
    { label: 'Recambios', icon: '📦', col: 'recambios', f: 'precio' },
    { label: 'Seguros', icon: '🛡️', col: 'seguro', f: 'precio' },
    { label: 'Multas', icon: '📋', col: 'multas', f: 'importePagado', filter: m => m.estado === 'Pagada' },
    { label: 'Otros', icon: '📁', col: 'otros', f: 'importe' },
  ];

  const totalGastoYear = cats.reduce((sum, c) => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)) && (r.fecha || r.fechaVencimiento || r.fechaRenovacion || '').startsWith(filterYear));
    return sum + items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
  }, 0);

  const monthlySaving = (totalGastoYear / 12).toFixed(2);

  const costRowsYear = cats.map(c => {
    const items = state[c.col].filter(r => r.vehicleId === vid && (!c.filter || c.filter(r)) && (r.fecha || r.fechaVencimiento || r.fechaRenovacion || '').startsWith(filterYear));
    const total = items.reduce((s, r) => s + parseFloat(r[c.f] || 0), 0);
    const pct = totalGastoYear > 0 ? (total / totalGastoYear * 100).toFixed(1) : 0;
    return `
      <div class="cost-row">
        <div class="cost-label">${c.icon} ${c.label}</div>
        <div class="cost-bar-wrap"><div class="cost-bar" style="width:${pct}%"></div></div>
        <div class="cost-value">${fmt.currency(total)}</div>
      </div>`;
  }).join('');

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <div class="year-filter" style="display: flex; align-items: center; gap: 8px;">
          <span>Año:</span>
          <select id="dash-year" class="form-input" style="padding: 4px 12px; width: auto; font-size: 0.9rem; background: var(--clr-surface-2); border-color: var(--clr-border);">
            ${[2023, 2024, 2025, 2026].map(y => `<option ${y == selectedYear ? 'selected' : ''} value="${y}">${y}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-ghost btn-sm" onclick="openSaleReport('${vid}')">📄 Informe Venta</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleWorkshopMode()">🛠️ Modo Taller</button>
      </div>
    </div>

    <div class="vehicle-hero">
      <div class="vehicle-hero-left">
        <div class="vehicle-hero-name">${vehicle.marca} ${vehicle.modelo}</div>
        <div class="vehicle-hero-sub">${vehicle.año}${vehicle.matricula ? ' &nbsp;·&nbsp; ' + vehicle.matricula : ''}</div>
        <div class="vehicle-hero-km"><span class="km-label">Kilometraje actual  </span><span class="km-value">${fmt.km(vehicle.km)}</span></div>
      </div>
      <div class="vehicle-hero-right">
        <div class="hero-stat">
          <div class="hero-stat-value gasto">${fmt.currency(vehicle.gastoTotal)}</div>
          <div class="hero-stat-label">Gasto Acumulado Total</div>
        </div>
      </div>
    </div>

    ${(() => {
      const allGlobal = collectAllGlobalAlerts();
      const critical = allGlobal.filter(a => a.type === 'danger' || a.days <= 7).slice(0, 3);
      if (!critical.length) return '';
      return `
      <div class="card" style="border: 1px solid var(--clr-danger-dim); margin-bottom: 20px; background: rgba(220, 38, 38, 0.05);">
        <div style="padding: 10px 15px; border-bottom: 1px solid var(--clr-danger-dim); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="color: var(--clr-danger); font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0;">⚠️ Atención Inmediata</h3>
          <a href="#/alerts" style="font-size: 0.7rem; color: var(--clr-accent); font-weight: 700;">Ver todas (${allGlobal.length})</a>
        </div>
        <div style="padding: 10px;">
          ${critical.map(a => `
            <div style="display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; border: 1px solid transparent;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="setActiveVehicle('${a.vehicleId}'); window.location.hash='#/'">
              <span style="font-size: 1.2rem;">${a.days <= 0 ? '🚨' : '⚠️'}</span>
              <div style="flex: 1;">
                <div style="font-size: 0.7rem; color: #94A3B8; font-weight: 700; text-transform: uppercase;">${a.vehicleName}</div>
                <div style="font-size: 0.85rem; font-weight: 600;">${a.message}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.75rem; font-weight: 800; color: ${a.days <= 0 ? 'var(--clr-danger)' : 'var(--clr-warning)'}">${a.days <= 0 ? 'VENCIDO' : `Faltan ${a.days}d`}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    })()}

    <div class="summary-grid">
      <div class="card summary-card"><div class="summary-icon">💸</div><div class="summary-data"><div class="summary-value">${fmt.currency(totalGastoYear)}</div><div class="summary-label">Gastos Año ${filterYear}</div></div></div>
      <div class="card summary-card"><div class="summary-icon">🧪</div><div class="summary-data"><div class="summary-value">${monthlySaving} € <small>/mes</small></div><div class="summary-label">Ahorro Recomendado</div></div></div>
      <div class="card summary-card${pending.length ? ' card-warning' : ''}"><div class="summary-icon">📋</div><div class="summary-data"><div class="summary-value${pending.length ? ' text-warning' : ''}">${pending.length}</div><div class="summary-label">Multas Pend.</div></div></div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header"><span>🔔 Alertas (30d)</span><span class="badge ${alerts.length ? 'badge-danger' : 'badge-success'}">${alerts.length || 'OK'}</span></div>
        <div class="card-body">
          ${alerts.length ? alerts.map(a => `<div class="alert-row alert-row-${a.type}"><span>${a.days <= 0 ? '🚨' : '⚠️'} ${a.message}</span> <span class="alert-days">${a.days <= 0 ? 'HOY' : a.days + 'd'}</span></div>`).join('') : '<div class="empty-mini">Todo al día 🎉</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span>💶 Desglose de Gastos ${filterYear}</span></div>
        <div class="card-body cost-breakdown">
          ${costRowsYear}
        </div>
      </div>
    </div>

    <div class="card card-body" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
       <span>¿Compartir estado por WhatsApp?</span>
       <button class="btn btn-whatsapp btn-sm" onclick="whatsappShare('MotorMaster: Resumen de ${vehicle.marca} ${vehicle.modelo}. Gasto anual: ${fmt.currency(totalGastoYear)}.')">Compartir</button>
    </div>`;

  document.getElementById('dash-year').onchange = (e) => { selectedYear = parseInt(e.target.value); renderDashboard(); };
}

/* User 16, 23, 14: Settings Expansion */
function renderSettings() {
  const c = document.getElementById('main-content');
  const s = getState();
  const v = getActiveVehicle();
  const colors = [
    { name: 'Cyan', hex: '#00e5ff' },
    { name: 'Magenta', hex: '#ff00ff' },
    { name: 'Gold', hex: '#ffd700' },
    { name: 'White', hex: '#ffffff' }
  ];

  c.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6 pb-12 font-display text-slate-100">
      
      <!-- Identidad Visual & Accesibilidad -->
      <section>
        <h3 class="eyebrow-title">Identidad & Accesibilidad</h3>
        <div class="glass-card rounded-lg p-4 space-y-5">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Color de Acento</p>
            <div class="flex gap-3">
              ${colors.map(col => `
                <label class="size-6 rounded-full cursor-pointer ring-offset-2 ring-offset-[#0a0a0a] transition-all has-[:checked]:ring-2 ring-[${col.hex}]" style="background:${col.hex}">
                  <input type="radio" name="accent" class="sr-only" ${s.accentColor === col.hex ? 'checked' : ''} onchange="setAccentColor('${col.hex}'); renderSettings();">
                </label>
              `).join('')}
            </div>
          </div>

          <div class="space-y-3 pt-3 border-t border-white/5">
            <div class="flex justify-between items-center">
              <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tamaño de Interfaz</p>
              <span class="text-primary font-bold text-xs">${s.uiScale}%</span>
            </div>
            <input type="range" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" 
              min="80" max="150" step="5" value="${s.uiScale}" 
              oninput="this.parentElement.querySelector('span').textContent = this.value + '%'"
              onchange="setUiScale(this.value)">
            <p class="text-[9px] text-slate-500 italic">Aumenta o disminuye el tamaño global de textos y componentes.</p>
          </div>

          <div class="flex items-center justify-between pt-3 border-t border-white/5">
            <div>
              <p class="text-sm font-bold">Modo Retro / Taller</p>
              <p class="text-[10px] text-slate-500">Apariencia de terminal técnica</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" ${s.retroMode ? 'checked' : ''} onchange="setRetroMode(this.checked); renderSettings();">
              <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      <!-- Gestión de Flota -->
      <section>
        <h3 class="eyebrow-title">Gestión de Flota</h3>
        <div class="glass-card rounded-lg p-4">
          <div class="space-y-3">
            <label class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Vehículo Principal</label>
            <div class="relative">
              <select class="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 text-sm font-bold appearance-none focus:outline-none focus:ring-1 ring-primary/30" onchange="setMainVehicle(this.value); router();">
                ${s.vehicles.map(v_ => `<option value="${v_.id}" ${s.mainVehicleId === v_.id ? 'selected' : ''} class="bg-[#161616] text-white">${v_.marca} ${v_.modelo} (${v_.matricula || 'S/M'})</option>`).join('')}
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-lg">expand_more</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Plan de Mantenimiento -->
      <section>
        <h3 class="eyebrow-title">Plan de Mantenimiento</h3>
        <div class="glass-card rounded-lg p-4">
          ${v ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              ${[
        { id: 'aceite', label: 'Aceite', min: 5000, max: 30000, step: 1000 },
        { id: 'filtros', label: 'Filtros', min: 5000, max: 40000, step: 5000 },
        { id: 'frenos', label: 'Pastillas/Frenos', min: 5000, max: 80000, step: 5000 },
        { id: 'distribucion', label: 'Distribución', min: 60000, max: 200000, step: 10000, wide: true }
      ].map(item => `
                <div class="space-y-2 ${item.wide ? 'md:col-span-2' : ''}">
                  <div class="flex justify-between items-center">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">${item.label}</label>
                    <span class="text-primary font-mono text-xs font-bold">${(s.kmIntervals[v.id]?.[item.id] || (item.id === 'distribucion' ? 120000 : item.id === 'frenos' ? 60000 : item.id === 'filtros' ? 30000 : 15000)).toLocaleString()} km</span>
                  </div>
                  <input type="range" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" 
                    min="${item.min}" max="${item.max}" step="${item.step}" 
                    value="${s.kmIntervals[v.id]?.[item.id] || (item.id === 'distribucion' ? 120000 : item.id === 'frenos' ? 60000 : item.id === 'filtros' ? 30000 : 15000)}" 
                    oninput="this.previousElementSibling.querySelector('span').textContent = parseInt(this.value).toLocaleString() + ' km'"
                    onchange="setKmInterval('${v.id}','${item.id}',this.value)">
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-xs text-slate-500 text-center py-4">Selecciona un vehículo en el garaje para configurar sus intervalos.</p>'}
        </div>
      </section>

      <!-- Sincronización & Notificaciones -->
      <section>
        <h3 class="eyebrow-title">Sincronización & Notificaciones</h3>
        <div class="glass-card rounded-lg p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold">Notificaciones de Escritorio</p>
              <p class="text-[10px] text-slate-500">Avisos proactivos de ITV, Seguros y Multas</p>
            </div>
            <button class="btn btn-sm ${Notification.permission === 'granted' ? 'btn-ghost opacity-50' : 'btn-primary'}" 
              ${Notification.permission === 'granted' ? 'disabled' : ''} 
              id="btn-enable-notif">
              ${Notification.permission === 'granted' ? 'Activado ✓' : 'Activar'}
            </button>
          </div>
          <p class="text-[9px] text-slate-500 italic">
            * Las notificaciones te avisarán incluso si tienes la pestaña en segundo plano. Requiere permiso del navegador.
          </p>
        </div>
      </section>

      <!-- Seguridad y Datos -->
      <section>
        <h3 class="eyebrow-title">Seguridad y Datos</h3>
        <div class="glass-card rounded-lg p-4 space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <button class="flex flex-col items-center justify-center gap-2 bg-slate-800/40 py-3 rounded-lg border border-white/5 hover:bg-slate-800/60 transition-colors" id="btn-export-json">
              <span class="material-symbols-outlined text-lg text-slate-400">cloud_upload</span>
              <span class="text-[9px] font-bold uppercase tracking-tight text-slate-300">Backup</span>
            </button>
            <button class="flex flex-col items-center justify-center gap-2 bg-slate-800/40 py-3 rounded-lg border border-white/5 hover:bg-slate-800/60 transition-colors" id="btn-trigger-import">
              <span class="material-symbols-outlined text-lg text-slate-400">download</span>
              <span class="text-[9px] font-bold uppercase tracking-tight text-slate-300">Importar</span>
            </button>
            <input type="file" id="input-import" class="hidden" accept=".json">
            <button class="flex flex-col items-center justify-center gap-2 bg-slate-800/40 py-3 rounded-lg border border-white/5 hover:bg-slate-800/60 transition-colors" onclick="exportToCSV()">
              <span class="material-symbols-outlined text-lg text-slate-400">table_view</span>
              <span class="text-[9px] font-bold uppercase tracking-tight text-slate-300">CSV</span>
            </button>
          </div>
          <div class="pt-2 flex justify-center">
            <button class="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 hover:text-red-400 transition-colors py-2 flex items-center gap-2 opacity-80" id="btn-wipe">
              <span class="material-symbols-outlined text-sm">delete</span>
              Borrar Todo el Sistema
            </button>
          </div>
        </div>
      </section>

    </div>
  `;

  // Re-bind events
  const btnNotif = document.getElementById('btn-enable-notif');
  if (btnNotif) {
    btnNotif.onclick = async () => {
      const ok = await requestNotificationPermission();
      if (ok) renderSettings();
    };
  }

  // Re-bind events (same as original renderSettings)
  document.getElementById('btn-export-json').onclick = () => {
    const data = JSON.stringify(getState(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `motormaster_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Copia de seguridad generada');
  };
  document.getElementById('btn-trigger-import').onclick = () => document.getElementById('input-import').click();
  document.getElementById('input-import').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.vehicles) {
          if (confirm('¿Importar datos? Los datos actuales serán reemplazados.')) {
            resetState(data);
            window.location.reload();
          }
        }
      } catch { alert('Error al leer el archivo'); }
    };
    reader.readAsText(file);
  };
  document.getElementById('btn-wipe').onclick = () => {
    if (confirm('¿BORRAR TODO? Esta acción es definitiva y eliminará todos tus vehículos y registros.')) {
      resetState();
      window.location.reload();
    }
  };
}

function exportToCSV() {
  const s = getState();
  let csv = 'ID;Fecha;Vehiculo;Modulo;Concepto;Importe;Referencia\n';
  s.revisiones.forEach(r => { const v = s.vehicles.find(x => x.id === r.vehicleId); csv += `${r.id};${r.fecha};${v?.marca} ${v?.modelo};Revisiones;${r.operacion.replace(/;/g, ',')};${r.coste};—\n`; });
  s.averias.forEach(a => { const v = s.vehicles.find(x => x.id === a.vehicleId); csv += `${a.id};${a.fecha};${v?.marca} ${v?.modelo};Averias;${a.sintomas.replace(/;/g, ',')};${a.coste};—\n`; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `motormaster_export.csv`;
  a.click();
  showToast('Archivo CSV generado');
}

/**
 * Consulta real a base de datos de vehículos por bastidor (VIN)
 */
async function consultarDGT(vin) {
  if (!vin) return null;
  const vinUpper = vin.toUpperCase().replace(/\s/g, '').trim();

  if (vinUpper.length < 9) {
    alert('El bastidor debe tener entre 9 y 17 caracteres.');
    return null;
  }

  showToast('Conectando con base de datos global...');
  console.log("Consultando VIN:", vinUpper);

  // Mantenemos los Mocks actualizados
  const mockData = {
    'VSSZZZ6LZ': { marca: 'Seat', modelo: 'Ibiza', año: 2005, combustible: 'Diésel', cilindrada: '1.9 TDI', distintivo: 'B' },
    'VF38BRHZY': { marca: 'Peugeot', modelo: '308', año: 2018, combustible: 'Gasolina', cilindrada: '1.2 PureTech', distintivo: 'C' },
    'WBAJF1105': { marca: 'BMW', modelo: '320d', año: 2022, combustible: 'Híbrido Diésel', cilindrada: '2.0', distintivo: 'ECO' }
  };

  if (mockData[vinUpper]) {
    console.log("Coincidencia encontrada en caché local");
    await new Promise(r => setTimeout(r, 600));
    return mockData[vinUpper];
  }

  try {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vinUpper}?format=json`);
    if (!response.ok) throw new Error('Error de conexión con el servidor de datos');

    const data = await response.json();
    console.log("Respuesta API:", data);

    const res = {};
    if (data.Results) {
      data.Results.forEach(item => {
        if (item.Value && item.Value !== "0" && item.Value !== "" && item.Value !== "Not Applicable") {
          res[item.Variable] = item.Value;
        }
      });
    }

    if (!res['Make']) {
      console.warn("API no devolvió Marca para este VIN");
      return null;
    }

    const year = parseInt(res['Model Year']) || new Date().getFullYear();
    const fuelPrimary = res['Fuel Type - Primary'] || '';
    const fuelSecondary = res['Fuel Type - Secondary'] || '';

    // Lógica avanzada de detección de combustible (incluyendo Híbridos)
    let fullFuel = fuelPrimary;
    const fuelL = fuelPrimary.toLowerCase();
    const fuelSL = fuelSecondary.toLowerCase();

    if (fuelL.includes('electric') && fuelL.includes('gasoline')) fullFuel = 'Híbrido-Gasolina';
    else if (fuelL.includes('electric') && fuelL.includes('diesel')) fullFuel = 'Híbrido-Diésel';
    else if (fuelSL.includes('electric') || fuelL.includes('hybrid')) {
      if (fuelL.includes('gasoline')) fullFuel = 'Híbrido-Gasolina';
      else if (fuelL.includes('diesel')) fullFuel = 'Híbrido-Diésel';
      else fullFuel = 'Híbrido';
    }

    // Mapeo etiquetas DGT España
    let label = '';
    const fuelFinalL = fullFuel.toLowerCase();

    if (fuelFinalL.includes('electric') && !fuelFinalL.includes('gasoline') && !fuelFinalL.includes('diesel')) label = '0';
    else if (fuelFinalL.includes('híbrido') || fuelFinalL.includes('gas') || fuelFinalL.includes('cng') || fuelFinalL.includes('lpg')) label = 'ECO';
    else if (year >= 2006 && !fuelFinalL.includes('diésel')) label = 'C';
    else if (year >= 2014 && fuelFinalL.includes('diésel')) label = 'C';
    else if (year >= 2000 && !fuelFinalL.includes('diésel')) label = 'B';
    else if (year >= 2006 && fuelFinalL.includes('diésel')) label = 'B';

    return {
      marca: res['Make'] || 'Desconocida',
      modelo: res['Model'] || 'Modelo base',
      año: year,
      combustible: fullFuel.replace('Gasoline', 'Gasolina').replace('Diesel', 'Diésel'),
      cilindrada: res['Displacement (L)'] ? res['Displacement (L)'] + 'L' : (res['Displacement (CC)'] ? res['Displacement (CC)'] + 'cc' : ''),
      distintivo: label
    };
  } catch (err) {
    console.error("Error crítico en consulta DGT:", err);
    showToast('Error de conexión. Intenta manual.');
    return null;
  }
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

function renderHeaderLicensePlate() {
  const v = getActiveVehicle();
  const el = document.getElementById('header-license-plate');
  if (!el) return;
  if (!v || !v.matricula) {
    el.innerHTML = '';
    return;
  }

  const matricula = v.matricula.toUpperCase().trim();

  el.innerHTML = `<svg width="520" height="110" viewBox="0 0 520 110" xmlns="http://www.w3.org/2000/svg">
  <rect width="520" height="110" rx="5" fill="#0033CC" />
  <rect x="1" y="1" width="518" height="108" rx="4" fill="none" stroke="#002288" stroke-width="1"/>
  <rect x="0" y="0" width="45" height="110" rx="2" fill="#003399" />
  <line x1="45" y1="5" x2="45" y2="105" stroke="white" stroke-width="1.5" opacity="0.8"/>
  <circle cx="22.5" cy="35" r="12" fill="none" stroke="#FFCC00" stroke-width="2" stroke-dasharray="2 4.3" />
  <text x="22.5" y="85" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="24" fill="white" text-anchor="middle">E</text>
  <text x="285" y="82" font-family="Consolas, 'Courier New', monospace" font-weight="bold" font-size="90" fill="white" text-anchor="middle" letter-spacing="4">
    ${matricula}
  </text>
</svg>`;
}

/* (Functions moved to top section or deleted as duplicates) */

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
          <div class="vehicle-card-name">
            ${v.icono || '🚗'} ${v.marca} ${v.modelo}
            ${v.id === getState().mainVehicleId ? '<span title="Coche Principal" style="color:var(--clr-accent); margin-left:5px;">★</span>' : ''}
          </div>
          <span class="status-dot status-${getVehicleHealth(v.id)}" title="Estado de salud"></span>
        </div>
        <div class="vehicle-compact-grid" data-edit-veh="${v.id}" style="cursor:pointer" title="Haga clic para editar todos los datos del vehículo">
          <div class="compact-item"><small>MATRÍCULA</small><span>${v.matricula || '—'}</span></div>
          <div class="compact-item"><small>FECHA MAT.</small><span>${fmt.date(v.fechaMatriculacion) || '—'}</span></div>
          <div class="compact-item"><small>COMBUSTIBLE</small><span>${v.combustible || '—'} ${v.distintivo ? `<span class="badge ${v.distintivo === '0' || v.distintivo === 'ECO' ? 'badge-success' : 'badge-info'}" style="font-size: 0.5rem; padding: 1px 3px;">${v.distintivo}</span>` : ''}</span></div>
          <div class="compact-item"><small>ÚLTIMA ITV</small><span>${fmt.date(v.ultimaITV) || '—'}</span></div>
          <div class="compact-item"><small>SANCIONES</small><span class="text-warning">👮 ${getMultasByVehicle(v.id).filter(m => m.estado === 'Pendiente').length} <small>pend.</small></span></div>
          <div class="compact-item"><small class="text-primary">GASTO TOTAL</small><strong class="gasto">${fmt.currency(v.gastoTotal)}</strong></div>
        </div>
        <div class="vehicle-card-actions">
          ${v.id !== activeVehicleId ? `<button class="btn btn-secondary btn-xs flex-1" data-sel="${v.id}">Seleccionar</button>` : '<span class="flex-1 text-[10px] text-accent font-bold px-2 uppercase tracking-tighter self-center">✓ Activo</span>'}
          <div class="flex gap-1">
            <button class="btn btn-ghost btn-xs" onclick="openSaleReport('${v.id}')" title="Ficha de Venta">📄</button>
            <button class="btn btn-ghost btn-xs" data-edit-veh="${v.id}" title="Editar vehículo">✏️</button>
            <button class="btn btn-danger btn-xs" data-del="${v.id}">✕</button>
          </div>
        </div>
      </div>`).join('')}
    </div>`}`;

  const showVehicleModal = (existingVeh = null) => {
    const isEdit = !!existingVeh;
    openModal(isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo', `<div class="form">
      ${!isEdit ? `<!-- DGT Lookup Row -->
      <div class="bg-primary/5 p-3 rounded-lg border border-primary/20 mb-4">
        <label class="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Consulta Automática por Bastidor (VIN)</label>
        <div class="flex gap-2">
          <input id="veh-bastidor" class="form-input flex-1" placeholder="Nº de Bastidor (17 caracteres)...">
          <button class="btn btn-primary btn-sm" id="btn-query-dgt">Consultar</button>
        </div>
        <p class="text-[9px] text-slate-400 mt-2 italic px-1">
          <span class="text-primary-400 font-bold">Nota:</span> El bastidor permite recuperar datos térmicos y de fábrica (Marca, Modelo, Motor). La <span class="text-white">Matrícula</span> y <span class="text-white">Fecha de Matriculación</span> deben introducirse manualmente.
        </p>
      </div>` : `<input type="hidden" id="veh-bastidor" value="${existingVeh.bastidor || ''}">`}

      <div class="form-row">
        <div class="form-group"><label>Marca *</label><input id="veh-marca" class="form-input" placeholder="Toyota" value="${existingVeh?.marca || ''}"></div>
        <div class="form-group"><label>Modelo *</label><input id="veh-modelo" class="form-input" placeholder="Corolla" value="${existingVeh?.modelo || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha de Matriculación *</label><input id="veh-fmat" type="date" class="form-input" value="${existingVeh?.fechaMatriculacion || ''}"></div>
        <div class="form-group"><label>Matrícula</label><input id="veh-mat" class="form-input" placeholder="1234 ABC" value="${existingVeh?.matricula || ''}"></div>
      </div>
      
      <div class="form-row">
        <div class="form-group"><label>Combustible</label><input id="veh-fuel" class="form-input" placeholder="Gasolina, Diésel..." value="${existingVeh?.combustible || ''}"></div>
        <div class="form-group"><label>Cilindrada</label><input id="veh-cc" class="form-input" placeholder="1.6, 2.0..." value="${existingVeh?.cilindrada || ''}"></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label>Distintivo Ambiental</label>
          <select id="veh-label" class="form-input">
            <option value="" ${!existingVeh?.distintivo ? 'selected' : ''}>Ninguno</option>
            <option value="0" ${existingVeh?.distintivo === '0' ? 'selected' : ''}>0 Emisiones (Azul)</option>
            <option value="ECO" ${existingVeh?.distintivo === 'ECO' ? 'selected' : ''}>ECO (Verde/Azul)</option>
            <option value="C" ${existingVeh?.distintivo === 'C' ? 'selected' : ''}>C (Verde)</option>
            <option value="B" ${existingVeh?.distintivo === 'B' ? 'selected' : ''}>B (Amarillo)</option>
          </select>
        </div>
        <div class="form-group"><label>Km actuales *</label><input id="veh-km" type="number" class="form-input" placeholder="45000" min="0" value="${existingVeh?.km || 0}"></div>
      </div>

      <div class="form-row">
        <div class="form-group"><label>Icono</label>
          <select id="veh-icon" class="form-input">
            <option value="🚗" ${existingVeh?.icono === '🚗' ? 'selected' : ''}>Turismo (🚗)</option>
            <option value="🚙" ${existingVeh?.icono === '🚙' ? 'selected' : ''}>SUV / 4x4 (🚙)</option>
            <option value="🚐" ${existingVeh?.icono === '🚐' ? 'selected' : ''}>Furgoneta (🚐)</option>
            <option value="🏍️" ${existingVeh?.icono === '🏍️' ? 'selected' : ''}>Moto (🏍️)</option>
            <option value="🏎️" ${existingVeh?.icono === '🏎️' ? 'selected' : ''}>Deportivo (🏎️)</option>
          </select>
        </div>
        <div class="form-group"><label>Última ITV favorable</label><input id="veh-ulitv" type="date" class="form-input" value="${existingVeh?.ultimaITV || ''}"></div>
      </div>

      <div class="form-actions pt-4 border-t border-white/5">
        <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-save-veh">${isEdit ? 'Guardar Cambios' : 'Registrar Vehículo'}</button>
      </div></div>`);

    if (!isEdit) {
      document.getElementById('btn-query-dgt').onclick = async (e) => {
        const vinInput = document.getElementById('veh-bastidor');
        const vin = vinInput.value.replace(/[^A-Za-z0-9]/g, '').trim();
        if (!vin || vin.length < 5) { showToast('⚠ Introduce un bastidor válido'); vinInput.focus(); return; }
        const btn = e.currentTarget; const originalText = btn.textContent;
        btn.innerHTML = '<span class="animate-pulse">🔍 Consultando...</span>'; btn.disabled = true;
        try {
          const data = await consultarDGT(vin);
          if (data) {
            document.getElementById('veh-marca').value = data.marca || '';
            document.getElementById('veh-modelo').value = data.modelo || '';
            if (data.año) document.getElementById('veh-fmat').value = `${data.año}-01-01`;
            document.getElementById('veh-fuel').value = data.combustible || '';
            document.getElementById('veh-cc').value = data.cilindrada || '';
            document.getElementById('veh-label').value = data.distintivo || '';
            showToast('✓ Datos técnicos volcados con éxito');
          } else {
            alert('No hemos podido identificar este bastidor en el registro global (NHTSA). Por favor, completa los campos manualmente.');
          }
        } catch (err) { alert('Hubo un problema de conexión. Inténtalo de nuevo.'); }
        finally { btn.textContent = originalText; btn.disabled = false; }
      };
    }

    document.getElementById('btn-save-veh').onclick = () => {
      const marca = document.getElementById('veh-marca').value.trim();
      const modelo = document.getElementById('veh-modelo').value.trim();
      const fmat = document.getElementById('veh-fmat').value;
      const km = document.getElementById('veh-km').value;

      if (!marca || !modelo || !fmat || !km) { alert('Completa los campos obligatorios (*)'); return; }

      const payload = {
        marca, modelo, fechaMatriculacion: fmat,
        año: parseInt(fmat.split('-')[0]),
        km: parseInt(km),
        matricula: document.getElementById('veh-mat').value.trim(),
        ultimaITV: document.getElementById('veh-ulitv').value,
        bastidor: document.getElementById('veh-bastidor').value.trim(),
        combustible: document.getElementById('veh-fuel').value.trim(),
        cilindrada: document.getElementById('veh-cc').value.trim(),
        distintivo: document.getElementById('veh-label').value,
        icono: document.getElementById('veh-icon').value
      };

      if (isEdit) {
        updateVehicle(existingVeh.id, payload);
        showToast('Datos del vehículo actualizados');
      } else {
        addVehicle(payload);
        showToast('Vehículo añadido');
      }
      closeModal(); renderGarage(); renderVehicleSelector();
    };
  };

  document.getElementById('btn-add-veh').onclick = () => showVehicleModal();
  content.querySelectorAll('[data-sel]').forEach(b => b.onclick = () => { setActiveVehicle(b.dataset.sel); router(); });
  content.querySelectorAll('[data-edit-veh]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const v = vehicles.find(x => x.id === b.dataset.editVeh);
    if (v) showVehicleModal(v);
  });
  content.querySelectorAll('[data-del]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
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

  // Apply filters
  const f = filters.revisiones;
  let items = getRevisionesByVehicle(v.id);
  if (f.q) {
    const q = f.q.toLowerCase();
    items = items.filter(r => r.operacion.toLowerCase().includes(q) || (r.notas && r.notas.toLowerCase().includes(q)) || r.id.toLowerCase().includes(q));
  }
  if (f.priority) items = items.filter(r => r.prioridad === f.priority);
  if (f.dateFrom) items = items.filter(r => r.fecha >= f.dateFrom);
  if (f.dateTo) items = items.filter(r => r.fecha <= f.dateTo);

  const total = items.reduce((s, r) => s + parseFloat(r.coste || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Revisiones</h1><p class="page-sub">Mantenimiento Preventivo</p></div>
      <button class="btn btn-primary" id="btn-add-rev">+ Añadir Revisión</button></div>
    
    ${renderFilterBar('revisiones')}

    ${!items.length ? emptySection('🔩', 'Sin revisiones registradas o que coincidan con los filtros') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Operación</th><th>Km</th><th>Coste</th><th>Próxima</th><th></th></tr></thead>
      <tbody>${items.map(r => `<tr>
        <td data-label="Fecha">${fmt.date(r.fecha)}</td>
        <td data-label="Operación"><strong>${r.operacion}</strong><br><small class="text-muted">${r.taller || ''} ${r.factura ? `| Fact: ${r.factura}` : ''}</small>${r.notas ? `<br><small class="text-muted">${r.notas}</small>` : ''}</td>
        <td data-label="Km">${fmt.km(r.km)}</td>
        <td data-label="Coste" class="gasto">${fmt.currency(r.coste)}</td>
        <td data-label="Próxima">${fmt.date(r.proximaFecha)}</td>
        <td class="text-right" style="white-space:nowrap">
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary btn-xs" data-edit="revisiones" data-id="${r.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-xs" data-delete="revisiones" data-id="${r.id}" title="Eliminar">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Revisiones</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;

  setupFilterListeners('revisiones', renderRevisiones);
  document.getElementById('btn-add-rev').onclick = () => openRevisionModal(null, renderRevisiones);
  setupDeleteBtns(renderRevisiones);
  setupEditBtns(renderRevisiones);
}

function openRevisionModal(id = null, rerender) {
  const v = getActiveVehicle();
  const s = getState();
  const isEdit = id !== null;
  const data = isEdit ? s.revisiones.find(r => r.id === id) : null;

  openModal(isEdit ? 'Editar Revisión' : 'Nueva Revisión / Factura', `<div class="form">
    <div class="form-row">
      <div class="form-group"><label>Operación Principal *</label><input id="rf-oper" class="form-input" placeholder="Ej: Cambio aceite" value="${data ? data.operacion : ''}"></div>
      <div class="form-group"><label>Km actuales *</label><input id="rf-km" type="number" class="form-input" value="${data ? data.km : v.km}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fecha *</label><input id="rf-fecha" type="date" class="form-input" value="${data ? data.fecha : fmt.today()}"></div>
      <div class="form-group"><label>Prioridad</label><select id="rf-pri" class="form-input">
        <option ${data && data.prioridad === 'Baja' ? 'selected' : ''}>Baja</option>
        <option ${data && data.prioridad === 'Media' ? 'selected' : ''}>Media</option>
        <option ${data && data.prioridad === 'Alta' ? 'selected' : ''}>Alta</option>
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Próxima Revisión (Fecha)</label><input id="rf-prox-f" type="date" class="form-input" value="${data ? data.proximaFecha : ''}"></div>
      <div class="form-group"><label>Coste Final (€)</label><input id="rf-coste" type="number" class="form-input" value="${data ? data.coste : ''}" readonly></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Taller / Comercio</label><input id="rf-taller" class="form-input" placeholder="Nombre del taller" value="${data ? (data.taller || '') : ''}"></div>
      <div class="form-group"><label>Nº Factura</label><input id="rf-fact" class="form-input" placeholder="Ref. factura" value="${data ? (data.factura || '') : ''}"></div>
    </div>
    <div class="form-group"><label>Forma de Pago</label>
      <select id="rf-pago" class="form-input">
        <option value="Tarjeta" ${data && data.formaPago === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
        <option value="Efectivo" ${data && data.formaPago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
        <option value="Transferencia" ${data && data.formaPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
        <option value="Bizum" ${data && data.formaPago === 'Bizum' ? 'selected' : ''}>Bizum</option>
      </select>
    </div>
    
    <!-- Invoice concepts -->
    <div class="invoice-items-wrap">
      <div class="invoice-header-ctrl" style="margin-bottom: 10px;">
        <label class="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-muted">
          <input type="checkbox" id="inv-iva-inc" ${data && data.ivaIncluido === false ? '' : 'checked'}> Precios incluyen IVA
        </label>
      </div>
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

    <div class="form-group"><label>Notas</label><textarea id="rf-notas" class="form-input form-textarea" placeholder="Observaciones adicionales...">${data ? (data.notas || '') : ''}</textarea></div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-rev">${isEdit ? 'Actualizar' : 'Registrar'}</button></div>
  </div>`);

  setupInvoiceLogic(data ? data.conceptos : null);

  document.getElementById('btn-save-rev').onclick = () => {
    const fields = {
      fecha: document.getElementById('rf-fecha').value,
      operacion: document.getElementById('rf-oper').value.trim(),
      coste: parseFloat(document.getElementById('rf-coste').value),
      km: parseFloat(document.getElementById('rf-km').value),
      proximaFecha: document.getElementById('rf-prox-f').value,
      prioridad: document.getElementById('rf-pri').value,
      notas: document.getElementById('rf-notas').value.trim(),
      taller: document.getElementById('rf-taller').value.trim(),
      factura: document.getElementById('rf-fact').value.trim(),
      formaPago: document.getElementById('rf-pago').value,
      ivaIncluido: document.getElementById('inv-iva-inc').checked,
      conceptos: getInvoiceItems()
    };
    if (!fields.fecha || !fields.operacion || isNaN(fields.coste)) { alert('Completa los campos obligatorios (*)'); return; }

    if (isEdit) updateRevision(id, fields);
    else addRevision(fields);

    updateVehicleKm(v.id, fields.km);
    closeModal(); rerender(); renderAlertBanner(v.id); showToast(isEdit ? 'Revisión actualizada' : 'Revisión registrada');
  };
}

/* ======================== AVERIAS ======================== */
function renderAverias() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Averías'); return; }

  // Apply filters
  const f = filters.averias;
  let items = getAveriasByVehicle(v.id);
  if (f.q) {
    const q = f.q.toLowerCase();
    items = items.filter(a => a.sintomas.toLowerCase().includes(q) || (a.diagnostico && a.diagnostico.toLowerCase().includes(q)) || (a.solucion && a.solucion.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q));
  }
  if (f.priority) items = items.filter(a => a.prioridad === f.priority);
  if (f.dateFrom) items = items.filter(a => a.fecha >= f.dateFrom);
  if (f.dateTo) items = items.filter(a => a.fecha <= f.dateTo);

  const total = items.reduce((s, a) => s + parseFloat(a.coste || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Averías</h1><p class="page-sub">Mantenimiento Correctivo</p></div>
      <button class="btn btn-primary" id="btn-add-ave">+ Nueva Avería</button></div>
    
    ${renderFilterBar('averias')}

    ${!items.length ? emptySection('⚠️', 'Sin averías registradas o que coincidan con los filtros') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Fecha</th><th>Síntomas</th><th>Diagnóstico</th><th>Solución</th><th>Coste</th><th></th></tr></thead>
      <tbody>${items.map(a => `<tr>
        <td data-label="Fecha">${fmt.date(a.fecha)}</td>
        <td data-label="Síntomas"><strong>${a.sintomas}</strong><br><small class="text-muted">${a.taller || ''} ${a.factura ? `| Fact: ${a.factura}` : ''}</small></td><td data-label="Diagnóstico">${a.diagnostico || '—'}</td><td data-label="Solución">${a.solucion || '—'}</td>
        <td data-label="Coste" class="gasto">${fmt.currency(a.coste)}</td>
        <td class="text-right" style="white-space:nowrap">
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary btn-xs" data-edit="averias" data-id="${a.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-xs" data-delete="averias" data-id="${a.id}" title="Eliminar">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Averías</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;

  setupFilterListeners('averias', renderAverias);
  document.getElementById('btn-add-ave').onclick = () => openAveriaModal(null, renderAverias);
  setupDeleteBtns(renderAverias);
  setupEditBtns(renderAverias);
}

function openAveriaModal(id = null, rerender) {
  const v = getActiveVehicle();
  const s = getState();
  const isEdit = id !== null;
  const data = isEdit ? s.averias.find(a => a.id === id) : null;

  openModal(isEdit ? 'Editar Avería' : 'Nueva Avería', `<div class="form">
    <div class="form-row">
      <div class="form-group"><label>Síntomas / Avería *</label><input id="af-sint" class="form-input" placeholder="Ej: Ruido al frenar" value="${data ? data.sintomas : ''}"></div>
      <div class="form-group"><label>Fecha *</label><input id="af-fecha" type="date" class="form-input" value="${data ? data.fecha : fmt.today()}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Prioridad</label><select id="af-pri" class="form-input">
        <option ${data && data.prioridad === 'Baja' ? 'selected' : ''}>Baja</option>
        <option ${data && data.prioridad === 'Media' ? 'selected' : ''}>Media</option>
        <option ${data && data.prioridad === 'Alta' ? 'selected' : ''}>Alta</option>
      </select></div>
      <div class="form-group"><label>KM actuales del vehículo *</label><input id="af-km" type="number" class="form-input" value="${data ? (data.km || 0) : v.km}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Taller / Comercio</label><input id="af-taller" class="form-input" placeholder="Nombre del taller" value="${data ? (data.taller || '') : ''}"></div>
      <div class="form-group"><label>Coste Final (€)</label><input id="af-coste" type="number" class="form-input" value="${data ? data.coste : ''}" readonly></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Taller / Comercio</label><input id="af-taller" class="form-input" placeholder="Nombre del taller" value="${data ? (data.taller || '') : ''}"></div>
      <div class="form-group"><label>Nº Factura</label><input id="af-fact" class="form-input" placeholder="Ref. factura" value="${data ? (data.factura || '') : ''}"></div>
    </div>
    <div class="form-group"><label>Forma de Pago</label>
      <select id="af-pago" class="form-input">
        <option value="Tarjeta" ${data && data.formaPago === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
        <option value="Efectivo" ${data && data.formaPago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
        <option value="Transferencia" ${data && data.formaPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
        <option value="Bizum" ${data && data.formaPago === 'Bizum' ? 'selected' : ''}>Bizum</option>
      </select>
    </div>
    
    <!-- Invoice concepts -->
    <div class="invoice-items-wrap">
      <div class="invoice-header-ctrl" style="margin-bottom: 10px;">
        <label class="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-muted">
          <input type="checkbox" id="inv-iva-inc" ${data && data.ivaIncluido === false ? '' : 'checked'}> Precios incluyen IVA
        </label>
      </div>
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
      <div class="form-group"><label>Diagnóstico</label><input id="af-diag" class="form-input" placeholder="Causa del problema" value="${data ? (data.diagnostico || '') : ''}"></div>
      <div class="form-group"><label>Solución / Reparación</label><input id="af-sol" class="form-input" placeholder="Qué se ha reparado" value="${data ? (data.solucion || '') : ''}"></div>
    </div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-ave">${isEdit ? 'Actualizar' : 'Registrar'}</button></div>
  </div>`);

  setupInvoiceLogic(data ? data.conceptos : null);

  document.getElementById('btn-save-ave').onclick = () => {
    const fields = {
      sintomas: document.getElementById('af-sint').value.trim(),
      fecha: document.getElementById('af-fecha').value,
      coste: parseFloat(document.getElementById('af-coste').value),
      km: parseFloat(document.getElementById('af-km').value),
      diagnostico: document.getElementById('af-diag').value.trim(),
      solucion: document.getElementById('af-sol').value.trim(),
      prioridad: document.getElementById('af-pri').value,
      taller: document.getElementById('af-taller').value.trim(),
      factura: document.getElementById('af-fact').value.trim(),
      formaPago: document.getElementById('af-pago').value,
      ivaIncluido: document.getElementById('inv-iva-inc').checked,
      conceptos: getInvoiceItems()
    };
    if (!fields.fecha || !fields.sintomas || isNaN(fields.coste)) { alert('Completa los campos obligatorios (*)'); return; }

    if (isEdit) updateAveria(id, fields);
    else addAveria(fields);

    updateVehicleKm(v.id, fields.km);

    closeModal(); rerender(); showToast(isEdit ? 'Avería actualizada' : 'Avería registrada');
  };
}

/* ======================== RECAMBIOS ======================== */
function renderRecambios() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Recambios'); return; }

  // Apply filters
  const f = filters.recambios;
  let items = getRecambiosByVehicle(v.id);
  if (f.q) {
    const q = f.q.toLowerCase();
    items = items.filter(r => r.nombre.toLowerCase().includes(q) || (r.referencia && r.referencia.toLowerCase().includes(q)) || (r.tienda && r.tienda.toLowerCase().includes(q)) || r.id.toLowerCase().includes(q));
  }
  if (f.link) {
    if (f.link === 'none') items = items.filter(r => !r.linkedTo);
    else items = items.filter(r => r.linkedTo && r.linkedTo.type === f.link);
  }
  if (f.dateFrom || f.dateTo) {
    items = items.filter(r => {
      const date = r.id.split('-')[1] ? new Date(parseInt(r.id.split('-')[1], 36)).toISOString().split('T')[0] : null;
      if (!date) return true;
      if (f.dateFrom && date < f.dateFrom) return false;
      if (f.dateTo && date > f.dateTo) return false;
      return true;
    });
  }

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
    
    ${renderFilterBar('recambios')}

    ${!items.length ? emptySection('📦', 'Sin recambios registrados o que coincidan con los filtros') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Pieza</th><th>Marca / Ref.</th><th>Tienda</th><th>Precio</th><th>Vinculado a</th><th></th></tr></thead>
      <tbody>${items.map(r => `<tr>
        <td data-label="Pieza"><strong>${r.nombre}</strong></td>
        <td data-label="Marca / Ref.">${r.marca || '—'}<br><small class="text-muted">${r.referencia || ''}</small></td>
        <td data-label="Tienda">${r.tienda || '—'}<br><small class="text-muted">${r.factura ? `Fact: ${r.factura}` : ''}</small></td>
        <td data-label="Precio" class="gasto">${fmt.currency(r.precio)}</td>
        <td data-label="Vinculado">${linkedLabel(r)}</td>
        <td class="text-right" style="white-space:nowrap">
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary btn-xs" data-edit="recambios" data-id="${r.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-xs" data-delete="recambios" data-id="${r.id}" title="Eliminar">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Recambios</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;

  setupFilterListeners('recambios', renderRecambios);
  document.getElementById('btn-add-rec').onclick = () => openRecambioModal(null, renderRecambios);
  setupDeleteBtns(renderRecambios);
  setupEditBtns(renderRecambios);
}

function openRecambioModal(id = null, rerender) {
  const v = getActiveVehicle();
  const s = getState();
  const isEdit = id !== null;
  const data = isEdit ? s.recambios.find(r => r.id === id) : null;

  const revOpts = getRevisionesByVehicle(v.id);
  const aveOpts = getAveriasByVehicle(v.id);
  const linkOpts = [
    '<option value="">Sin vínculo</option>',
    ...revOpts.map(r => `<option value="revision|${r.id}" ${data && data.linkedTo && data.linkedTo.id === r.id ? 'selected' : ''}>Revisión: ${r.operacion} (${fmt.date(r.fecha)})</option>`),
    ...aveOpts.map(a => `<option value="averia|${a.id}" ${data && data.linkedTo && data.linkedTo.id === a.id ? 'selected' : ''}>Avería: ${fmt.date(a.fecha)} — ${a.sintomas.substring(0, 30)}</option>`)
  ].join('');

  openModal(isEdit ? 'Editar Recambio' : 'Nuevo Recambio / Factura', `<div class="form">
    <div class="form-row">
      <div class="form-group"><label>Tienda / Proveedor *</label><input id="rr-tienda" class="form-input" placeholder="Ej: Amazon, Oscaro, Taller Pepe" value="${data ? data.tienda : ''}"></div>
      <div class="form-group"><label>Fecha *</label><input id="rr-fecha" type="date" class="form-input" value="${data ? data.fecha : fmt.today()}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>KM actuales *</label><input id="rr-km" type="number" class="form-input" value="${data ? (data.km || 0) : v.km}"></div>
      <div class="form-group"><label>Coste Final (€)</label><input id="rr-precio" type="number" class="form-input" value="${data ? data.precio : ''}" readonly></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Nº Factura</label><input id="rr-fact" class="form-input" placeholder="Ref. factura" value="${data ? (data.factura || '') : ''}"></div>
      <div class="form-group"><label>Forma de Pago</label>
        <select id="rr-pago" class="form-input">
          <option value="Tarjeta" ${data && data.formaPago === 'Tarjeta' ? 'selected' : ''}>Tarjeta</option>
          <option value="Efectivo" ${data && data.formaPago === 'Efectivo' ? 'selected' : ''}>Efectivo</option>
          <option value="Transferencia" ${data && data.formaPago === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
          <option value="Bizum" ${data && data.formaPago === 'Bizum' ? 'selected' : ''}>Bizum</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Vincular a</label><select id="rr-link" class="form-input">${linkOpts}</select></div>

    <!-- Invoice concepts -->
    <div class="invoice-items-wrap">
      <div class="invoice-header-ctrl" style="margin-bottom: 10px;">
        <label class="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-muted">
          <input type="checkbox" id="inv-iva-inc" ${data && data.ivaIncluido === false ? '' : 'checked'}> Precios incluyen IVA
        </label>
      </div>
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

    <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-rec">${isEdit ? 'Actualizar' : 'Registrar'}</button></div>
  </div>`);

  setupInvoiceLogic(data ? data.conceptos : null);

  document.getElementById('btn-save-rec').onclick = () => {
    const tienda = document.getElementById('rr-tienda').value.trim();
    const precio = parseFloat(document.getElementById('rr-precio').value);
    const fecha = document.getElementById('rr-fecha').value;
    const km = parseFloat(document.getElementById('rr-km').value);
    const lv = document.getElementById('rr-link').value;
    const linkedTo = lv ? { type: lv.split('|')[0], id: lv.split('|')[1] } : null;
    const factura = document.getElementById('rr-fact').value.trim();
    const formaPago = document.getElementById('rr-pago').value;
    const ivaIncluido = document.getElementById('inv-iva-inc').checked;
    const conceptos = getInvoiceItems();

    if (!tienda || isNaN(precio)) { alert('Completa la tienda y los importes'); return; }

    const fields = { nombre: data ? data.nombre : 'Recambio editado', referencia: data ? data.referencia : '', tienda, precio, fecha, km, linkedTo, factura, formaPago, ivaIncluido, conceptos };

    if (isEdit) updateRecambio(id, fields);
    else {
      // Si es nuevo, usamos la lógica de múltiples filas del invoice
      conceptos.forEach(item => {
        addRecambio({ nombre: item.desc, referencia: item.ref, tienda, precio: item.qty * item.price * (1 - item.dto / 100), fecha, km, linkedTo, factura, formaPago, conceptos: [item] });
      });
    }

    updateVehicleKm(v.id, fields.km);
    closeModal(); rerender(); showToast(isEdit ? 'Recambio actualizado' : 'Recambios registrados');
  };
}

/* ======================== ITV ======================== */
function renderITV() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('ITV'); return; }
  const items = getITVByVehicle(v.id).sort((a, b) => b.fechaInspeccion > a.fechaInspeccion ? 1 : -1);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">ITV</h1><p class="page-sub">Inspección Técnica de Vehículos</p></div>
      <button class="btn btn-primary" id="btn-add-itv">+ Registrar ITV</button></div>
    ${!items.length ? emptySection('🔍', 'Sin registros de ITV') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Fecha Insp.</th><th>Estación</th><th>Resultado</th><th>Factura / Importe</th><th>Vencimiento</th><th>Acciones</th></tr></thead>
      <tbody>${items.map(i => `<tr>
        <td data-label="Fecha Insp."><strong>${fmt.date(i.fechaInspeccion)}</strong></td>
        <td data-label="Estación">${i.estacion || '—'}</td>
        <td data-label="Resultado">${stateBadge(i.resultado)}${i.causa ? `<br><small class="text-danger italic">${i.causa}</small>` : ''}</td>
        <td data-label="Importe">
          ${i.factura ? `<small class="text-muted">Fact: ${i.factura}</small><br>` : ''}
          <span class="gasto">${fmt.currency(i.coste || 0)}</span>
        </td>
        <td data-label="Vencimiento">${fmt.date(i.fechaVencimiento)}</td>
        <td class="text-right" style="white-space:nowrap">
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary btn-xs" data-edit="itv" data-id="${i.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-xs" data-delete="itv" data-id="${i.id}">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`}`;

  document.getElementById('btn-add-itv').onclick = () => openITVModal();
  setupDeleteBtns(renderITV);
  setupEditBtns(renderITV);
}

function openITVModal(id = null) {
  const v = getActiveVehicle();
  const isEdit = id !== null;
  const data = isEdit ? getState().itv.find(i => i.id === id) : null;

  openModal(isEdit ? 'Editar ITV' : 'Registrar ITV', `<div class="form">
    <div class="form-row">
      <div class="form-group"><label>Fecha de inspección *</label><input id="itv-fecha" type="date" class="form-input" value="${data ? data.fechaInspeccion : fmt.today()}"></div>
      <div class="form-group"><label>Resultado *</label><select id="itv-res" class="form-input">
        <option ${data && data.resultado === 'Apto' ? 'selected' : ''}>Apto</option>
        <option ${data && data.resultado === 'Apto con Defectos' ? 'selected' : ''}>Apto con Defectos</option>
        <option ${data && data.resultado === 'No Apto' ? 'selected' : ''}>No Apto</option>
      </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Estación ITV</label><input id="itv-est" class="form-input" placeholder="Nombre centro ITV" value="${data ? (data.estacion || '') : ''}"></div>
      <div class="form-group"><label>Importe (€)</label><input id="itv-coste" type="number" class="form-input" placeholder="0,00" step="0.01" value="${data ? data.coste : ''}"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Nº Factura</label><input id="itv-fact" class="form-input" placeholder="Nº Factura..." value="${data ? (data.factura || '') : ''}"></div>
      <div class="form-group"><label>Causa Desfavorable (si aplica)</label><input id="itv-causa" class="form-input" placeholder="Motivo del rechazo" value="${data ? (data.causa || '') : ''}"></div>
    </div>
    <div class="form-group"><label>Fecha de vencimiento *</label><input id="itv-venc" type="date" class="form-input" value="${data ? data.fechaVencimiento : ''}"></div>
    <div class="form-group"><label>Notas adicionales</label><textarea id="itv-notas" class="form-input form-textarea" placeholder="Opcional">${data ? (data.notas || '') : ''}</textarea></div>
    <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-itv">${isEdit ? 'Actualizar' : 'Registrar'}</button></div>
  </div>`);

  document.getElementById('btn-save-itv').onclick = () => {
    const fields = {
      fechaInspeccion: document.getElementById('itv-fecha').value,
      resultado: document.getElementById('itv-res').value,
      estacion: document.getElementById('itv-est').value.trim(),
      coste: parseFloat(document.getElementById('itv-coste').value) || 0,
      factura: document.getElementById('itv-fact').value.trim(),
      causa: document.getElementById('itv-causa').value.trim(),
      fechaVencimiento: document.getElementById('itv-venc').value,
      notas: document.getElementById('itv-notas').value.trim()
    };
    if (!fields.fechaInspeccion || !fields.fechaVencimiento) { alert('Completa los campos obligatorios (*)'); return; }

    if (isEdit) updateITV(id, fields);
    else addITV(fields);

    // Actualizar vehículo si es favorable
    if (fields.resultado !== 'No Apto') {
      const s = getState();
      const veh = s.vehicles.find(x => x.id === v.id);
      if (veh) { veh.ultimaITV = fields.fechaInspeccion; saveState(); }
    }

    closeModal(); renderITV(); renderAlertBanner(v.id); showToast(isEdit ? 'Registro de ITV actualizado' : 'ITV registrada correctamente');
  };
}

/* ======================== SEGURO ======================== */
function renderSeguro() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Seguro'); return; }
  const items = getSeguroByVehicle(v.id);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Seguro</h1><p class="page-sub">Gestión de Pólizas y Coberturas</p></div>
      <button class="btn btn-primary" id="btn-add-seg">+ Nuevo Seguro</button></div>
    ${!items.length ? emptySection('🛡️', 'Sin pólizas de seguro registradas') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>Compañía / Póliza</th>
        <th>Cobertura / Tipo</th>
        <th>Precio / Pago</th>
        <th>Vencimiento</th>
        <th>Estado</th>
        <th class="text-right">Acciones</th>
      </tr></thead>
      <tbody>${items.map(s => `<tr>
        <td data-label="Compañía"><strong>${s.compania}</strong><br><small class="text-muted">Pól: ${s.poliza || 'S/N'}</small></td>
        <td data-label="Cobertura">${s.tipoSG}<br><small class="text-muted">${s.tipoPol || '—'}</small></td>
        <td data-label="Precio" class="gasto">${fmt.currency(s.precio)}<br><small class="text-muted">Pago: ${s.tipoPago}</small></td>
        <td data-label="Vencimiento">${fmt.date(s.fechaVencimiento)}</td>
        <td data-label="Estado">${daysBadge(s.fechaVencimiento)}</td>
        <td class="text-right">
            <div class="flex gap-2 justify-end">
              <button class="btn btn-ghost btn-xs" data-edit="seguro" data-id="${s.id}" title="Editar seguro" style="border:1px solid var(--clr-border)">✏️</button>
              <button class="btn btn-danger btn-xs btn-ghost" data-delete="seguro" data-id="${s.id}" title="Eliminar póliza">✕</button>
            </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`}
  `;

  document.getElementById('btn-add-seg').onclick = () => showSeguroModal();
  setupDeleteBtns(renderSeguro);
  setupEditBtns(renderSeguro);
}

function showSeguroModal(existingSeguro = null) {
  const v = getActiveVehicle();
  const isEdit = !!existingSeguro;
  openModal(isEdit ? 'Editar Póliza de Seguro' : 'Registrar Nuevo Seguro', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Compañía Aseguradora *</label><input id="sg-comp" class="form-input" placeholder="Ej: Mapfre" value="${existingSeguro?.compania || ''}"></div>
        <div class="form-group"><label>Nº de Póliza</label><input id="sg-pol" class="form-input" placeholder="Nº Póliza..." value="${existingSeguro?.poliza || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tipo de Seguro *</label><select id="sg-tipo-sg" class="form-input">
          <option ${existingSeguro?.tipoSG === 'Todo Riesgo' ? 'selected' : ''}>Todo Riesgo</option>
          <option ${existingSeguro?.tipoSG === 'Todo Riesgo con Franquicia' ? 'selected' : ''}>Todo Riesgo con Franquicia</option>
          <option ${existingSeguro?.tipoSG === 'Terceros Ampliado' ? 'selected' : ''}>Terceros Ampliado</option>
          <option ${existingSeguro?.tipoSG === 'Terceros' ? 'selected' : ''}>Terceros</option>
        </select></div>
        <div class="form-group"><label>Tipo de Póliza</label><input id="sg-tipo-pol" class="form-input" placeholder="Ej: Particular, Profesional..." value="${existingSeguro?.tipoPol || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Fecha de Vencimiento *</label><input id="sg-venc" type="date" class="form-input" value="${existingSeguro?.fechaVencimiento || ''}"></div>
        <div class="form-group"><label>Tipo de Pago *</label><select id="sg-pago" class="form-input">
          <option ${existingSeguro?.tipoPago === 'Anual' ? 'selected' : ''}>Anual</option>
          <option ${existingSeguro?.tipoPago === 'Semestral' ? 'selected' : ''}>Semestral</option>
          <option ${existingSeguro?.tipoPago === 'Trimestral' ? 'selected' : ''}>Trimestral</option>
          <option ${existingSeguro?.tipoPago === 'Mensual' ? 'selected' : ''}>Mensual</option>
        </select></div>
      </div>
      <div class="form-group"><label>Importe del Recibo (€) *</label><input id="sg-precio" type="number" class="form-input" placeholder="0.00" step="0.01" value="${existingSeguro?.precio || ''}"></div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-seg">${isEdit ? 'Guardar Cambios' : 'Registrar Seguro'}</button></div>
    </div>`);

  document.getElementById('btn-save-seg').onclick = () => {
    const comp = document.getElementById('sg-comp').value.trim();
    const venc = document.getElementById('sg-venc').value;
    const precio = document.getElementById('sg-precio').value;

    if (!comp || !venc || precio === '') { alert('Completa los campos obligatorios (*)'); return; }

    const data = {
      compania: comp,
      poliza: document.getElementById('sg-pol').value.trim(),
      tipoSG: document.getElementById('sg-tipo-sg').value,
      tipoPol: document.getElementById('sg-tipo-pol').value.trim(),
      fechaVencimiento: venc,
      tipoPago: document.getElementById('sg-pago').value,
      precio: parseFloat(precio)
    };

    if (isEdit) {
      updateSeguro(existingSeguro.id, data);
      showToast('Póliza actualizada correctamente');
    } else {
      addSeguro(data);
      showToast('Póliza de seguro registrada — Gasto actualizado');
    }

    closeModal(); renderSeguro(); renderAlertBanner(v.id);
  };
}

/* ======================== MULTAS ======================== */
function renderMultas() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Multas'); return; }
  const items = getMultasByVehicle(v.id);
  const totalPag = items.filter(m => m.estado === 'Pagada').reduce((s, m) => s + parseFloat(m.importePagado || 0), 0);
  const totalPend = items.filter(m => m.estado === 'Pendiente').reduce((s, m) => s + parseFloat(m.importe || 0), 0);

  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Multas</h1><p class="page-sub">Gestión de Sanciones DGT/Otras</p></div>
      <button class="btn btn-primary" id="btn-add-mul">+ Nueva Multa</button></div>
    ${!items.length ? emptySection('📋', 'Sin multas registradas') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr>
        <th>Expediente</th>
        <th>Fecha Denuncia / Provincia</th>
        <th>Hecho</th>
        <th>Importes</th>
        <th>Estado / Vencimiento</th>
        <th>Acción</th>
        <th></th>
      </tr></thead>
      <tbody>${items.map(m => {
    const hechoText = m.hecho || m.motivo || 'Sin detalles';
    return `<tr>
        <td data-label="Expediente"><code class="id-code" title="ID: ${m.id}">${m.expediente || 'S/N'}</code></td>
        <td data-label="Fecha / Prov.">${fmt.date(m.fechaDenuncia || m.fechaLimite)}<br><small class="text-muted">${m.provincia || '—'}</small></td>
        <td data-label="Hecho"><span title="${hechoText}">${hechoText.substring(0, 30)}${hechoText.length > 30 ? '...' : ''}</span></td>
        <td data-label="Importes">
          <small class="text-muted">Denuncia: ${fmt.currency(m.importe)}</small><br>
          <strong class="${m.estado === 'Pagada' ? 'gasto' : 'text-primary'}">${m.estado === 'Pagada' ? `Pagado: ${fmt.currency(m.importePagado)}` : `Pend: ${fmt.currency(m.importe)}`}</strong>
        </td>
        <td data-label="Estado">
          ${stateBadge(m.estado)}<br>
          <small>${m.estado === 'Pagada' ? `Pagada el: ${fmt.date(m.fechaPago)}` : `Límite: ${fmt.date(m.fechaLimite)} ${daysBadge(m.fechaLimite)}`}</small>
        </td>
        <td data-label="Acción">
          ${m.estado === 'Pendiente' ? `<button class="btn btn-primary btn-xs" data-pay="${m.id}">✓ Pagar</button>` : '—'}
        </td>
        <td class="text-right">
          <div class="flex gap-1 justify-end">
            <button class="btn btn-ghost btn-xs" data-edit="multas" data-id="${m.id}" title="Editar multa" style="border:1px solid var(--clr-border)">✏️</button>
            <button class="btn btn-danger btn-xs" data-delete="multas" data-id="${m.id}">✕</button>
          </div>
        </td>
      </tr>`;
  }).join('')}</tbody>
    </table></div>
    <div class="totals-bar">
      <span>Total Pagado: <strong class="gasto">${fmt.currency(totalPag)}</strong> &nbsp;|&nbsp; Deuda Pendiente: <strong style="color:var(--clr-warning)">${fmt.currency(totalPend)}</strong></span>
    </div>`}`;

  document.getElementById('btn-add-mul').onclick = () => showMultaModal();

  c.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => {
    const multaId = b.dataset.pay;
    const m = items.find(x => x.id === multaId);
    openModal('Registrar Pago', `<div class="form">
        <p class="mb-4">Vas a marcar como pagada la denuncia <strong>${m.expediente}</strong>.</p>
        <div class="form-row">
          <div class="form-group"><label>Importe Real Pagado (€) *</label><input id="mp-imp" type="number" class="form-input" value="${m.importe * 0.5}" step="0.01"></div>
          <div class="form-group"><label>Fecha de Pago *</label><input id="mp-fecha" type="date" class="form-input" value="${fmt.today()}"></div>
        </div>
        <p class="text-[10px] text-slate-500 italic">Por defecto se aplica el 50% de descuento por pronto pago.</p>
        <div class="form-actions mt-4"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-confirm-pay">Confirmar Pago</button></div>
      </div>`);
    document.getElementById('btn-confirm-pay').onclick = () => {
      const imp = document.getElementById('mp-imp').value;
      const fecha = document.getElementById('mp-fecha').value;
      if (imp === '' || !fecha) return;
      updateMultaEstado(multaId, 'Pagada', parseFloat(imp), fecha);
      closeModal(); renderMultas(); showToast('Pago registrado — Gasto actualizado');
    };
  });

  setupDeleteBtns(renderMultas);
  setupEditBtns(renderMultas);
}

function showMultaModal(existingMulta = null) {
  const v = getActiveVehicle();
  const isEdit = !!existingMulta;
  openModal(isEdit ? 'Editar Multa' : 'Registrar Multa / Denuncia', `<div class="form">
      <div class="form-row">
        <div class="form-group"><label>Nº Expediente *</label><input id="ml-exp" class="form-input" placeholder="Ej: 12.345.678-9" value="${existingMulta?.expediente || ''}"></div>
        <div class="form-group"><label>Fecha Denuncia *</label><input id="ml-fden" type="date" class="form-input" value="${existingMulta?.fechaDenuncia || fmt.today()}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Provincia / Municipio</label><input id="ml-prov" class="form-input" placeholder="Ej: Madrid" value="${existingMulta?.provincia || ''}"></div>
        <div class="form-group"><label>Estado inicial</label><select id="ml-estado" class="form-input">
          <option ${existingMulta?.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
          <option ${existingMulta?.estado === 'Pagada' ? 'selected' : ''}>Pagada</option>
        </select></div>
      </div>
      <div class="form-group"><label>Hecho Denunciado *</label>
        <textarea id="ml-hecho" class="form-input form-textarea" placeholder="Describe brevemente la infracción...">${existingMulta?.hecho || existingMulta?.motivo || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Importe Denuncia (€) *</label><input id="ml-imp" type="number" class="form-input" placeholder="100.00" step="0.01" value="${existingMulta?.importe || ''}"></div>
        <div class="form-group"><label>Fecha Límite (Pronto Pago)</label><input id="ml-flim" type="date" class="form-input" value="${existingMulta?.fechaLimite || ''}"></div>
      </div>
      <div id="ml-pay-fields" style="display: ${existingMulta?.estado === 'Pagada' ? 'block' : 'none'};">
        <div class="form-row bg-primary/5 p-3 rounded-lg border border-primary/20">
          <div class="form-group"><label>Importe Pagado (€) *</label><input id="ml-imp-pag" type="number" class="form-input" placeholder="50.00" step="0.01" value="${existingMulta?.importePagado || ''}"></div>
          <div class="form-group"><label>Fecha de Pago *</label><input id="ml-fpag" type="date" class="form-input" value="${existingMulta?.fechaPago || fmt.today()}"></div>
        </div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-save-mul">${isEdit ? 'Guardar Cambios' : 'Registrar Multa'}</button></div>
    </div>`);

  const estSel = document.getElementById('ml-estado');
  const payDiv = document.getElementById('ml-pay-fields');
  estSel.onchange = () => { payDiv.style.display = estSel.value === 'Pagada' ? 'block' : 'none'; };

  document.getElementById('btn-save-mul').onclick = () => {
    const exp = document.getElementById('ml-exp').value.trim();
    const fden = document.getElementById('ml-fden').value;
    const hecho = document.getElementById('ml-hecho').value.trim();
    const imp = document.getElementById('ml-imp').value;

    if (!exp || !fden || !hecho || imp === '') { alert('Completa los campos obligatorios (*)'); return; }

    const estado = estSel.value;
    const data = {
      expediente: exp,
      fechaDenuncia: fden,
      provincia: document.getElementById('ml-prov').value.trim(),
      estado,
      hecho,
      importe: parseFloat(imp),
      fechaLimite: document.getElementById('ml-flim').value || '',
      importePagado: 0,
      fechaPago: ''
    };

    if (estado === 'Pagada') {
      const impPag = document.getElementById('ml-imp-pag').value;
      const fPag = document.getElementById('ml-fpag').value;
      if (impPag === '' || !fPag) { alert('Indica el importe y la fecha del pago'); return; }
      data.importePagado = parseFloat(impPag);
      data.fechaPago = fPag;
    }

    if (isEdit) {
      updateMulta(existingMulta.id, data);
      showToast('Multa actualizada');
    } else {
      addMulta(data);
      showToast('Sanción registrada correctamente');
    }

    closeModal(); renderMultas(); renderAlertBanner(v.id);
  };
}

/* ======================== OTROS ======================== */
function renderOtros() {
  const v = getActiveVehicle(); const c = document.getElementById('main-content');
  if (!v) { c.innerHTML = noVehicle('Otros / Impuestos'); return; }
  const items = getOtrosByVehicle(v.id);
  const total = items.reduce((s, o) => s + parseFloat(o.importe || 0), 0);
  c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Otros</h1><p class="page-sub">Impuestos y Permisos</p></div>
      <button class="btn btn-primary" id="btn-add-otro">+ Añadir Registro</button></div>
    ${!items.length ? emptySection('📁', 'Sin registros adicionales') : `
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>ID</th><th>Descripción</th><th>Importe</th><th>Vencimiento</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead>
      <tbody>${items.map(o => `<tr>
        <td data-label="ID"><code class="id-code">${o.id}</code></td>
        <td data-label="Descripción"><strong>${o.descripcion}</strong></td>
        <td data-label="Importe" class="gasto">${fmt.currency(o.importe)}</td>
        <td data-label="Vencimiento">${fmt.date(o.fechaVencimiento)}</td>
        <td data-label="Estado">${daysBadge(o.fechaVencimiento)}</td>
        <td class="text-right">
          <div class="flex gap-2 justify-end">
            <button class="btn btn-secondary btn-xs" data-edit="otros" data-id="${o.id}" title="Editar">✎</button>
            <button class="btn btn-danger btn-xs" data-delete="otros" data-id="${o.id}">✕</button>
          </div>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="totals-bar"><span>Total en Otros</span><span class="gasto">${fmt.currency(total)}</span></div>`}`;

  document.getElementById('btn-add-otro').onclick = () => openOtroModal(null, renderOtros);
  setupDeleteBtns(renderOtros);
  setupEditBtns(renderOtros);
}

function openOtroModal(id = null, rerender) {
  const v = getActiveVehicle();
  const isEdit = id !== null;
  const data = isEdit ? getState().otros.find(o => o.id === id) : null;

  openModal(isEdit ? 'Editar Registro' : 'Nuevo Registro', `<div class="form">
      <div class="form-group"><label>Descripción *</label><input id="ot-desc" class="form-input" placeholder="Ej: Impuesto de circulación" value="${data ? data.descripcion : ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>Importe (€) *</label><input id="ot-imp" type="number" class="form-input" placeholder="0.00" step="0.01" min="0" value="${data ? data.importe : ''}"></div>
        <div class="form-group"><label>Fecha de vencimiento</label><input id="ot-venc" type="date" class="form-input" value="${data ? data.fechaVencimiento : ''}"></div>
      </div>
      <div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" id="btn-save-otro">${isEdit ? 'Actualizar' : 'Registrar'}</button></div>
    </div>`);

  document.getElementById('btn-save-otro').onclick = () => {
    const desc = document.getElementById('ot-desc').value.trim();
    const imp = parseFloat(document.getElementById('ot-imp').value);
    if (!desc || isNaN(imp)) { alert('Completa los campos obligatorios (*)'); return; }
    const fields = { descripcion: desc, importe: imp, fechaVencimiento: document.getElementById('ot-venc').value };

    if (isEdit) updateOtro(id, fields);
    else addOtro(fields);

    closeModal(); rerender(); renderAlertBanner(v.id);
    showToast(isEdit ? 'Registro actualizado' : 'Registro añadido — Gasto actualizado');
  };
}


/* ======================== CALENDARIO GLOBAL ======================== */
function renderCalendar() {
  const c = document.getElementById('main-content');
  const { vehicles } = getState();
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const allAlerts = [];
  vehicles.forEach(v => {
    collectAlerts(v.id, null).forEach(a => {
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

/* ======================== NOTIFICACIONES GLOBALES ======================== */
function updateGlobalAlertBadge() {
  const badge = document.getElementById('global-alert-count');
  if (!badge) return;
  const allAlerts = collectAllGlobalAlerts(null);
  const count = allAlerts.length;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderGlobalAlerts() {
  const c = document.getElementById('main-content');
  const alerts = collectAllGlobalAlerts(null);

  c.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Centro de Notificaciones</h1>
        <p class="page-sub">Estado crítico de mantenimiento de toda la flota</p>
      </div>
    </div>

    ${!alerts.length ? emptySection('🔔', 'No hay alertas pendientes. ¡Todo en orden!') : `
      <div style="max-width: 800px; margin: 0 auto;">
        ${alerts.map(a => `
          <div class="alert-card alert-${a.type}" onclick="setActiveVehicle('${a.vehicleId}'); window.location.hash='#/'">
            <div class="alert-card-icon">${a.days <= 0 ? '🚨' : '⚠️'}</div>
            <div class="alert-card-content">
              <div class="alert-card-vehicle">${a.vehicleName}</div>
              <div class="alert-card-title">${a.message}</div>
              <div class="alert-card-days">
                ${a.days < 0 ? `Vencido hace ${Math.abs(a.days)} días` : a.days === 0 ? '¡VENCE HOY!' : `Vence en ${a.days} días`}
              </div>
            </div>
            <div style="align-self:center; opacity:0.5">❯</div>
          </div>
        `).join('')}
      </div>
    `}
  `;
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

function setupEditBtns(rerender) {
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    const col = b.dataset.edit;
    const id = b.dataset.id;
    if (col === 'revisiones') openRevisionModal(id, rerender);
    if (col === 'averias') openAveriaModal(id, rerender);
    if (col === 'recambios') openRecambioModal(id, rerender);
    if (col === 'itv') openITVModal(id);
    if (col === 'seguro') showSeguroModal(getState().seguro.find(s => s.id === id));
    if (col === 'multas') showMultaModal(getState().multas.find(m => m.id === id));
    if (col === 'otros') openOtroModal(id, rerender);
    if (col === 'documentos') openDocumentoModal(id, rerender);
    if (col === 'viajes') {
      const t = getState().viajes.find(v => v.id === id);
      const newDest = prompt('Nuevo destino:', t.destino);
      if (newDest) {
        t.destino = newDest;
        saveState();
        if (typeof rerender === 'function') rerender();
      }
    }
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

// Theme Management
function initTheme() {
  const theme = localStorage.getItem('mm-theme') || 'dark';
  applyTheme(theme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  if (theme === 'light') {
    html.classList.add('light-mode');
    html.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Modo Claro';
  } else {
    html.classList.remove('light-mode');
    html.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Modo Oscuro';
  }
}

function toggleTheme() {
  const current = document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
  const newTheme = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('mm-theme', newTheme);
  applyTheme(newTheme);
}

// Search and Workshop listeners
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.onclick = toggleTheme;

  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.oninput = (e) => globalSearch(e.target.value.trim());
  }
});

router();
