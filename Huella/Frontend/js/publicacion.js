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
    // Volver
    document.getElementById('btnVolver').addEventListener('click', () => history.back());

    // Compartir
    const url = window.location.href;
    document.getElementById('btnWhatsapp').addEventListener('click', () => {
        window.open(`https://wa.me/?text=${encodeURIComponent('Mira esta publicación en Huella: ' + url)}`, '_blank');
    });
    document.getElementById('btnFacebook').addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    });
    document.getElementById('btnCopiar').addEventListener('click', () => {
        navigator.clipboard.writeText(url).then(() => {
            document.getElementById('btnCopiar').textContent = '¡Copiado!';
            setTimeout(() => document.getElementById('btnCopiar').textContent = 'Copiar enlace', 2000);
        });
    });

    await cargarPublicacion();
});

async function cargarPublicacion() {
    try {
        const response = await fetch(`http://localhost:1984/api/publicacion/${idPublicacion}`);

        if (!response.ok) {
            window.location.href = 'feed.html';
            return;
        }

        const data = await response.json();
        const pub = data.publicacion;
        const colores = data.colores;
        const fotos = data.fotos;

        // Badge
        const badge = document.getElementById('badge');
        const esPerdido = pub.tipo === 1;
        badge.textContent = esPerdido ? '¡Perdido!' : '¡Busca a su familia!';
        badge.classList.add(esPerdido ? 'pub-detail__badge--lost' : 'pub-detail__badge--found');

        // Descripción
        document.getElementById('descripcion').textContent = pub.descripcion || 'Sin descripción.';

        // Fecha formateada
        const fecha = new Date(pub.fecha_suceso);
        const fechaFormateada = fecha.toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        // Colores como círculos
        const circulos = colores.map(id => `
            <span style="
                display:inline-block;
                width:16px; height:16px;
                border-radius:50%;
                background:${colorMap[id] || '#ccc'};
                border:1px solid #ddd;
                margin-right:4px;
            "></span>
        `).join('');

        // Atributos
        document.getElementById('attrs').innerHTML = `
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_huella.png" alt="Especie">
                <span><b>Especie:</b> ${pub.especie}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_huella.png" alt="Raza">
                <span><b>Raza:</b> ${pub.raza || 'Desconocida'}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_tamaño.png" alt="Tamaño">
                <span><b>Tamaño:</b> ${sizeMap[pub.tamanio] || 'No especificado'}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_fecha.png" alt="Fecha">
                <span><b>Fecha:</b> ${fechaFormateada}</span>
            </div>
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_color.png" alt="Colores">
                <span><b>Colores:</b> ${circulos}</span>
            </div>
            ${pub.horario_contacto ? `
            <div class="pub-detail__attr">
                <img src="imagenes/iconos/icono_fecha.png" alt="Horario">
                <span><b>Horario de contacto:</b> ${pub.horario_contacto}</span>
            </div>` : ''}
            <div class="pub-detail__attr" style="padding-top:4px; border-top: 1px solid #E4E0DA; margin-top:4px;">
                <img src="imagenes/iconos/icono_ubicacion.png" alt="Publicado por">
                <span><b>Publicado por:</b> ${pub.email_usuario}</span>
            </div>
        `;

        // Carrusel
        const carousel = document.getElementById('carousel');
        if (fotos.length > 0) {
            fotos.forEach((foto, i) => {
                const img = document.createElement('img');
                img.src = `data:image/jpeg;base64,${foto.imagenBase64}`;
                img.classList.add('carousel__img');
                if (i === 0) img.classList.add('active');
                carousel.appendChild(img);
            });

            if (fotos.length > 1) {
                const btnPrev = document.createElement('button');
                btnPrev.className = 'carousel__btn carousel__btn--prev';
                btnPrev.textContent = '‹';

                const btnNext = document.createElement('button');
                btnNext.className = 'carousel__btn carousel__btn--next';
                btnNext.textContent = '›';

                const dots = document.createElement('div');
                dots.className = 'carousel__dots';

                fotos.forEach((_, i) => {
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
                    current = (n + fotos.length) % fotos.length;
                    imgs[current].classList.add('active');
                    dotEls[current].classList.add('active');
                }

                btnPrev.addEventListener('click', () => goToSlide(current - 1));
                btnNext.addEventListener('click', () => goToSlide(current + 1));
            }
        } else {
            carousel.innerHTML = '<img src="imagenes/img_1.png" class="carousel__img active" style="width:100%;height:100%;object-fit:cover;">';
        }

        // Mapa
        if (pub.latitud && pub.longitud) {
            const map = L.map('mapa', { zoomControl: false, dragging: false, scrollWheelZoom: false })
                .setView([pub.latitud, pub.longitud], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([pub.latitud, pub.longitud]).addTo(map);
        } else {
            document.getElementById('mapa').style.display = 'none';
        }

        // Botón guardar (solo si no es propia y hay sesión)
        const contenedorGuardar = document.getElementById('contenedor-guardar');
        const esMia = pub.id_Usuario === idUsuarioActual;

        if (token && !esMia) {
            // Verificar si ya está guardada
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
            btnGuardar.className = 'pub-detail__save-btn' + (guardado ? ' pub-detail__save-btn--saved' : '');
            btnGuardar.textContent = guardado ? '✓ Guardado' : '+ Guardar publicación';

            btnGuardar.addEventListener('click', async () => {
                if (!guardado) {
                    const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        guardado = true;
                        btnGuardar.textContent = '✓ Guardado';
                        btnGuardar.classList.add('pub-detail__save-btn--saved');
                    }
                } else {
                    const res = await fetch(`http://localhost:1984/api/guardados/${pub.id_Publicacion}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (res.ok) {
                        guardado = false;
                        btnGuardar.textContent = '+ Guardar publicación';
                        btnGuardar.classList.remove('pub-detail__save-btn--saved');
                    }
                }
            });

            contenedorGuardar.appendChild(btnGuardar);
        }

    } catch (error) {
        console.error('Error al cargar publicación:', error);
        window.location.href = 'feed.html';
    }
}