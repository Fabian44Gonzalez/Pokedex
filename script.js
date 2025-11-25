let todasLasCartas = [];
let cartasDesbloqueadas = new Set();
let usuarioActual = null;

// Cargar cartas desde JSON
async function cargarCartas() {
  try {
    const res = await fetch('data/cartas.json');
    todasLasCartas = await res.json();
    renderizarApp();
  } catch (error) {
    document.getElementById('app').innerHTML = '<p style="color:white;text-align:center;">Error al cargar las cartas.</p>';
    console.error('Error en cartas.json:', error);
  }
}

// Renderizar toda la app según estado de login
function renderizarApp() {
  const app = document.getElementById('app');

  if (!usuarioActual) {
    app.innerHTML = `
      <header>
        <h1>🔍 CartaDex Digital</h1>
        <p>Inicia sesión para ver tu colección</p>
      </header>
      <main style="text-align:center; padding:40px;">
        <button onclick="loginConGoogle()">Iniciar sesión con Google</button>
      </main>
    `;
    return;
  }

  // Usuario logeado
  app.innerHTML = `
    <header>
      <h1>🔍 CartaDex Digital</h1>
      <p>¡Hola, ${usuarioActual.email}!</p>
    </header>
    <div class="stats">
      <span id="progreso">0%</span> completado • 
      <span id="desbloqueadas">0</span>/<span id="total">${todasLasCartas.length}</span> cartas
    </div>
    <main id="galeria-cartas"></main>
    <footer>
      <button onclick="logout()">Cerrar sesión</button>
    </footer>
  `;

  cargarColeccionDeFirestore();
}

// Login con Google
function loginConGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .catch(error => {
      alert("Error al iniciar sesión: " + error.message);
    });
}

// Cerrar sesión
function logout() {
  firebase.auth().signOut();
}

// Cargar cartas desbloqueadas desde Firestore
async function cargarColeccionDeFirestore() {
  const db = firebase.firestore();
  const snapshot = await db
    .collection('usuarios')
    .doc(usuarioActual.uid)
    .collection('cartas')
    .get();

  cartasDesbloqueadas = new Set();
  snapshot.forEach(doc => {
    cartasDesbloqueadas.add(doc.id);
  });

  renderizarCartas();
  actualizarEstadisticas();
}

// Guardar carta desbloqueada en Firestore
async function guardarCartaEnFirestore(cartaId) {
  const db = firebase.firestore();
  await db
    .collection('usuarios')
    .doc(usuarioActual.uid)
    .collection('cartas')
    .doc(cartaId)
    .set({
      desbloqueada: true,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Renderizar la cuadrícula de cartas
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
      cartaEl.addEventListener('click', async () => {
        cartasDesbloqueadas.add(carta.id);
        await guardarCartaEnFirestore(carta.id);
        renderizarCartas();
        actualizarEstadisticas();
      });
    }

    galeria.appendChild(cartaEl);
  });
}

// Actualizar estadísticas de progreso
function actualizarEstadisticas() {
  const total = todasLasCartas.length;
  const desbloq = cartasDesbloqueadas.size;
  const porcentaje = total ? Math.round((desbloq / total) * 100) : 0;

  const progresoEl = document.getElementById('progreso');
  const desbloqEl = document.getElementById('desbloqueadas');

  if (progresoEl) progresoEl.textContent = `${porcentaje}%`;
  if (desbloqEl) desbloqEl.textContent = desbloq;
}

// Escuchar cambios en el estado de autenticación
firebase.auth().onAuthStateChanged(usuario => {
  usuarioActual = usuario;
  if (todasLasCartas.length > 0) {
    renderizarApp();
  } else {
    cargarCartas();
  }
});