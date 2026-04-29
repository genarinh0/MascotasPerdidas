const token = localStorage.getItem('JWT');
const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
const idUsuarioActual = payload?.id_Usuario;

if (tokenExpirado(token)){
    localStorage.removeItem('JWT');
}

const btnUsarFiltros = document.getElementById("btnFilter");
btnUsarFiltros.addEventListener('click', () => {
    console.log('Filtros aplicados:', buildURL());
    cargarPublicaciones();
});

const dropdowns = document.querySelectorAll('.dropdown');
dropdowns.forEach(dropdown => {
    const btnFilter = dropdown.querySelector(".filter-button");
    const options = dropdown.querySelectorAll(".dropdown-item");
    const optionsList = dropdown.querySelector(".dropdown-options");

    btnFilter.addEventListener('click', () => {
        optionsList.classList.toggle('open');
        document.querySelectorAll('.dropdown').forEach(other => {
            if (other !== dropdown) {
                other.querySelector('.dropdown-options').classList.remove('open');
            }
        });
    });

    options.forEach(option => {
        const baseText = btnFilter.textContent.trim();
        dropdown.dataset.baseText = baseText;

        option.addEventListener('click', () => {
            const baseText = dropdown.dataset.baseText;
            const filterTextEl = dropdown.querySelector('.filter-button__text');
            const filterBtn = dropdown.querySelector('.filter-button');

            const prevClear = filterBtn.querySelector('.filter-clear-btn');
            if (prevClear) prevClear.remove();

            filterTextEl.textContent = baseText + ': ' + option.textContent;
            optionsList.dataset.selectedValue = option.dataset.value;
            optionsList.classList.remove('open');

            const clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.classList.add('filter-clear-btn');
            clearBtn.textContent = '✕';
            clearBtn.style.cssText = `
                position: absolute;
                top: -6px;
                right: -6px;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: none;
                background-color: #cc0000;
                color: white;
                font-size: 10px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            `;
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filterTextEl.textContent = baseText;
                optionsList.dataset.selectedValue = '';
                optionsList.classList.remove('open');
                clearBtn.remove();
            });

            filterBtn.style.position = 'relative';
            filterBtn.appendChild(clearBtn);
        });
    });
});

document.querySelectorAll('.color-option input').forEach(input => {
    input.addEventListener('change', (e) => {
        const selected = document.querySelectorAll('.color-option input:checked');
        if (selected.length > 3) {
            e.target.checked = false;
            return;
        }

        console.log("Selected colors:", Array.from(selected).map(i => i.value));
    });
});

const btnClearFilters = document.querySelector('.filter-bar__clear');
if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
        dropdowns.forEach(dropdown => {
            const baseText = dropdown.dataset.baseText;
            dropdown.querySelector('.filter-button__text').textContent = baseText;
            dropdown.querySelector('.dropdown-options').classList.remove('open');
            dropdown.querySelector('.dropdown-options').dataset.selectedValue = "";
            const prevClear = dropdown.querySelector('.filter-clear-btn');
            if (prevClear) prevClear.remove();
        });
    });
}

function getSelectedColors() {
    const selectedInputs = document.querySelectorAll('input[name="filter-color"]:checked');
    return Array.from(selectedInputs).map(input => input.value);
}

function buildURL(){
    let url = 'http://localhost:1984/api/publicaciones';
    const filters = {};

    document.querySelectorAll('.dropdown-options').forEach(group => {
        const groupName = group.dataset.filterGroup;
        const value = group.dataset.selectedValue;
        if (groupName === 'color') return;
        filters[groupName] = value ?? "";
    });

    const nonEmptyFilters = [];
    Object.entries(filters).forEach(([key, value]) => {
        if (value === "") return;
        // "Resuelto" viene como tipo=3 del dropdown pero debe convertirse a estatus=2
        if (key === 'tipo' && value === '3') {
            nonEmptyFilters.push(`estatus=2`);
        } else {
            nonEmptyFilters.push(`${key}=${value}`);
        }
    });

    const colores = getSelectedColors();
    if (colores.length > 0) {
        nonEmptyFilters.push(`colores=${colores.join(',')}`);
    }

    const fechaInicio = document.getElementById('filter-fecha-inicio').value;
    const fechaFin = document.getElementById('filter-fecha-fin').value;

    if (fechaInicio){
        nonEmptyFilters.push(`fechaInicio=${fechaInicio}`);
    }
    if (fechaFin){
        nonEmptyFilters.push(`fechaFin=${fechaFin}`);
    }

    const lat = document.getElementById('filtroLat').value;
    const long = document.getElementById('filtroLng').value;
    const radio = document.getElementById('inputRadio').value;

    if (lat){
        nonEmptyFilters.push(`latitud=${lat}`);
    }
    if (long){
        nonEmptyFilters.push(`longitud=${long}`);
    }
    if (radio){
        nonEmptyFilters.push(`radio=${radio}`);
    }

    if (nonEmptyFilters.length > 0){
        url += '?' + nonEmptyFilters.join('&');
    }

    console.log(url);
    return url;
}

const gridMisPubs = document.querySelector('.post-grid');

async function cargarPublicaciones() {
    gridMisPubs.innerHTML = '';
    try {
        let idsGuardados = new Set();
        try {
            const resGuardados = await fetch('http://localhost:1984/api/guardados', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (resGuardados.ok) {
                const dataGuardados = await resGuardados.json();
                dataGuardados.publicaciones.forEach(p => idsGuardados.add(p.id_Publicacion));
            }
        } catch (e) {
            console.warn('No se pudieron cargar guardados:', e);
        }

        const response = await fetch(buildURL());
        if (!response.ok) throw new Error('Error al obtener tus publicaciones');

        const data = await response.json();
        const publicaciones = data.publicaciones;

        if (publicaciones.length === 0) {
            console.log("Nada de publicaciones broskito");
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
            if (pub.estatus === 2) tarjeta.setAttribute('resolved', 'true');

            if (pub.imagenBase64) {
                tarjeta.setAttribute('imagen', `data:image/jpeg;base64,${pub.imagenBase64}`);
            } else {
                tarjeta.setAttribute('imagen', './imagenes/img_1.png');
            }

            const esMia = pub.id_Usuario === idUsuarioActual;

            console.log(`Pub ${pub.id_Publicacion}: id_Usuario=${pub.id_Usuario}, idUsuarioActual=${idUsuarioActual}, tipo=${typeof pub.id_Usuario} vs ${typeof idUsuarioActual}`);
            if (esMia) {
                // Botón editar
                const btnEditar = document.createElement('button');
                btnEditar.slot = 'header-action';
                btnEditar.className = 'pub-card__icon-btn btn-editar';
                btnEditar.setAttribute('data-id', pub.id_Publicacion);
                btnEditar.title = 'Editar publicación';
                btnEditar.innerHTML = '<img src="imagenes/iconos/icono_BtnEditarPublicacion.png" width="56" alt="Editar">';
                btnEditar.addEventListener('click', () => {
                    window.location.href = `editarPublicacion.html?id=${pub.id_Publicacion}`;
                });

                // Footer con ¡Lo encontré! y Eliminar
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
                                    cargarPublicaciones();
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
                btnEliminar.addEventListener('click', async () => {
                    if (confirm("¿Estás seguro de eliminar esta publicación? Esta acción no se puede deshacer.")) {
                        try {
                            const res = await fetch(`http://localhost:1984/api/publicaciones/${pub.id_Publicacion}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': 'Bearer ' + token }
                            });
                            if (res.ok) {
                                cargarPublicaciones();
                            } else if (res.status === 401) {
                                window.location.href = 'login.html';
                            } else {
                                alert('Error al borrar la publicación.');
                            }
                        } catch (err) {
                            console.error('Error al borrar:', err);
                        }
                    }
                });

                footerActions.appendChild(btnEncontrado);
                footerActions.appendChild(btnEliminar);

                tarjeta.appendChild(btnEditar);
                tarjeta.appendChild(footerActions);

            } else {
                // Botón guardar con toggle
                let guardado = idsGuardados.has(pub.id_Publicacion);

                const btnGuardar = document.createElement('button');
                btnGuardar.slot = 'header-action';
                btnGuardar.className = 'pub-card__icon-btn btn-guardar';
                btnGuardar.setAttribute('data-id', pub.id_Publicacion);
                btnGuardar.innerHTML = '<img src="imagenes/iconos/icono_guardado.png" width="20" alt="Guardado">';
                btnGuardar.style.filter = guardado ? 'none' : 'grayscale(100%) opacity(0.4)';
                btnGuardar.title = guardado ? 'Quitar de guardados' : 'Añadir a guardados';

                btnGuardar.addEventListener('click', async () => {
                    console.log('Click en Guardar pub: ', pub.id_Publicacion);
                    if (!guardado) {
                        try {
                            const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer ' + token }
                            });
                            if (res.ok) {
                                guardado = true;
                                btnGuardar.style.filter = 'none';
                                btnGuardar.title = 'Quitar de guardados';
                            } else if (res.status === 401) {
                                window.location.href = 'login.html';
                            } else {
                                console.error('Error al guardar.');
                            }
                        } catch (error) {
                            console.error('Error de red al guardar:', error);
                        }
                    } else {
                        try {
                            const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': 'Bearer ' + token }
                            });
                            if (res.ok) {
                                guardado = false;
                                btnGuardar.style.filter = 'grayscale(100%) opacity(0.4)';
                                btnGuardar.title = 'Añadir a guardados';
                            } else if (res.status === 401) {
                                window.location.href = 'login.html';
                            } else {
                                console.error('Error al quitar de guardados.');
                            }
                        } catch (error) {
                            console.error('Error de red al quitar:', error);
                        }
                    }
                });

                const btnContactar = document.createElement('button');
                btnContactar.slot = 'footer-action';
                btnContactar.className = 'pub-card__btn pub-card__btn--secondary';
                btnContactar.textContent = 'Contactar';

                btnContactar.addEventListener('click', async () => {
                    try {
                        // Obtener el ID del dueño de la publicación
                        const pubResponse = await fetch(`http://localhost:1984/api/publicacion/${pub.id_Publicacion}`);
                        const pubData = await pubResponse.json();
                        const idDueno = pubData.publicacion.id_Usuario;
                        
                        // Crear o recuperar el chat - AHORA CON ID_PUBLICACION
                        const chatResponse = await fetch('http://localhost:1984/api/chats/crear', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                id_usuario_2: idDueno,
                                id_publicacion: pub.id_Publicacion  // <-- AGREGAR ESTO
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
                tarjeta.appendChild(btnGuardar);
                tarjeta.appendChild(btnContactar);
            }

            gridMisPubs.appendChild(tarjeta);
        });

    } catch (error) {
        console.error('Error:', error);
        gridMisPubs.innerHTML = '<p style="text-align: center; color: red;">Error al cargar las publicaciones.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarPublicaciones();

    if (!token || tokenExpirado(token)) {
        const myProfileBtn = document.querySelector(".site-header__profile-btn");
        myProfileBtn.removeAttribute('onclick');

        const profileLabel = myProfileBtn.querySelector('.site-header__profile-label');
        if (profileLabel) profileLabel.textContent = 'Iniciar Sesión';

        myProfileBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation(); // evita bubbling
            window.location.href = 'login.html';
        });

        const navBarTags = document.querySelectorAll('a');
        navBarTags.forEach(tag => {
            tag.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation(); // evita bubbling
                if (tag.getAttribute('href') === 'feed.html') return;
                if (tag.classList.contains('fab-btn')) return;
                alert('Para usar esta función primero regístrate');
            });
        });
    }

    const defaultLat = 20.6767;
    const defaultLng = -103.3475;

    const mapFiltro = L.map('mapFiltro').setView([defaultLat, defaultLng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapFiltro);

    const markerFiltro = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(mapFiltro);

    function updateFilterCoords(lat, lng) {
        document.getElementById('filtroLat').value = lat;
        document.getElementById('filtroLng').value = lng;
    }

    function resetLocationFilter() {
        updateFilterCoords(null, null);
        markerFiltro.setLatLng([defaultLat, defaultLng]);
        mapFiltro.setView([defaultLat, defaultLng], 12);
    }

    resetLocationFilter();

    document.getElementById('btnResetLocation').addEventListener('click', () => {
        updateFilterCoords(null, null);
        markerFiltro.setLatLng([defaultLat, defaultLng]);
        mapFiltro.setView([defaultLat, defaultLng], 12);
    });

    markerFiltro.on('dragend', function(event) {
        const position = markerFiltro.getLatLng();
        updateFilterCoords(position.lat, position.lng);
    });

    mapFiltro.on('click', function(e) {
        markerFiltro.setLatLng(e.latlng);
        updateFilterCoords(e.latlng.lat, e.latlng.lng);
    });

    document.getElementById('btnToggleMapa').addEventListener('click', () => {
        setTimeout(() => {
            mapFiltro.invalidateSize();
        }, 300);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            mapFiltro.setView([userLat, userLng], 13);
            markerFiltro.setLatLng([userLat, userLng]);
        });
    }

    document.getElementById('filter-fecha-inicio').addEventListener('click', function () {
        this.showPicker();
    });

    document.getElementById('filter-fecha-fin').addEventListener('click', function () {
        this.showPicker();
    });
});

function tokenExpirado(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000; // exp viene en segundos
        return Date.now() > exp;
    } catch (e) {
        return true; // si falla, lo tratamos como inválido
    }
}