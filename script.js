// --- CONFIGURACIÓN ---
const COLECCION_ID = "cartadex_amigo_2025_xyz"; // ← ¡Cambia por un ID único!

// --- VARIABLES ---
let todasLasCartas = [];
let cartasDesbloqueadas = new Set();

// --- INICIAR ---
document.addEventListener('DOMContentLoaded', () => {
  initModal();
  cargarApp();
});

// --- CARGAR APP ---
async function cargarApp() {
  try {
    const res = await fetch('data/cartas.json');
    if (!res.ok) throw new Error('cartas.json no encontrado');
    todasLasCartas = await res.json();
    document.getElementById('total').textContent = todasLasCartas.length;
  } catch (err) {
    console.error('Error al cargar cartas.json:', err);
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;text-align:center;">❌ cartas.json no cargado</p>';
    return;
  }

  try {
    const db = firebase.firestore();
    const doc = await db.collection('publico').doc(COLECCION_ID).get();
    if (doc.exists) {
      const data = doc.data();
      cartasDesbloqueadas = new Set(data.cartas || []);
    }
  } catch (err) {
    console.warn('No se pudo cargar el progreso:', err);
  }

  renderizarTodo();
}

// --- RENDERIZAR ---
function renderizarTodo() {
  renderizarCartas();
  actualizarEstadisticas();
}

function renderizarCartas() {
  const galeria = document.getElementById('galeria-cartas');
  galeria.innerHTML = '';

  todasLasCartas.forEach(carta => {
    const desbloqueada = cartasDesbloqueadas.has(carta.id);
    const el = document.createElement('div');
    el.className = `carta ${desbloqueada ? '' : 'bloqueada'}`;
    el.innerHTML = `
      <div class="carta-id">#${carta.id}</div>
      <img src="${carta.imagen}" class="carta-imagen">
      <div class="carta-nombre">${desbloqueada ? carta.nombre : '???'}</div>
      <div class="carta-tipo">${desbloqueada ? carta.tipo : ''}</div>
    `;

    // Solo las cartas bloqueadas responden al doble clic
    if (!desbloqueada) {
      el.addEventListener('dblclick', () => {
        cartasDesbloqueadas.add(carta.id);
        guardarProgreso();
        renderizarTodo();
      });
    }

    galeria.appendChild(el);
  });
}

function actualizarEstadisticas() {
  const total = todasLasCartas.length;
  const desbloq = cartasDesbloqueadas.size;
  const pct = total ? Math.round((desbloq / total) * 100) : 0;
  document.getElementById('progreso').textContent = `${pct}%`;
  document.getElementById('desbloqueadas').textContent = desbloq;
}

// --- GUARDAR ---
async function guardarProgreso() {
  try {
    const db = firebase.firestore();
    await db.collection('publico').doc(COLECCION_ID).set({
      cartas: [...cartasDesbloqueadas],
      ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Error al guardar:', err);
    alert('⚠️ No se pudo guardar. ¿Conexión a internet?');
  }
}

// --- MODAL ---
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

    const carta = todasLasCartas.find(c => c.id === id);
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
    setTimeout(() => modal.style.display = 'none', 1200);
  };

  input.onkeypress = (e) => { if (e.key === 'Enter') btnConfirmar.click(); };
}