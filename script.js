const COLECCION_ID = "cartadex_amigo_2025_xyz";
const ADMIN_ID = "admin_cartadex_2025";

let cartasBase = [];
let cartasDesbloqueadas = new Set();
let cartasPersonalizadas = [];

document.addEventListener('DOMContentLoaded', () => {
  initModal();
  initCrearCarta();
  initAdminPanel();
  cargarApp();
});

async function cargarApp() {
  try {
    const db = firebase.firestore();
    
    // Cargar cartas base
    const snapBase = await db.collection('cartasBase').get();
    cartasBase = [];
    snapBase.forEach(doc => {
      cartasBase.push({ id: doc.id, ...doc.data() });
    });

    // Cargar progreso
    const docProgreso = await db.collection('publico').doc(COLECCION_ID).get();
    if (docProgreso.exists) {
      const data = docProgreso.data();
      cartasDesbloqueadas = new Set(data.cartas || []);
    }

    // Cargar cartas personalizadas
    const snapPersonalizadas = await db
      .collection('cartasPersonalizadas')
      .where('creador', '==', COLECCION_ID)
      .get();
    cartasPersonalizadas = [];
    snapPersonalizadas.forEach(doc => {
      cartasPersonalizadas.push({ id: doc.id, ...doc.data() });
    });

    renderizarTodo();
    document.getElementById('total').textContent = cartasBase.length;
  } catch (err) {
    console.error('Error al cargar datos:', err);
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;text-align:center;">❌ Error de conexión con Firebase</p>';
  }
}

function renderizarTodo() {
  renderizarCartas();
  actualizarEstadisticas();
}

function renderizarCartas() {
  const galeria = document.getElementById('galeria-cartas');
  galeria.innerHTML = '';

  // Cartas base
  cartasBase.forEach(carta => {
    const desbloqueada = cartasDesbloqueadas.has(carta.id);
    renderizarCarta(carta, desbloqueada, false);
  });

  // Cartas personalizadas
  cartasPersonalizadas.forEach(carta => {
    renderizarCarta(carta, true, true);
  });
}

function renderizarCarta(carta, desbloqueada, esPersonalizada) {
  const galeria = document.getElementById('galeria-cartas');
  const el = document.createElement('div');
  el.className = `carta ${desbloqueada ? '' : 'bloqueada'}`;
  
  const idMostrar = esPersonalizada 
    ? `P-${carta.id.substring(0, 4)}`
    : `#${carta.id}`;

  const imgSrc = carta.imagen || 'https://via.placeholder.com/100/555/fff?text=??';

  el.innerHTML = `
    <div class="carta-id">${idMostrar}</div>
    <img src="${imgSrc}" class="carta-imagen" alt="${carta.nombre || 'Carta'}">
    <div class="carta-nombre">${desbloqueada ? carta.nombre : '???'}</div>
    <div class="carta-tipo">${desbloqueada ? carta.tipo : ''}</div>
  `;

  if (!desbloqueada && !esPersonalizada) {
    el.addEventListener('dblclick', () => {
      cartasDesbloqueadas.add(carta.id);
      guardarProgreso();
      renderizarTodo();
    });
  }

  galeria.appendChild(el);
}

function actualizarEstadisticas() {
  const totalBase = cartasBase.length;
  const totalDesbloqueadas = cartasDesbloqueadas.size + cartasPersonalizadas.length;
  const porcentaje = totalBase ? Math.round((totalDesbloqueadas / totalBase) * 100) : 0;

  document.getElementById('progreso').textContent = `${porcentaje}%`;
  document.getElementById('desbloqueadas').textContent = totalDesbloqueadas;
}

async function guardarProgreso() {
  try {
    const db = firebase.firestore();
    await db.collection('publico').doc(COLECCION_ID).set({
      cartas: [...cartasDesbloqueadas],
      ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error al guardar progreso:', err);
    alert('⚠️ No se pudo guardar el progreso.');
  }
}

// --- Modal: Añadir por ID ---
function initModal() {
  const modal = document.getElementById('modal');
  const btnAbrir = document.getElementById('btn-agregar');
  const btnCerrar = document.querySelector('.cerrar');
  const btnConfirmar = document.getElementById('btn-confirmar');
  const input = document.getElementById('input-id');
  const msg = document.getElementById('mensaje-modal');

  if (!btnAbrir || !modal || !btnConfirmar || !input || !msg) return;

  btnAbrir.onclick = () => {
    input.value = '';
    msg.textContent = '';
    modal.style.display = 'block';
    input.focus();
  };

  btnCerrar.onclick = () => modal.style.display = 'none';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  btnConfirmar.onclick = () => {
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
      msg.textContent = `✅ Ya tienes la carta #${id}`;
      return;
    }

    cartasDesbloqueadas.add(id);
    guardarProgreso();
    renderizarTodo();
    msg.textContent = `🎉 ¡Carta #${id} desbloqueada!`;
    setTimeout(() => modal.style.display = 'none', 1200);
  };

  input.onkeypress = (e) => { if (e.key === 'Enter') btnConfirmar.click(); };
}

// --- Modal: Crear carta personalizada ---
function initCrearCarta() {
  const modal = document.getElementById('modal-crear');
  const btnAbrir = document.getElementById('btn-crear');
  const btnCerrar = document.getElementById('cerrar-crear');
  const btnGuardar = document.getElementById('btn-guardar-crear');
  const nombre = document.getElementById('crear-nombre');
  const tipo = document.getElementById('crear-tipo');
  const imagen = document.getElementById('crear-imagen');
  const msg = document.getElementById('mensaje-crear');

  if (!btnAbrir || !modal) return;

  btnAbrir.onclick = () => {
    nombre.value = ''; tipo.value = ''; imagen.value = '';
    msg.textContent = '';
    modal.style.display = 'block';
    nombre.focus();
  };

  btnCerrar?.onclick = () => modal.style.display = 'none';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  btnGuardar?.onclick = async () => {
    const n = nombre.value.trim();
    const t = tipo.value.trim();
    if (!n || !t) {
      msg.textContent = '⚠️ Nombre y tipo obligatorios';
      return;
    }

    try {
      const db = firebase.firestore();
      const docRef = await db.collection('cartasPersonalizadas').add({
        nombre: n,
        tipo: t,
        imagen: imagen.value.trim() || null,
        creador: COLECCION_ID,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
      });

      cartasPersonalizadas.push({
        id: docRef.id,
        nombre: n,
        tipo: t,
        imagen: imagen.value.trim() || null,
        creador: COLECCION_ID
      });

      renderizarTodo();
      msg.textContent = '✅ ¡Carta personalizada creada!';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 1000);
    } catch (err) {
      console.error('Error al crear carta personalizada:', err);
      msg.textContent = '❌ Error al guardar';
    }
  };
}

// --- Panel de administración: crear carta base ---
function initAdminPanel() {
  const btnAdmin = document.getElementById('btn-admin');
  const modal = document.getElementById('modal-admin');
  const btnCerrar = document.getElementById('cerrar-admin');
  const btnGuardar = document.getElementById('btn-guardar-admin');
  const idInput = document.getElementById('admin-id');
  const nombreInput = document.getElementById('admin-nombre');
  const tipoInput = document.getElementById('admin-tipo');
  const imagenInput = document.getElementById('admin-imagen');
  const msg = document.getElementById('mensaje-admin');

  if (!btnAdmin || !modal) return;

  btnAdmin.onclick = () => {
    idInput.value = '';
    nombreInput.value = '';
    tipoInput.value = '';
    imagenInput.value = '';
    msg.textContent = '';
    modal.style.display = 'block';
    idInput.focus();
  };

  btnCerrar?.onclick = () => modal.style.display = 'none';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

  btnGuardar?.onclick = async () => {
    const id = idInput.value.trim();
    const nombre = nombreInput.value.trim();
    const tipo = tipoInput.value.trim();

    if (!id || !nombre || !tipo) {
      msg.textContent = '⚠️ ID, nombre y tipo son obligatorios';
      return;
    }

    if (cartasBase.some(c => c.id === id)) {
      msg.textContent = `❌ El ID "${id}" ya existe`;
      return;
    }

    try {
      const db = firebase.firestore();
      await db.collection('cartasBase').doc(id).set({
        nombre: nombre,
        tipo: tipo,
        imagen: imagenInput.value.trim() || null,
        adminId: ADMIN_ID
      });

      cartasBase.push({
        id: id,
        nombre: nombre,
        tipo: tipo,
        imagen: imagenInput.value.trim() || null
      });

      renderizarTodo();
      msg.textContent = '✅ ¡Carta base publicada!';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 1200);
    } catch (err) {
      console.error('Error al crear carta base:', err);
      msg.textContent = '❌ Permiso denegado. ¿ADMIN_ID correcto?';
    }
  };
}