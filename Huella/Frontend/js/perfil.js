// =============================================
//  perfil.js — Lógica de la página Mi Perfil
// =============================================

const BASE_URL = 'http://localhost:1984/api';
const token = localStorage.getItem('JWT');

// Redirigir si no hay sesión
if (!token) {
    window.location.href = 'login.html';
}

// Decodificar JWT para obtener datos básicos sin endpoint
function decodeJWT(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch {
        return null;
    }
}

// =============================================
//  INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosPerfil();
    iniciarCerrarSesion();
    iniciarGuardarTelefono();
});

// =============================================
//  DATOS DEL PERFIL (desde JWT + endpoint)
// =============================================
async function cargarDatosPerfil() {
    const payload = decodeJWT(token);

    // Mostrar email desde el JWT inmediatamente
    if (payload) {
        document.getElementById('perfil-email').textContent = payload.email || 'Sin email';
        document.getElementById('cuenta-email').textContent = payload.email || '—';
    }

    // Cargar estadísticas
try {
    const [resPubs, resGuardados] = await Promise.all([
        fetch(`${BASE_URL}/mis-publicaciones`, {
            headers: { 'Authorization': 'Bearer ' + token }
        }),
        fetch(`${BASE_URL}/guardados`, {
            headers: { 'Authorization': 'Bearer ' + token }
        })
    ]);

    if (resPubs.ok) {
        const dataPubs = await resPubs.json();
        document.getElementById('stat-publicaciones').textContent = dataPubs.publicaciones.length;
    }

    if (resGuardados.ok) {
        const dataGuardados = await resGuardados.json();
        document.getElementById('stat-guardados').textContent = dataGuardados.publicaciones.length;
    }
} catch {
    console.log('No se pudieron cargar las estadísticas.');
}

    // Intentar obtener teléfono desde el endpoint /api/perfil
    try {
        const res = await fetch(`${BASE_URL}/perfil`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.ok) {
            const data = await res.json();
            const tel = data.usuario?.telefono;
            if (tel) {
                document.getElementById('perfil-telefono').textContent = `📞 ${tel}`;
                document.getElementById('cuenta-telefono').value = tel;
            }
        }
    } catch {
        console.log('Endpoint /api/perfil no disponible, usando solo JWT.');
    }
}

// =============================================
//  CERRAR SESIÓN
// =============================================
function iniciarCerrarSesion() {
    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('JWT');
        window.location.href = 'login.html';
    });
}

// =============================================
//  GUARDAR TELÉFONO
// =============================================
function iniciarGuardarTelefono() {
    document.getElementById('btnGuardarTel').addEventListener('click', async () => {
        const tel = document.getElementById('cuenta-telefono').value.trim();
        const msgEl = document.getElementById('cuenta-msg');

        if (!tel) {
            mostrarMensajeCuenta('Ingresa un número de teléfono.', 'error');
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/perfil/telefono`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ telefono: tel })
            });

            if (res.ok) {
                mostrarMensajeCuenta('Teléfono guardado correctamente.', 'ok');
                document.getElementById('perfil-telefono').textContent = `📞 ${tel}`;
            } else {
                mostrarMensajeCuenta('No se pudo guardar el teléfono. Verifica el endpoint en tu backend.', 'error');
            }
        } catch {
            mostrarMensajeCuenta('Error de red. Asegúrate de tener el servidor corriendo.', 'error');
        }
    });
}

function mostrarMensajeCuenta(texto, tipo) {
    const el = document.getElementById('cuenta-msg');
    el.textContent = texto;
    el.className = `perfil-cuenta__msg perfil-cuenta__msg--${tipo}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3500);
}