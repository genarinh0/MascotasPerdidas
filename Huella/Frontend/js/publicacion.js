const token = localStorage.getItem('JWT');
const payload = token ? JSON.parse(atob(token.split('.')[1])) : null;
const idUsuarioActual = payload?.id_Usuario;

const idPublicacion = new URLSearchParams(window.location.search).get('id');
if (!idPublicacion) window.location.href = 'feed.html';

const colorMap = {
    1: '#1a1a1a', 2: '#7e7e7e', 3: '#c0c0c0', 4: '#f7f7f7',
    5: '#5f6e7a', 6: '#5dade2', 7: '#4a2e1a', 8: '#b68a60',
    9: '#e8d5b5', 10: '#d88c3a', 11: '#f2d024', 12: '#4caf50'
};

const sizeMap = { 1: 'Pequeño', 2: 'Mediano', 3: 'Grande' };

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btnVolver').addEventListener('click', () => history.back());

    const url = window.location.href;
    document.getElementById('btnWhatsapp').addEventListener('click', () => {
        window.open(`https://wa.me/?text=${encodeURIComponent('Mira esta publicación en Huella: ' + url)}`, '_blank');
    });
    document.getElementById('btnFacebook').addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    });
    document.getElementById('btnCopiar').addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
            document.getElementById('btnCopiar').textContent = '¡Enlace Copiado!';
            setTimeout(() => document.getElementById('btnCopiar').textContent = '🔗 Copiar enlace', 2000);
        });
    });

    await cargarPublicacion();
});

async function cargarPublicacion() {
    try {
        const response = await fetch(`http://localhost:1984/api/publicacion/${idPublicacion}`);
        if (!response.ok) { window.location.href = 'feed.html'; return; }

        const data = await response.json();
        const pub = data.publicacion;
        const colores = data.colores;
        const fotos = data.fotos;

        // Badge
        const esPerdido = pub.tipo === 1;
        const badge = document.getElementById('badge');
        badge.textContent = esPerdido ? '¡Perdido!' : '¡Busca a su familia!';
        badge.classList.add(esPerdido ? 'pub-detail__badge--lost' : 'pub-detail__badge--found');

        // Botón acción (guardar o editar)
        const contenedorAccion = document.getElementById('contenedor-accion');
        const esMia = pub.id_Usuario === idUsuarioActual;

        if (esMia) {
            const btnEditar = document.createElement('button');
            btnEditar.className = 'pub-detail__action-btn pub-detail__action-btn--edit';
            btnEditar.textContent = 'Editar';
            btnEditar.addEventListener('click', () => {
                window.location.href = `editarPublicacion.html?id=${pub.id_Publicacion}`;
            });
            contenedorAccion.appendChild(btnEditar);
        } else if (token) {
            let guardado = false;
            try {
                const resG = await fetch('http://localhost:1984/api/guardados', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resG.ok) {
                    const dataG = await resG.json();
                    guardado = dataG.publicaciones.some(p => p.id_Publicacion === pub.id_Publicacion);
                }
            } catch {}

            const btnGuardar = document.createElement('button');
            btnGuardar.className = 'pub-detail__action-btn pub-detail__action-btn--save' + (guardado ? ' saved' : '');
            btnGuardar.textContent = guardado ? 'Publicación Guardada' : '+ Guardar';

            btnGuardar.addEventListener('click', async () => {
                if (!guardado) {
                    const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        guardado = true;
                        btnGuardar.textContent = 'Publicación Guardada';
                        btnGuardar.classList.add('saved');
                    }
                } else {
                    const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        guardado = false;
                        btnGuardar.textContent = '+ Guardar';
                        btnGuardar.classList.remove('saved');
                    }
                }
            });

            contenedorAccion.appendChild(btnGuardar);
        }

        // Carrusel
        const carousel = document.getElementById('carousel');
        const fotosList = fotos.length > 0 ? fotos : [{ imagenBase64: null }];

        fotosList.forEach((foto, i) => {
            const img = document.createElement('img');
            img.src = foto.imagenBase64
                ? `data:image/jpeg;base64,${foto.imagenBase64}`
                : './imagenes/img_1.png';
            img.classList.add('carousel__img');
            if (i === 0) img.classList.add('active');
            carousel.appendChild(img);
        });

        if (fotosList.length > 1) {
            const btnPrev = document.createElement('button');
            btnPrev.className = 'carousel__btn carousel__btn--prev';
            btnPrev.textContent = '‹';

            const btnNext = document.createElement('button');
            btnNext.className = 'carousel__btn carousel__btn--next';
            btnNext.textContent = '›';

            const dots = document.createElement('div');
            dots.className = 'carousel__dots';
            fotosList.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = 'carousel__dot' + (i === 0 ? ' active' : '');
                dot.addEventListener('click', () => goToSlide(i));
                dots.appendChild(dot);
            });

            carousel.appendChild(btnPrev);
            carousel.appendChild(btnNext);
            carousel.appendChild(dots);

            let current = 0;
            const imgs = carousel.querySelectorAll('.carousel__img');
            const dotEls = carousel.querySelectorAll('.carousel__dot');

            function goToSlide(n) {
                imgs[current].classList.remove('active');
                dotEls[current].classList.remove('active');
                current = (n + fotosList.length) % fotosList.length;
                imgs[current].classList.add('active');
                dotEls[current].classList.add('active');
            }

            btnPrev.addEventListener('click', () => goToSlide(current - 1));
            btnNext.addEventListener('click', () => goToSlide(current + 1));
        }

        // Fecha
        const fecha = new Date(pub.fecha_suceso);
        const fechaFormateada = fecha.toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Colores como círculos
        const circulos = colores.map(id => `
            <span style="
                display:inline-block; width:16px; height:16px;
                border-radius:50%; background:${colorMap[id] || '#ccc'};
                border:1px solid #ddd; margin-right:3px; vertical-align:middle;
            "></span>
        `).join('');

        // Atributos
        document.getElementById('attrs').innerHTML = `
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_huella.png" alt="">
                <span><b>Especie:</b> ${pub.especie}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_huella.png" alt="">
                <span><b>Raza:</b> ${pub.raza || 'Desconocida'}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_tamaño.png" alt="">
                <span><b>Tamaño:</b> ${sizeMap[pub.tamanio] || 'No especificado'}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_fecha.png" alt="">
                <span><b>Fecha:</b> ${fechaFormateada}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_color.png" alt="">
                <span><b>Colores:</b> ${circulos}</span>
            </div>
            ${pub.horario_contacto ? `
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_fecha.png" alt="">
                <span><b>Horario de contacto:</b> ${pub.horario_contacto}</span>
            </div>` : ''}
            <div class="pub-detail__attr" style="padding-top:8px; border-top:1px solid #E4E0DA; margin-top:4px;">
                <img src="imagenes/iconos/icono_ubicacion.png" alt="">
                <span><b>Publicado por:</b> ${pub.email_usuario}</span>
            </div>
        `;

        // Descripción
        document.getElementById('descripcion').textContent = pub.descripcion || 'Sin descripción.';

        // Mapa
        if (pub.latitud && pub.longitud) {
            document.getElementById('card-mapa').style.display = 'block';
            const map = L.map('mapa', {
                zoomControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false
            }).setView([pub.latitud, pub.longitud], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([pub.latitud, pub.longitud]).addTo(map);
        }

    } catch (error) {
        console.error('Error al cargar publicación:', error);
        window.location.href = 'feed.html';
    }
}