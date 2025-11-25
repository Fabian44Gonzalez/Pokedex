// --- CONFIGURACIÓN ---
const COLECCION_ID = "cartadex_amigo_2025_xyz";
const ADMIN_ID = "admin_cartadex_2025";

// --- VARIABLES ---
let cartasBase = [];
let cartasDesbloqueadas = new Set();
let cartasPersonalizadas = [];

// --- INICIO SEGURO ---
document.addEventListener('DOMContentLoaded', () => {
  // Verificar que Firebase esté listo
  if (typeof firebase === 'undefined') {
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;text-align:center;">❌ Firebase no cargado</p>';
    return;
  }

  // Inicializar UI y cargar datos
  initUI();
  cargarApp();
});

function initUI() {
  // Botón: Añadir por ID
  const btnAgregar = document.getElementById('btn-agregar');
  if (btnAgregar) {
    btnAgregar.addEventListener('click', () => {
      document.getElementById('input-id').value = '';
      document.getElementById('mensaje-modal').textContent = '';
      document.getElementById('modal').style.display = 'block';
    });
  }

  // Botón: Crear carta
  const btnCrear = document.getElementById('btn-crear');
  if (btnCrear) {
    btnCrear.addEventListener('click', () => {
      document.getElementById('crear-nombre').value = '';
      document.getElementById('crear-tipo').value = '';
      document.getElementById('crear-imagen').value = '';
      document.getElementById('mensaje-crear').textContent = '';
      document.getElementById('modal-crear').style.display = 'block';
    });
  }

  // Botón: Admin
  const btnAdmin = document.getElementById('btn-admin');
  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      document.getElementById('admin-id').value = '';
      document.getElementById('admin-nombre').value = '';
      document.getElementById('admin-tipo').value = '';
      document.getElementById('admin-imagen').value = '';
      document.getElementById('mensaje-admin').textContent = '';
      document.getElementById('modal-admin').style.display = 'block';
    });
  }

  // Cerrar modales
  setupCerrarModal('cerrar', 'modal');
  setupCerrarModal('cerrar-crear', 'modal-crear');
  setupCerrarModal('cerrar-admin', 'modal-admin');

  // Cerrar modal al hacer clic fuera
  ['modal', 'modal-crear', 'modal-admin'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  });

  // Configurar botones de confirmación
  setupConfirmarID();
  setupCrearCarta();
  setupCrearCartaBase();
}

function setupCerrarModal(btnId, modalId) {
  const btn = document.getElementById(btnId);
  const modal = document.getElementById(modalId);
  if (btn && modal) {
    btn.addEventListener('click', () => modal.style.display = 'none');
  }
}

function setupConfirmarID() {
  const btn = document.getElementById('btn-confirmar');
  const input = document.getElementById('input-id');
  const msg = document.getElementById('mensaje-modal');

  if (!btn || !input || !msg) return;

  btn.addEventListener('click', () => {
    const id = input.value.trim();
    if (!id) {
      msg.textContent = '⚠️ Escribe un ID';
      return;
    }

    const carta = cartasBase.find(c => c.id === id);
    if (!carta) {
      msg.textContent = `❌ ID "${id}" no existe`;
      return;
    }

    if (cartasDesbloqueadas.has(id)) {
      msg.textContent = `✅ Ya la tienes`;
      return;
    }

    cartasDesbloqueadas.add(id);
    guardarProgreso();
    renderizarTodo();
    msg.textContent = `🎉 ¡Añadida!`;
    setTimeout(() => document.getElementById('modal').style.display = 'none', 1200);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

function setupCrearCarta() {
  const btn = document.getElementById('btn-guardar-crear');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const nombre = document.getElementById('crear-nombre').value.trim();
    const tipo = document.getElementById('crear-tipo').value.trim();
    const imagen = document.getElementById('crear-imagen').value.trim();
    const msg = document.getElementById('mensaje-crear');

    if (!nombre || !tipo) {
      msg.textContent = '⚠️ Nombre y tipo obligatorios';
      return;
    }

    try {
      const db = firebase.firestore();
      const docRef = await db.collection('cartasPersonalizadas').add({
        nombre,
        tipo,
        imagen: imagen || null,
        creador: COLECCION_ID,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });

      cartasPersonalizadas.push({
        id: docRef.id,
        nombre,
        tipo,
        imagen: imagen || null,
        creador: COLECCION_ID
      });

      renderizarTodo();
      msg.textContent = '✅ ¡Creada!';
      setTimeout(() => document.getElementById('modal-crear').style.display = 'none', 1000);
    } catch (err) {
      console.error('Error:', err);
      msg.textContent = '❌ Error';
    }
  });
}

function setupCrearCartaBase() {
  const btn = document.getElementById('btn-guardar-admin');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const id = document.getElementById('admin-id').value.trim();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const tipo = document.getElementById('admin-tipo').value.trim();
    const imagen = document.getElementById('admin-imagen').value.trim();
    const msg = document.getElementById('mensaje-admin');

    if (!id || !nombre || !tipo) {
      msg.textContent = '⚠️ ID, nombre y tipo obligatorios';
      return;
    }

    if (cartasBase.some(c => c.id === id)) {
      msg.textContent = `❌ ID "${id}" ya existe`;
      return;
    }

    try {
      const db = firebase.firestore();
      await db.collection('cartasBase').doc(id).set({
        nombre,
        tipo,
        imagen: imagen || null,
        adminId: ADMIN_ID
      });

      cartasBase.push({ id, nombre, tipo, imagen: imagen || null });
      renderizarTodo();
      msg.textContent = '✅ ¡Publicada!';
      setTimeout(() => document.getElementById('modal-admin').style.display = 'none', 1200);
    } catch (err) {
      console.error('Error:', err);
      msg.textContent = '❌ Permiso denegado';
    }
  });
}

// --- CARGAR Y RENDERIZAR ---
async function cargarApp() {
  try {
    const db = firebase.firestore();

    // Cartas base
    const baseSnap = await db.collection('cartasBase').get();
    cartasBase = [];
    baseSnap.forEach(doc => cartasBase.push({ id: doc.id, ...doc.data() }));

    // Progreso
    const progSnap = await db.collection('publico').doc(COLECCION_ID).get();
    cartasDesbloqueadas = progSnap.exists ? new Set(progSnap.data().cartas || []) : new Set();

    // Cartas personalizadas
    const persSnap = await db.collection('cartasPersonalizadas').where('creador', '==', COLECCION_ID).get();
    cartasPersonalizadas = [];
    persSnap.forEach(doc => cartasPersonalizadas.push({ id: doc.id, ...doc.data() }));

    renderizarTodo();
    document.getElementById('total').textContent = cartasBase.length;
  } catch (err) {
    console.error('Error al cargar:', err);
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;">❌ Error de conexión</p>';
  }
}

function renderizarTodo() {
  renderizarCartas();
  actualizarEstadisticas();
}

function renderizarCartas() {
  const galeria = document.getElementById('galeria-cartas');
  if (!galeria) return;

  galeria.innerHTML = '';

  // Cartas base
  cartasBase.forEach(carta => {
    const desbloqueada = cartasDesbloqueadas.has(carta.id);
    const el = crearElementoCarta(carta, desbloqueada, false);
    if (!desbloqueada) {
      el.addEventListener('dblclick', () => {
        cartasDesbloqueadas.add(carta.id);
        guardarProgreso();
        renderizarTodo();
      });
    }
    galeria.appendChild(el);
  });

  // Cartas personalizadas
  cartasPersonalizadas.forEach(carta => {
    const el = crearElementoCarta(carta, true, true);
    galeria.appendChild(el);
  });
}

function crearElementoCarta(carta, desbloqueada, esPersonalizada) {
  const div = document.createElement('div');
  div.className = `carta ${desbloqueada ? '' : 'bloqueada'}`;
  const idMostrar = esPersonalizada ? `P-${carta.id.substring(0,4)}` : `#${carta.id}`;
  const img = carta.imagen || 'https://via.placeholder.com/100/555/fff?text=??';

  div.innerHTML = `
    <div class="carta-id">${idMostrar}</div>
    <img src="${img}" class="carta-imagen">
    <div class="carta-nombre">${desbloqueada ? carta.nombre : '???'}</div>
    <div class="carta-tipo">${desbloqueada ? carta.tipo : ''}</div>
  `;
  return div;
}

function actualizarEstadisticas() {
  const total = cartasBase.length;
  const desbloq = cartasDesbloqueadas.size + cartasPersonalizadas.length;
  const pct = total ? Math.round((desbloq / total) * 100) : 0;
  document.getElementById('progreso')?.textContent = `${pct}%`;
  document.getElementById('desbloqueadas')?.textContent = desbloq;
}

async function guardarProgreso() {
  try {
    const db = firebase.firestore();
    await db.collection('publico').doc(COLECCION_ID).set({
      cartas: [...cartasDesbloqueadas],
      ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error al guardar:', err);
  }
}