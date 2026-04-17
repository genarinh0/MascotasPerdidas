//Hardcodeamos el usuario por ahora
const ID_USUARIO_ACTUAL = 1;
const gridGuardados = document.getElementById('grid-guardados');

async function cargarGuardados() {
    try {
        const response = await fetch(`http://localhost:1984/api/guardados/${ID_USUARIO_ACTUAL}`);
        if (!response.ok) {
            throw new Error('Error de red al obtener guardados');
        }

        const data = await response.json();
        const publicaciones = data.publicaciones;

        gridGuardados.innerHTML = '';
        if (publicaciones.length === 0) {
            gridGuardados.innerHTML = '<p style="text-align: center; color: var(--card-font-color); grid-column: 1 / -1;">No tienes publicaciones guardadas por el momento.</p>';
            return;
        }

        publicaciones.forEach(pub => {
            const tarjeta = document.createElement('post-card');
            const isPerdido = pub.estatus === 'Perdido';
            const badgeText = isPerdido ? '¡Perdido!' : '¡Busca a su familia!';
            const badgeType = isPerdido ? 'lost' : 'found';

            tarjeta.setAttribute('nombre', pub.nombre || 'Desconocido');
            tarjeta.setAttribute('imagen', pub.imagen || 'imagenes/img_4.png');
            tarjeta.setAttribute('especie', pub.especie || 'No especificada');
            tarjeta.setAttribute('ubicacion', pub.ubicacion || 'Sin ubicación');
            tarjeta.setAttribute('badge-text', badgeText);
            tarjeta.setAttribute('badge-type', badgeType);

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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_Usuario: ID_USUARIO_ACTUAL })
                });

                if (response.ok) {
                    event.currentTarget.closest('post-card').remove();

                    if (gridGuardados.children.length === 0) {
                        gridGuardados.innerHTML = '<p style="text-align: center; color: var(--card-font-color); grid-column: 1 / -1;">No tienes publicaciones guardadas por el momento.</p>';
                    }
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