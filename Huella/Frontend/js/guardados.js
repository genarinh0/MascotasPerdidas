const gridGuardados = document.getElementById('grid-guardados');
const token = localStorage.getItem('JWT');

if (!token){
    window.location.href = 'login.html';
}

async function cargarGuardados() {
    try {
        const response = await fetch('http://localhost:1984/api/guardados', {
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

            // Botón quitar con toggle
            let guardado = true;
            const btnQuitar = document.createElement('button');
            btnQuitar.slot = 'header-action';
            btnQuitar.className = 'pub-card__icon-btn btn-quitar';
            btnQuitar.setAttribute('data-id', pub.id_Publicacion);
            btnQuitar.title = 'Quitar de guardados';
            btnQuitar.innerHTML = '<img src="imagenes/iconos/icono_guardado.png" width="20" alt="Guardado">';
            btnQuitar.style.filter = 'none';

            btnQuitar.addEventListener('click', async () => {
                if (guardado) {
                    try {
                        const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (res.ok) {
                            guardado = false;
                            btnQuitar.style.filter = 'grayscale(100%) opacity(0.4)';
                            btnQuitar.title = 'Añadir a guardados';
                        } else if (res.status === 401) {
                            window.location.href = 'login.html';
                        } else {
                            console.error('Error al quitar de guardados.');
                        }
                    } catch (error) {
                        console.error('Error de red al quitar:', error);
                    }
                } else {
                    try {
                        const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                            method: 'POST',
                            headers: { 'Authorization': 'Bearer ' + token }
                        });
                        if (res.ok) {
                            guardado = true;
                            btnQuitar.style.filter = 'none';
                            btnQuitar.title = 'Quitar de guardados';
                        } else if (res.status === 401) {
                            window.location.href = 'login.html';
                        } else {
                            console.error('Error al re-guardar.');
                        }
                    } catch (error) {
                        console.error('Error de red al re-guardar:', error);
                    }
                }
            });

            const extraAttr = document.createElement('div');
            extraAttr.slot = 'extra-attributes';
            extraAttr.className = 'attribute';
            extraAttr.innerHTML = `
                <img src="imagenes/iconos/icono_color.png" class="attribute__icon" alt="Color/Raza">
                <label><b class="attribute__type">Raza:</b> ${pub.raza || 'Mestizo'}</label>
            `;

            const btnContactar = document.createElement('button');
            btnContactar.slot = 'footer-action';
            btnContactar.className = 'pub-card__btn pub-card__btn--secondary';
            btnContactar.textContent = 'Contactar';

            tarjeta.appendChild(btnQuitar);
            tarjeta.appendChild(extraAttr);
            tarjeta.appendChild(btnContactar);

            gridGuardados.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error al cargar datos:', error);
        gridGuardados.innerHTML = '<p style="text-align: center; color: var(--danger-text); grid-column: 1 / -1;">Error al cargar las publicaciones guardadas.</p>';
    }
}

document.addEventListener('DOMContentLoaded', cargarGuardados);