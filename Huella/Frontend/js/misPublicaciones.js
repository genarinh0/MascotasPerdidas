const gridMisPubs = document.getElementById('grid-mis-pubs');
const statsText = document.getElementById('stats-text');
const token = localStorage.getItem('JWT');

if (!token){
    window.location.href = 'login.html';
}

async function cargarMisPublicaciones() {
    try {
        const response = await fetch('http://localhost:1984/api/mis-publicaciones', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
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
            const tamaños = {
                1: 'Pequeño',
                2: 'Mediano',
                3: 'Grande'
            };
            const fecha = new Date(pub.fecha_suceso);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            tarjeta.setAttribute('especie', `${pub.especie}`);
            tarjeta.setAttribute('raza', `${pub.raza}`);
            tarjeta.setAttribute('tamaño', tamaños[pub.tamanio]);
            tarjeta.setAttribute('fecha', fechaFormateada);
            tarjeta.setAttribute('badge-text', badgeText);
            tarjeta.setAttribute('badge-type', badgeType);
            tarjeta.setAttribute('pub-id', pub.id_Publicacion);

            if (pub.imagenBase64) {
                tarjeta.setAttribute('imagen', `data:image/jpeg;base64,${pub.imagenBase64}`);
            } else {
                tarjeta.setAttribute('imagen', './imagenes/img_1.png');
            }

            const btnEditar = document.createElement('button');
            btnEditar.slot = 'header-action';
            btnEditar.className = 'pub-card__icon-btn btn-editar';
            btnEditar.setAttribute('data-id', pub.id_Publicacion);
            btnEditar.title = 'Editar publicación';
            btnEditar.innerHTML = '<img src="imagenes/iconos/icono_BtnEditarPublicacion.png" width="56" alt="Editar">';

            const footerActions = document.createElement('div');
            footerActions.slot = 'footer-action';
            footerActions.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;';

            const btnEncontrado = document.createElement('button');
            btnEncontrado.className = 'pub-card__btn pub-card__btn--success btn-encontrado';
            btnEncontrado.setAttribute('data-id', pub.id_Publicacion);
            btnEncontrado.textContent = pub.estatus === 1 ? 'Marcar como resuelto' : 'Resuelto'; 
            if (pub.estatus === 1){
                btnEncontrado.addEventListener('click', async () => {
                    if (confirm("¿Estás seguro de marcar esta publicación como resuelta?")) {
                        try {
                           const res = await fetch(`http://localhost:1984/api/publicaciones/${pub.id_Publicacion}/estatus`, {
                                method: 'PATCH',
                                headers: { 
                                    'Authorization': 'Bearer ' + token,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ estatus: 2 }) 
                            });

                            if (res.ok) {
                                btnEncontrado.textContent = 'Resuelto';
                                cargarMisPublicaciones();
                            } else if (res.status === 401) {
                                window.location.href = 'login.html';
                            } else {
                                alert('Error al actualizar el estatus de la publicación.');
                            }
                        } catch (err) {
                            console.error('Error interno al actualizar el estatus:', err);
                        }
                    }
                });
            }

            const btnEliminar = document.createElement('button');
            btnEliminar.className = 'pub-card__btn pub-card__btn--danger btn-eliminar';
            btnEliminar.setAttribute('data-id', pub.id_Publicacion);
            btnEliminar.textContent = 'Eliminar';

            footerActions.appendChild(btnEncontrado);
            footerActions.appendChild(btnEliminar);

            tarjeta.appendChild(btnEditar);
            tarjeta.appendChild(footerActions);

            gridMisPubs.appendChild(tarjeta);
        });

        conectarBotones();

    } catch (error) {
        console.error('Error:', error);
        gridMisPubs.innerHTML = '<p style="text-align: center; color: red;">Error al cargar tus publicaciones.</p>';
    }
}

function conectarBotones() {
    const botonesEditar = document.querySelectorAll('.btn-editar');
    botonesEditar.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idPub = e.currentTarget.getAttribute('data-id');
            window.location.href = `editarPublicacion.html?id=${idPub}`;
        });
    });

    const botonesEliminar = document.querySelectorAll('.btn-eliminar');
    botonesEliminar.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idPub = e.currentTarget.getAttribute('data-id');

            if (confirm("¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.")) {
                try {
                    const res = await fetch(`http://localhost:1984/api/publicaciones/${idPub}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });

                    if (res.ok) {
                        cargarMisPublicaciones();
                    } else if (res.status === 401) {
                        window.location.href = 'login.html';
                        return;
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