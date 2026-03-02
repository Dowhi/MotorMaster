/* ===== STATE.JS — MotorMaster localStorage store ===== */

const STATE_KEY = 'motormaster_v1';

function _initState() {
  return {
    vehicles: [],
    activeVehicleId: null,
    mainVehicleId: null,
    accentColor: '#00C2E0',
    revisiones: [],
    averias: [],
    recambios: [],
    itv: [],
    seguro: [],
    multas: [],
    otros: [],
    documentos: [],
    viajes: [],
    kmIntervals: {},
    retroMode: false,
    uiScale: 100 // Porcentaje (100 = normal)
  };
}

function loadState() {
  try {
    const s = localStorage.getItem(STATE_KEY);
    const parsed = s ? JSON.parse(s) : _initState();
    const initial = _initState();
    Object.keys(initial).forEach(k => {
      if (parsed[k] === undefined) parsed[k] = initial[k];
    });
    // Apply custom accent color if exists
    if (parsed.accentColor) document.documentElement.style.setProperty('--clr-accent', parsed.accentColor);
    // Apply retro mode if active
    if (parsed.retroMode) document.body.classList.add('retro-mode');
    // Apply UI Scale
    if (parsed.uiScale) document.documentElement.style.fontSize = `${parsed.uiScale}%`;
    return parsed;
  }
  catch { return _initState(); }
}

let _state = loadState();
let _currentUser = null;
let _syncTimeout = null;
let _isLoadedFromCloud = false; // Flag para evitar sobrescribir datos antes de cargar

// Firebase Auth listener
firebase.auth().onAuthStateChanged(user => {
  _currentUser = user;
  if (user) {
    console.log("Usuario identificado:", user.email);
    loadFromFirestore();
  } else {
    console.log("Modo local (Sin usuario)");
    _state = loadState();
    _isLoadedFromCloud = false;
  }
  // Forzar refresco de la UI tras cambio de auth
  if (typeof router === 'function') router();
});

async function loadFromFirestore() {
  if (!_currentUser) return;
  try {
    const doc = await firebase.firestore().collection('users').doc(_currentUser.uid).get();
    if (doc.exists) {
      const remoteData = doc.data();
      // Mezclar datos locales con remotos (preferencia a remotos)
      _state = { ..._state, ...remoteData };
      console.log("Datos cargados desde la nube");
    } else {
      console.log("No hay datos en la nube, usando locales");
    }

    _isLoadedFromCloud = true; // Decimos que ya "sabemos" lo que hay (o no hay)

    if (!doc.exists) {
      console.log("No hay datos en la nube, subiendo los locales actuales...");
      await saveToFirestore();
    }

    saveState(false); // Solo local para actualizar caché
    if (typeof router === 'function') router();
  } catch (err) {
    console.error("Error al cargar de Firestore:", err);
  }
}

async function saveToFirestore() {
  if (!_currentUser || !_isLoadedFromCloud) return;
  try {
    await firebase.firestore().collection('users').doc(_currentUser.uid).set(_state);
    console.log("Nube actualizada");
  } catch (err) {
    console.error("Error al guardar en Firestore:", err);
  }
}

function getState() { return _state; }

function saveState(sync = true) {
  localStorage.setItem(STATE_KEY, JSON.stringify(_state));
  if (sync && _currentUser) {
    clearTimeout(_syncTimeout);
    _syncTimeout = setTimeout(saveToFirestore, 1500); // Debounce
  }
}

function resetState(newState) {
  _state = newState || _initState();
  saveState();
}

function setMainVehicle(vid) { _state.mainVehicleId = vid; saveState(); }
function setAccentColor(color) {
  _state.accentColor = color;
  document.documentElement.style.setProperty('--clr-accent', color);
  saveState();
}
function setRetroMode(active) {
  _state.retroMode = active;
  document.body.classList.toggle('retro-mode', active);
  saveState();
}
function setUiScale(scale) {
  _state.uiScale = scale;
  document.documentElement.style.fontSize = `${scale}%`;
  saveState();
}

/* User 14: KM Intervals */
function setKmInterval(vehicleId, op, km) {
  if (!_state.kmIntervals[vehicleId]) _state.kmIntervals[vehicleId] = {};
  _state.kmIntervals[vehicleId][op] = km;
  saveState();
}

function generateId(prefix) {
  const ts = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${r}`;
}

function getActiveVehicle() {
  const v = _state.vehicles.find(v => v.id === _state.activeVehicleId) || _state.vehicles.find(v => v.id === _state.mainVehicleId) || _state.vehicles[0] || null;
  if (v && !_state.activeVehicleId) _state.activeVehicleId = v.id;
  return v;
}

/* ---- VEHICLES ---- */
function addVehicle(data) {
  const v = {
    gastoTotal: 0,
    bastidor: '',
    combustible: '',
    cilindrada: '',
    distintivo: '',
    fechaMatriculacion: '',
    ultimaITV: '',
    ...data,
    id: generateId('VEH')
  };
  _state.vehicles.push(v);
  if (!_state.activeVehicleId) _state.activeVehicleId = v.id;
  if (!_state.mainVehicleId) _state.mainVehicleId = v.id;
  saveState(); return v;
}
function setActiveVehicle(id) { _state.activeVehicleId = id; saveState(); }
function updateVehicle(id, data) {
  const idx = _state.vehicles.findIndex(v => v.id === id);
  if (idx !== -1) {
    _state.vehicles[idx] = { ..._state.vehicles[idx], ...data };
    saveState();
  }
}
function updateVehicleKm(vehicleId, km) {
  const v = _state.vehicles.find(v => v.id === vehicleId);
  if (v) { v.km = km; saveState(); }
}
function addGasto(vehicleId, amount) {
  const v = _state.vehicles.find(v => v.id === vehicleId);
  if (v && parseFloat(amount) > 0) { v.gastoTotal = (v.gastoTotal || 0) + parseFloat(amount); saveState(); }
}

/* ---- REVISIONES ---- */
function addRevision(data) {
  const r = { ...data, id: generateId('REV'), vehicleId: _state.activeVehicleId };
  _state.revisiones.push(r);
  addGasto(_state.activeVehicleId, data.coste);
  saveState(); return r;
}
function getRevisionesByVehicle(vid) { return _state.revisiones.filter(r => r.vehicleId === vid); }

/* ---- AVERIAS ---- */
function addAveria(data) {
  const a = { ...data, id: generateId('AVE'), vehicleId: _state.activeVehicleId };
  _state.averias.push(a);
  addGasto(_state.activeVehicleId, data.coste);
  saveState(); return a;
}
function getAveriasByVehicle(vid) { return _state.averias.filter(a => a.vehicleId === vid); }

/* ---- RECAMBIOS ---- */
function addRecambio(data) {
  const r = { ...data, id: generateId('REC'), vehicleId: _state.activeVehicleId };
  _state.recambios.push(r);
  addGasto(_state.activeVehicleId, data.precio);
  saveState(); return r;
}
function getRecambiosByVehicle(vid) { return _state.recambios.filter(r => r.vehicleId === vid); }

/* ---- ITV ---- */
function addITV(data) {
  const i = { ...data, id: generateId('ITV'), vehicleId: _state.activeVehicleId };
  _state.itv.push(i); if (data.coste) addGasto(_state.activeVehicleId, data.coste);
  saveState(); return i;
}
function getITVByVehicle(vid) { return _state.itv.filter(i => i.vehicleId === vid); }

/* ---- SEGURO ---- */
function addSeguro(data) {
  const s = { ...data, id: generateId('SEG'), vehicleId: _state.activeVehicleId };
  _state.seguro.push(s);
  if (data.precio) addGasto(_state.activeVehicleId, data.precio);
  saveState(); return s;
}
function updateSeguro(id, data) {
  const sIndex = _state.seguro.findIndex(s => s.id === id);
  if (sIndex === -1) return;
  const s = _state.seguro[sIndex];

  // Ajustar gasto si el precio cambia
  const oldPrecio = parseFloat(s.precio || 0);
  const newPrecio = parseFloat(data.precio || 0);
  if (oldPrecio !== newPrecio) {
    const v = _state.vehicles.find(v => v.id === s.vehicleId);
    if (v) v.gastoTotal = (parseFloat(v.gastoTotal) || 0) - oldPrecio + newPrecio;
  }

  _state.seguro[sIndex] = { ...s, ...data };
  saveState();
}
function getSeguroByVehicle(vid) { return _state.seguro.filter(s => s.vehicleId === vid); }

/* ---- MULTAS ---- */
function addMulta(data) {
  const m = { ...data, id: generateId('MUL'), vehicleId: _state.activeVehicleId };
  _state.multas.push(m);
  if (data.estado === 'Pagada') {
    addGasto(_state.activeVehicleId, data.importePagado || data.importe);
  }
  saveState(); return m;
}
function updateMulta(id, data) {
  const mIndex = _state.multas.findIndex(m => m.id === id);
  if (mIndex === -1) return;

  const m = _state.multas[mIndex];

  // Re-ajustar gasto si el importe pagado cambia
  if (m.estado === 'Pagada') {
    const oldImporte = parseFloat(m.importePagado || 0);
    const newImporte = parseFloat(data.importePagado || 0);
    if (oldImporte !== newImporte) {
      // Restar el anterior y sumar el nuevo
      const v = _state.vehicles.find(v => v.id === m.vehicleId);
      if (v) v.gastoTotal = (parseFloat(v.gastoTotal) || 0) - oldImporte + newImporte;
    }
  } else if (data.estado === 'Pagada') {
    // Si ha pasado de Pendiente a Pagada dándole a editar
    addGasto(m.vehicleId, data.importePagado || data.importe);
  }

  _state.multas[mIndex] = { ...m, ...data };
  saveState();
}
function updateMultaEstado(id, estado, importePagado, fechaPago) {
  const m = _state.multas.find(m => m.id === id);
  if (!m) return;
  if (m.estado !== 'Pagada' && estado === 'Pagada') {
    m.importePagado = importePagado || m.importe;
    m.fechaPago = fechaPago || new Date().toISOString().split('T')[0];
    addGasto(m.vehicleId, m.importePagado);
  }
  m.estado = estado;
  saveState();
}
function getMultasByVehicle(vid) { return _state.multas.filter(m => m.vehicleId === vid); }

/* ---- OTROS ---- */
function addOtro(data) {
  const o = { ...data, id: generateId('OTR'), vehicleId: _state.activeVehicleId };
  _state.otros.push(o);
  addGasto(_state.activeVehicleId, data.importe);
  saveState(); return o;
}
function getOtrosByVehicle(vid) { return _state.otros.filter(o => o.vehicleId === vid); }

/* ---- DOCUMENTOS ---- */
function addDocumento(data) {
  const d = { ...data, id: generateId('DOC'), vehicleId: _state.activeVehicleId };
  _state.documentos.push(d); saveState(); return d;
}
function getDocsByVehicle(vid) { return _state.documentos.filter(d => d.vehicleId === vid); }

/* User 6: Viajes */
function addTripChecklist(data) {
  const t = { ...data, id: generateId('TRP'), vehicleId: _state.activeVehicleId, checks: [] };
  _state.viajes.push(t); saveState(); return t;
}
function updateTripCheck(id, index, checked) {
  const t = _state.viajes.find(v => v.id === id);
  if (t) { t.checks[index] = checked; saveState(); }
}

/* ---- DELETE ---- */
function deleteRecord(collection, id) {
  _state[collection] = _state[collection].filter(r => r.id !== id);
  saveState();
}
