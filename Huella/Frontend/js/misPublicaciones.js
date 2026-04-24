const gridMisPubs = document.getElementById('grid-mis-pubs');
const statsText = document.getElementById('stats-text');
const ID_USUARIO_ACTUAL = 1; //Hardcodeado

async function cargarMisPublicaciones() {
    try {
        const response = await fetch('http://localhost:1984/api/publicaciones');
        if (!response.ok) throw new Error('Error al obtener tus publicaciones');

        const data = await response.json();
        const publicaciones = data.publicaciones;

        gridMisPubs.innerHTML = '';

        statsText.innerHTML = `Tienes <b>${publicaciones.length}</b> publicaciones activas`;
        if (publicaciones.length === 0) {
            gridMisPubs.innerHTML = '<p style="text-align: center; color: var(--card-font-color); grid-column: 1 / -1;">No has creado ninguna publicación aún.</p>';
            return;
        }

        publicaciones.forEach(pub => {
            const tarjeta = document.createElement('post-card');
            const isPerdido = pub.tipo === 1;
            const badgeText = isPerdido ? '¡Perdido!' : '¡Busca a su familia!';
            const badgeType = isPerdido ? 'lost' : 'found';

            tarjeta.setAttribute('especie', `${pub.especie} • ${pub.raza || 'Mestizo'}`);
            tarjeta.setAttribute('ubicacion', pub.ubicacion);
            tarjeta.setAttribute('badge-text', badgeText);
            tarjeta.setAttribute('badge-type', badgeType);

            if (pub.imagenBase64) {
                tarjeta.setAttribute('imagen', `data:image/jpeg;base64,${pub.imagenBase64}`);
            } else {
                tarjeta.setAttribute('imagen', './imagenes/img_1.png');
            }

            tarjeta.innerHTML = `
                <button slot="header-action" class="pub-card__icon-btn btn-editar" data-id="${pub.id_Publicacion}" title="Editar publicación">
                    <img src="imagenes/iconos/icono_editar.png" width="18" alt="Editar">
                </button>

                <div slot="footer-action" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
                    <button class="pub-card__btn pub-card__btn--success btn-encontrado" data-id="${pub.id_Publicacion}">¡Lo encontré!</button>
                    <button class="pub-card__btn pub-card__btn--danger btn-eliminar" data-id="${pub.id_Publicacion}">Eliminar</button>
                </div>
            `;

            gridMisPubs.appendChild(tarjeta);
        });

        conectarBotones();

    } catch (error) {
        console.error('Error:', error);
        gridMisPubs.innerHTML = '<p style="text-align: center; color: red;">Error al cargar tus publicaciones.</p>';
    }
}

function conectarBotones() {
    const botonesEliminar = document.querySelectorAll('.btn-eliminar');

    botonesEliminar.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idPub = e.currentTarget.getAttribute('data-id');

            if (confirm("¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.")) {
                try {
                    const res = await fetch(`http://localhost:1984/api/publicaciones/${idPub}`, {
                        method: 'DELETE'
                    });

                    if (res.ok) {
                        cargarMisPublicaciones();
                    } else {
                        alert('Error al borrar la publicación.');
                    }
                } catch (err) {
                    console.error('Error al borrar:', err);
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', cargarMisPublicaciones);