// --- CONFIGURACIÓN FIREBASE ENSAMBLADA ---
const firebaseConfig = {
  apiKey: "AIzaSyCVhnME4BZ52p43hMmitlpc7bvwDjEhy38",
  authDomain: "fedixcapital.firebaseapp.com",
  databaseURL: "https://fedixcapital-default-rtdb.firebaseio.com",
  projectId: "fedixcapital",
  storageBucket: "fedixcapital.firebasestorage.app",
  messagingSenderId: "140437620085",
  appId: "1:140437620085:web:60f8cde7d177e3a4933f3c"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let baseDatos = [];
let solicitudesEspera = [];
let montoGlobal = 0;
let clienteSesion = null;

// ESCUCHAR CAMBIOS EN TIEMPO REAL
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val();
    baseDatos = data?.clientes || [];
    solicitudesEspera = data?.solicitudes || [];
    
    if (document.getElementById('dashboard-admin').style.display === 'block') {
        renderizarAdmin();
    } else if (clienteSesion !== null) {
        renderizarCliente(baseDatos[clienteSesion]);
    }
});

function sincronizarNube() {
    db.ref('/').set({ clientes: baseDatos, solicitudes: solicitudesEspera });
}

function intentarLogin() {
  const emailInput = document.getElementById('email').value.toLowerCase().trim();
  const passInput = document.getElementById('pass').value.trim();
  
  // Acceso de Alvaro (Administrador)
  if (emailInput === "alvaro.luis.c85@gmail.com" && passInput === "carpediem*852.") {
    mostrarPantalla('dashboard-admin'); renderizarAdmin(); return;
  }
  
  const index = baseDatos.findIndex(u => u.correo === emailInput && u.pass === passInput);
  if (index !== -1) {
    clienteSesion = index; mostrarPantalla('dashboard-cliente'); renderizarCliente(baseDatos[index]);
  } else { alert("ACCESO DENEGADO"); }
}

function crearPrestamo() {
  const nombre = document.getElementById('cliente-nombre').value.toUpperCase();
  const correo = document.getElementById('cliente-correo').value.toLowerCase().trim();
  const pass = document.getElementById('cliente-pass').value;
  const capital = parseFloat(document.getElementById('monto-base').value);
  const meses = parseInt(document.getElementById('cuotas').value);

  if(!correo || isNaN(capital) || isNaN(meses)) return alert("FALTAN DATOS");

  const interesMensual = 0.16; // 16% Simple mensual
  const interesTotal = capital * interesMensual * meses;
  const montoTotal = capital + interesTotal;
  const valorCuota = (montoTotal / meses).toFixed(2);

  const cuotasArray = [];
  let fechaBase = new Date();

  for (let i = 1; i <= meses; i++) {
    let fechaVence = new Date();
    fechaVence.setMonth(fechaBase.getMonth() + i);
    const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
    
    cuotasArray.push({
      nro: i,
      monto: valorCuota,
      fecha: fechaVence.toLocaleDateString('es-ES', opciones),
      pagada: false,
      referencia: null
    });
  }

  const nuevoP = { montoOriginal: capital, cuotas: cuotasArray };
  const idx = baseDatos.findIndex(u => u.correo === correo);
  
  if (idx !== -1) { 
      if(!baseDatos[idx].prestamos) baseDatos[idx].prestamos = [];
      baseDatos[idx].prestamos.push(nuevoP); 
  } else { 
      baseDatos.push({ nombre, correo, pass, limite: 50, prestamos: [nuevoP] }); 
  }
  sincronizarNube();
  alert(`ÉXITO: ${meses} cuotas de $${valorCuota}`);
}

function renderizarAdmin() {
  const listSol = document.getElementById('lista-solicitudes-admin');
  const monitor = document.getElementById('tabla-usuarios-monitoreo');
  const listCobros = document.getElementById('lista-cuotas-admin');
  const filtro = document.getElementById('buscador-admin').value.toLowerCase();
  
  listSol.innerHTML = solicitudesEspera.length === 0 ? "<p style='font-size:10px; color:#94a3b8; text-align:center;'>SIN PENDIENTES</p>" : "";
  solicitudesEspera.forEach((s, i) => {
    listSol.innerHTML += `<div class="user-row" style="display:flex; justify-content:space-between; align-items:center; background:white;">
      <div><b>${s.nombre}</b><br><span>$${s.monto}</span></div>
      <div style="display:flex; gap:5px;">
        <button onclick="copiarSolicitud(${i})" class="btn-action-admin">PROCESAR</button>
        <button onclick="eliminarSolicitud(${i})" class="btn-eliminar-sol">ELIMINAR</button>
      </div>
    </div>`;
  });

  monitor.innerHTML = ""; listCobros.innerHTML = "";
  baseDatos.forEach((u, uIdx) => {
    monitor.innerHTML += `<div class="user-row">
        <span>CLIENTE:</span> <b>${u.nombre}</b><br>
        <span>LÍMITE:</span> <b style="color:var(--accent)">$${u.limite || 50}</b><br>
        <div style="display:flex; gap:5px; margin-top:5px;">
          <select onchange="actualizarLimite(${uIdx}, this.value)" style="padding:5px; font-size:10px; margin:0;">
            <option value="">CAMBIAR LÍMITE</option>
            <option value="100">$100</option><option value="200">$200</option><option value="500">$500</option><option value="1000">$1000</option>
          </select>
          <button onclick="eliminarCliente(${uIdx})" class="btn-delete-user">BORRAR</button>
        </div>
      </div>`;
    
    if (u.nombre.toLowerCase().includes(filtro)) {
      let html = `<div class="user-row" style="background:white;">
          <div class="admin-access-box">CORREO: <b>${u.correo}</b> | CLAVE: <b>${u.pass}</b></div>
          <b>${u.nombre}</b>`;
      if(u.prestamos) {
          u.prestamos.forEach((p, pIdx) => {
            p.cuotas.forEach((c, cIdx) => {
              if(!c.pagada) {
                html += `<div style="display:flex; justify-content:space-between; margin-top:5px; font-size:10px;">
                  <span>C${c.nro} (${c.fecha}): $${c.monto} ${c.referencia?'<b>(REF: '+c.referencia+')</b>':''}</span>
                  <button onclick="marcarPago(${uIdx},${pIdx},${cIdx})" class="btn-action-admin">APROBAR</button>
                </div>`;
              }
            });
          });
      }
      listCobros.innerHTML += html + "</div>";
    }
  });
}

function renderizarCliente(u) {
  document.getElementById('saludo-cliente').innerText = "HOLA, " + u.nombre.split(' ')[0];
  const lista = document.getElementById('lista-cuotas-cliente');
  const select = document.getElementById('select-cuota');
  lista.innerHTML = ""; select.innerHTML = "<option value=''>ELEGIR CUOTA</option>";
  if(!u.prestamos) return;
  u.prestamos.forEach((p, pI) => {
    let html = `<div style="margin-top:10px; border-bottom:1px solid #eee; padding-bottom:10px;"><p class="section-label" style="color:var(--accent)">CRÉDITO: $${p.montoOriginal}</p>`;
    p.cuotas.forEach((c, cI) => {
      let col = c.pagada ? "status-pagado" : (c.referencia ? "status-revision" : "status-pendiente");
      html += `<div class="user-row" style="display:flex; justify-content:space-between; align-items:center; background:white;">
        <div>
          <b>CUOTA ${c.nro}</b><br>
          <span style="font-size:14px; font-weight:800;">$${c.monto}</span><br>
          <small style="color:var(--text-muted); font-size:10px;">📅 VENCE: ${c.fecha}</small>
        </div>
        <b class="${col}" style="font-size:10px;">${c.pagada?'PAGADO':(c.referencia?'REVISIÓN':'PENDIENTE')}</b>
      </div>`;
      if (!c.pagada && !c.referencia) select.innerHTML += `<option value="${pI}-${cI}">C${c.nro} - ${c.fecha}</option>`;
    });
    lista.innerHTML += html + "</div>";
  });
}

function enviarReferencia() {
  const val = document.getElementById('select-cuota').value;
  const ref = document.getElementById('ref-pago').value.trim();
  if (!val || !ref) return alert("RELLENAR DATOS");
  const [pI, cI] = val.split('-');
  baseDatos[clienteSesion].prestamos[pI].cuotas[cI].referencia = ref;
  sincronizarNube();
  alert("REFERENCIA ENVIADA");
}

function marcarPago(u, p, c) {
  baseDatos[u].prestamos[p].cuotas[c].pagada = true;
  baseDatos[u].prestamos[p].cuotas[c].referencia = null;
  sincronizarNube();
}

function enviarSolicitud() {
  const nombre = document.getElementById('sol-nombre').value.toUpperCase();
  const correo = document.getElementById('sol-correo').value.toLowerCase().trim();
  if(!nombre || !correo) return alert("FALTAN DATOS");
  
  solicitudesEspera.push({ nombre, correo, monto: montoGlobal });
  sincronizarNube();
  alert("SOLICITUD ENVIADA CORRECTAMENTE"); 
  mostrarPantalla('login-screen');
}

function verificarBloqueo(monto) {
    const correo = document.getElementById('sol-correo').value.toLowerCase().trim();
    if (!correo) return alert("ESCRIBA SU CORREO PRIMERO");
    const usuario = baseDatos.find(u => u.correo === correo);
    let limite = usuario ? (usuario.limite || 50) : 50;
    if (monto <= limite) {
        montoGlobal = monto;
        document.getElementById('resumen-monto').innerText = "MONTO SELECCIONADO: $" + monto;
        document.getElementById('confirmar-solicitud-area').style.display = 'block';
    } else { alert("MONTO BLOQUEADO. SOLICITE UN CRÉDITO MENOR."); }
}

function copiarSolicitud(i) {
  document.getElementById('cliente-nombre').value = solicitudesEspera[i].nombre;
  document.getElementById('cliente-correo').value = solicitudesEspera[i].correo;
  document.getElementById('monto-base').value = solicitudesEspera[i].monto;
}

function mostrarPantalla(id) { document.querySelectorAll('section').forEach(p => p.style.display = p.id === id ? 'block' : 'none'); }
function eliminarSolicitud(i) { solicitudesEspera.splice(i, 1); sincronizarNube(); }
function eliminarCliente(i) { if(confirm("¿BORRAR CLIENTE?")) { baseDatos.splice(i, 1); sincronizarNube(); } }
function cambiarTab(n) { 
  document.getElementById('vista-cobros').style.display = n === 1 ? 'block' : 'none'; 
  document.getElementById('vista-clientes').style.display = n === 2 ? 'block' : 'none'; 
  document.getElementById('tab1').classList.toggle('active', n === 1); 
  document.getElementById('tab2').classList.toggle('active', n === 2); 
}
function actualizarLimite(idx, nuevo) { baseDatos[idx].limite = parseInt(nuevo); sincronizarNube(); }
function logout() { clienteSesion = null; mostrarPantalla('login-screen'); }
function mostrarSolicitud() { mostrarPantalla('solicitud-screen'); }
