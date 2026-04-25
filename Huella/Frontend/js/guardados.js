const gridGuardados = document.getElementById('grid-guardados');
const token = localStorage.getItem('JWT');

if (!token){
    window.location.href = 'login.html';
}

async function cargarGuardados() {
    try {
        const response = await fetch('http://localhost:1984/api/guardados',{
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) {
            throw new Error('Error de red al obtener guardados');
        }

        const data = await response.json();
        const publicaciones = data.publicaciones;

        console.log(publicaciones[0]);

        gridGuardados.innerHTML = '';
        if (publicaciones.length === 0) {
            gridGuardados.innerHTML = '<p style="text-align: center; color: var(--card-font-color); grid-column: 1 / -1;">No tienes publicaciones guardadas por el momento.</p>';
            return;
        }

        publicaciones.forEach(pub => {
            const tarjeta = document.createElement('post-card');
            const isPerdido = pub.tipo === 1;
            const badgeText = isPerdido ? '¡Perdido!' : '¡Busca a su familia!';
            const badgeType = isPerdido ? 'lost' : 'found';

            tarjeta.setAttribute('nombre', pub.nombre || 'Desconocido');
            tarjeta.setAttribute('especie', pub.especie || 'No especificada');
            tarjeta.setAttribute('ubicacion', pub.ubicacion || 'Sin ubicación');
            tarjeta.setAttribute('badge-text', badgeText);
            tarjeta.setAttribute('badge-type', badgeType);

            if (pub.imagenBase64) {
                tarjeta.setAttribute('imagen', `data:image/jpeg;base64,${pub.imagenBase64}`);
            } else {
                tarjeta.setAttribute('imagen', './imagenes/img_1.png');
            }
            
            tarjeta.innerHTML = `
                <button slot="header-action" class="pub-card__icon-btn btn-quitar" data-id="${pub.id_Publicacion}" title="Quitar de guardados">
                    <img src="imagenes/iconos/icono_guardado.png" width="20" alt="Guardado">
                </button>

                <div slot="extra-attributes" class="attribute">
                    <img src="imagenes/iconos/icono_color.png" class="attribute__icon" alt="Color/Raza">
                    <label><b class="attribute__type">Raza:</b> ${pub.raza || 'Mestizo'}</label>
                </div>

                <button slot="footer-action" class="pub-card__btn pub-card__btn--secondary">Contactar</button>
            `;

            gridGuardados.appendChild(tarjeta);
        });
        conectarBotonesQuitar();

    } catch (error) {
        console.error('Error al cargar datos:', error);
        gridGuardados.innerHTML = '<p style="text-align: center; color: var(--danger-text); grid-column: 1 / -1;">Error al cargar las publicaciones guardadas.</p>';
    }
}

function conectarBotonesQuitar() {
    const botonesQuitar = document.querySelectorAll('.btn-quitar');
    botonesQuitar.forEach(boton => {
        boton.addEventListener('click', async (event) => {
            const idPublicacion = event.currentTarget.getAttribute('data-id');

            try {
                const response = await fetch(`http://localhost:1984/api/guardados/${idPublicacion}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    event.currentTarget.closest('post-card').remove();

                    if (gridGuardados.children.length === 0) {
                        gridGuardados.innerHTML = '<p style="text-align: center; color: var(--card-font-color); grid-column: 1 / -1;">No tienes publicaciones guardadas por el momento.</p>';
                    }
                } else if (response.status === 401) {
                        window.location.href = 'login.html';
                        return;
                } else {
                    console.error('Error al borrar de guardados en el servidor.');
                }

            } catch (error) {
                console.error('Error de red al borrar:', error);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', cargarGuardados);