// ID SECRETO de la colección — ¡cámbialo por uno único!
const COLECCION_ID = "cartadex_amigo_2025_xyz"; 

let todasLasCartas = [];
let cartasDesbloqueadas = new Set();

// Cargar cartas desde JSON
async function cargarCartas() {
  try {
    const res = await fetch('data/cartas.json');
    todasLasCartas = await res.json();
    document.getElementById('total').textContent = todasLasCartas.length;
    cargarProgresoDesdeFirestore();
  } catch (error) {
    document.getElementById('galeria-cartas').innerHTML = '<p style="color:#f00;text-align:center;">❌ Error al cargar cartas.</p>';
    console.error('Error en cartas.json:', error);
  }
}

// Cargar progreso desde Firestore
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

// Guardar progreso en Firestore
async function guardarProgresoEnFirestore() {
  const db = firebase.firestore();
  await db.collection('publico').doc(COLECCION_ID).set({
    cartas: [...cartasDesbloqueadas],
    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Renderizar cartas
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

// Actualizar estadísticas
function actualizarEstadisticas() {
  const total = todasLasCartas.length;
  const desbloq = cartasDesbloqueadas.size;
  const porcentaje = total ? Math.round((desbloq / total) * 100) : 0;

  document.getElementById('progreso').textContent = `${porcentaje}%`;
  document.getElementById('desbloqueadas').textContent = desbloq;
}

// Iniciar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  cargarCartas();
});