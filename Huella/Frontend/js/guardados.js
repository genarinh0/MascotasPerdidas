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

            tarjeta.setAttribute('especie', pub.especie.charAt(0).toUpperCase() + pub.especie.slice(1));
            tarjeta.setAttribute('raza', pub.raza ? pub.raza.charAt(0).toUpperCase() + pub.raza.slice(1) : '');
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

            const btnContactar = document.createElement('button');
            btnContactar.slot = 'footer-action';
            btnContactar.className = 'pub-card__btn pub-card__btn--secondary';
            btnContactar.textContent = 'Contactar';

            btnContactar.addEventListener('click', async () => {
                try {
                    const pubResponse = await fetch(`http://localhost:1984/api/publicacion/${pub.id_Publicacion}`);
                    const pubData = await pubResponse.json();
                    const idDueno = pubData.publicacion.id_Usuario;

                    const chatResponse = await fetch('http://localhost:1984/api/chats/crear', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            id_usuario_2: idDueno,
                            id_publicacion: pub.id_Publicacion
                        })
                    });

                    if (chatResponse.status === 401) {
                        alert('Para usar esta función primero regístrate');
                        return;
                    }

                    const chatData = await chatResponse.json();

                    if (chatResponse.ok) {
                        localStorage.setItem('chatSeleccionado', JSON.stringify({
                            id_chat: chatData.id_chat,
                            nombre_usuario: pubData.publicacion.email_usuario || 'Usuario'
                        }));
                        window.location.href = 'chats.html';
                    } else {
                        alert('Error al crear el chat: ' + (chatData.error || 'Intenta de nuevo'));
                    }
                } catch (error) {
                    console.error('Error al crear el chat:', error);
                    alert('Error de conexión al servidor.');
                }
            });

            tarjeta.appendChild(btnQuitar);
            tarjeta.appendChild(btnContactar);

            gridGuardados.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error al cargar datos:', error);
        gridGuardados.innerHTML = '<p style="text-align: center; color: var(--danger-text); grid-column: 1 / -1;">Error al cargar las publicaciones guardadas.</p>';
    }
}

document.addEventListener('DOMContentLoaded', cargarGuardados);