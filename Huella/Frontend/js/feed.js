const token = localStorage.getItem('JWT');
if (!token){
    window.location.href = 'login.html';
}

const btnUsarFiltros = document.getElementById("btnFilter");
btnUsarFiltros.addEventListener('click', cargarPublicaciones);

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

            // Limpiar X previa si existe
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

function buildURL(){
    let url = 'http://localhost:1984/api/publicaciones';

    const filters = {};

    document.querySelectorAll('.dropdown-options').forEach(group => {
        const groupName = group.dataset.filterGroup;
        const value = group.dataset.selectedValue;

        filters[groupName] = value ?? "";
    });

    const nonEmptyFilters = [];

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== ""){
            nonEmptyFilters.push(`${key}=${value}`);
        }
    });

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
        const response = await fetch(buildURL());
        console.log(response);
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

            tarjeta.setAttribute('especie', `${pub.especie} • ${pub.raza || 'Mestizo'}`);
            tarjeta.setAttribute('ubicacion', pub.ubicacion);
            tarjeta.setAttribute('badge-text', badgeText);
            tarjeta.setAttribute('badge-type', badgeType);

            tarjeta.innerHTML = `
                <button slot="header-action" class="pub-card__icon-btn btn-guardar" data-id="${pub.id_Publicacion}" title="Añadir a guardados">
                    <img src="imagenes/iconos/icono_guardado.png" width="20" alt="Guardado">
                </button>

                <div slot="extra-attributes" class="attribute">
                    <img src="imagenes/iconos/icono_color.png" class="attribute__icon" alt="Color/Raza">
                    <label><b class="attribute__type">Raza:</b> ${pub.raza || 'Mestizo'}</label>
                </div>

                <button slot="footer-action" class="pub-card__btn pub-card__btn--secondary">Contactar</button>
            `;

            if (pub.imagenBase64) {
                tarjeta.setAttribute('imagen', `data:image/jpeg;base64,${pub.imagenBase64}`);
            } else {
                tarjeta.setAttribute('imagen', './imagenes/img_1.png');
            }

            gridMisPubs.appendChild(tarjeta);
        });

        conectarBotonesGuardar();

    } catch (error) {
        console.error('Error:', error);
        gridMisPubs.innerHTML = '<p style="text-align: center; color: red;">Error al cargar las publicaciones.</p>';
    }
}

function conectarBotonesGuardar(){
    const botonGuardar = document.querySelectorAll('.btn-guardar');

    botonesGuardar.forEach(boton => {
        boton.addEventListener('click', async (event) => {
            const idPublicacion = event.currentTarget.getAttribute('data-id');

            try {
                const response = await fetch(`http://localhost:1984/api/guardados/${idPublicacion}`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });

                if (response.ok) {
                    alert("Publicacion Guardada con Exito");
                } else if (response.status === 401){
                    window.location.href = 'login.html';
                    return;
                } else {
                    console.error('Error al guardar en el servidor.');
                    alert("Error al Guardar Publicacion");
                }
            } catch (error) {
                console.error('Error de red al guardar:', error);
                alert("Error con el Servidor");
            }
        });
    })
}

document.addEventListener('DOMContentLoaded', cargarPublicaciones);