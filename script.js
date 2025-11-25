const COLECCION_ID = "cartadex_amigo_2025_xyz";

let todasLasCartas = [];
let cartasDesbloqueadas = new Set();

async function cargarCartas() {
  try {
    const res = await fetch('data/cartas.json');
    todasLasCartas = await res.json();
    document.getElementById('total').textContent = todasLasCartas.length;
    cargarProgresoDesdeFirestore();
    setupUI();
  } catch (error) {
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;text-align:center;">❌ Error al cargar cartas.</p>';
    console.error('Error en cartas.json:', error);
  }
}

async function cargarProgresoDesdeFirestore() {
  const db = firebase.firestore();
  const docRef = db.collection('publico').doc(COLECCION_ID);
  const doc = await docRef.get();

  if (doc.exists) {
    const data = doc.data();
    cartasDesbloqueadas = new Set(data.cartas || []);
  }

  renderizarCartas();
  actualizarEstadisticas();
}

async function guardarProgresoEnFirestore() {
  const db = firebase.firestore();
  await db.collection('publico').doc(COLECCION_ID).set({
    cartas: [...cartasDesbloqueadas],
    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function renderizarCartas() {
  const galeria = document.getElementById('galeria-cartas');
  galeria.innerHTML = '';

  todasLasCartas.forEach(carta => {
    const desbloqueada = cartasDesbloqueadas.has(carta.id);
    const cartaEl = document.createElement('div');
    cartaEl.className = `carta ${desbloqueada ? '' : 'bloqueada'}`;
    cartaEl.innerHTML = `
      <div class="carta-id">#${carta.id}</div>
      <img src="${carta.imagen}" alt="${carta.nombre}" class="carta-imagen">
      <div class="carta-nombre">${desbloqueada ? carta.nombre : '???'}</div>
      <div class="carta-tipo">${desbloqueada ? carta.tipo : ''}</div>
    `;

    if (!desbloqueada) {
      cartaEl.addEventListener('click', () => {
        cartasDesbloqueadas.add(carta.id);
        guardarProgresoEnFirestore();
        renderizarCartas();
        actualizarEstadisticas();
      });
    }

    galeria.appendChild(cartaEl);
  });
}

function actualizarEstadisticas() {
  const total = todasLasCartas.length;
  const desbloq = cartasDesbloqueadas.size;
  const porcentaje = total ? Math.round((desbloq / total) * 100) : 0;

  document.getElementById('progreso').textContent = `${porcentaje}%`;
  document.getElementById('desbloqueadas').textContent = desbloq;
}

// --- NUEVO: Interfaz con modal ---
function setupUI() {
  const modal = document.getElementById('modal');
  const btnAbrir = document.getElementById('btn-agregar');
  const btnCerrar = document.querySelector('.cerrar');
  const btnConfirmar = document.getElementById('btn-confirmar');
  const inputId = document.getElementById('input-id');
  const mensajeEl = document.getElementById('mensaje-modal');

  // Abrir modal
  btnAbrir.addEventListener('click', () => {
    inputId.value = '';
    mensajeEl.textContent = '';
    modal.style.display = 'block';
    inputId.focus();
  });

  // Cerrar modal
  btnCerrar.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Cerrar al hacer clic fuera
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  // Confirmar desbloqueo
  btnConfirmar.addEventListener('click', () => {
    const id = inputId.value.trim();
    if (!id) {
      mensajeEl.textContent = '⚠️ Ingresa un ID.';
      return;
    }

    const carta = todasLasCartas.find(c => c.id === id);
    if (carta) {
      if (cartasDesbloqueadas.has(id)) {
        mensajeEl.textContent = `✅ Ya tienes la carta #${id}.`;
      } else {
        cartasDesbloqueadas.add(id);
        guardarProgresoEnFirestore();
        renderizarCartas();
        actualizarEstadisticas();
        mensajeEl.textContent = `🎉 ¡Carta #${id} desbloqueada!`;
        setTimeout(() => modal.style.display = 'none', 1500);
      }
    } else {
      mensajeEl.textContent = `❌ ID "${id}" no válido.`;
    }
  });

  // Permitir Enter en el input
  inputId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnConfirmar.click();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCartas();
});