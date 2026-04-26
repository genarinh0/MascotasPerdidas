const token = localStorage.getItem('JWT');
if (!token) {
    window.location.href = 'login.html';
}

const idPublicacion = new URLSearchParams(window.location.search).get('id');
if (!idPublicacion) {
    window.location.href = 'misPublicaciones.html';
}

let archivosAcumulados = [];
let map;
let marker;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btnCancelNav').addEventListener('click', () => {
        window.location.href = 'misPublicaciones.html';
    });

    const defaultLat = 20.6767;
    const defaultLng = -103.3475;

    map = L.map('map').setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    function updateCoords(lat, lng) {
        document.getElementById('inputLat').value = lat;
        document.getElementById('inputLng').value = lng;
    }

    marker.on('dragend', function(event) {
        const position = marker.getLatLng();
        updateCoords(position.lat, position.lng);
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng.lat, e.latlng.lng);
    });
    // =========================================

    const inputTipo = document.getElementById('inputTipo');
    inputTipo.addEventListener('change', () => {
        inputTipo.classList.remove('input-tipo--perdido', 'input-tipo--encontrado');
        if (inputTipo.value === '1') {
            inputTipo.classList.add('input-tipo--perdido');
        } else if (inputTipo.value === '2') {
            inputTipo.classList.add('input-tipo--encontrado');
        }
        inputTipo.blur();
    });

    document.getElementById('inputFecha').addEventListener('click', function () {
        this.showPicker();
    });

    document.querySelectorAll('input[name="colores"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const seleccionados = document.querySelectorAll('input[name="colores"]:checked');
            if (seleccionados.length > 3) {
                cb.checked = false;
            }
        });
    });

    const inputFotos = document.getElementById('photos');
    const previewFotos = document.getElementById('previewFotos');

    inputFotos.addEventListener('change', () => {
        const formatosValidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

        Array.from(inputFotos.files).forEach((file) => {
            if (!formatosValidos.includes(file.type.toLowerCase())) {
                alert(`Formato de imagen inválido: ${file.name}`);
                return;
            }
            if (archivosAcumulados.length >= 10) {
                alert('Solo puedes subir un máximo de 10 imágenes.');
                return;
            }

            const index = archivosAcumulados.length;
            archivosAcumulados.push(file);

            const reader = new FileReader();
            reader.onload = () => {
                const wrapper = document.createElement('div');
                wrapper.classList.add('preview-fotos__item');
                wrapper.dataset.index = index;

                const img = document.createElement('img');
                img.src = reader.result;
                img.classList.add('preview-fotos__img');

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.classList.add('preview-fotos__delete');
                btn.textContent = '✕';
                btn.addEventListener('click', () => {
                    archivosAcumulados.splice(parseInt(wrapper.dataset.index), 1);
                    wrapper.remove();
                    document.querySelectorAll('.preview-fotos__item').forEach((el, i) => {
                        el.dataset.index = i;
                    });
                });

                wrapper.appendChild(img);
                wrapper.appendChild(btn);
                previewFotos.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    });

    await cargarPublicacion();

    document.getElementById('btnGuardar').addEventListener('click', async () => {
        if (!validarFormulario()) return;

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        const imagenesBase64 = [];
        for (let file of archivosAcumulados) {
            const base64 = await fileToBase64(file);
            imagenesBase64.push(base64);
        }

        const checkboxesColores = document.querySelectorAll('input[name="colores"]:checked');
        const colores = Array.from(checkboxesColores).map(cb => parseInt(cb.value));

        const sizeMap = { 'pequeño': 1, 'mediano': 2, 'grande': 3 };
        const sizeString = document.getElementById('inputTamanio').value;

        // SE ENVIAN LATITUD Y LONGITUD
        const pubEditada = {
            tipo: parseInt(document.getElementById('inputTipo').value),
            especie: document.getElementById('inputEspecie').value,
            raza: document.getElementById('inputRaza').value || 'Desconocida',
            tamanio: sizeMap[sizeString] || 2,
            descripcion: document.getElementById('inputDescripcion').value,
            fecha_suceso: document.getElementById('inputFecha').value,
            latitud: parseFloat(document.getElementById('inputLat').value),
            longitud: parseFloat(document.getElementById('inputLng').value),
            horario_contacto: document.getElementById('inputHorario').value || 'Cualquier hora',
            colores: colores,
            imagenes: imagenesBase64
        };

        try {
            const response = await fetch(`http://localhost:1984/api/publicaciones/${idPublicacion}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(pubEditada)
            });

            if (response.ok) {
                window.location.href = 'misPublicaciones.html';
            } else if (response.status === 401) {
                window.location.href = 'login.html';
            } else {
                const err = await response.json();
                console.error('Error del servidor:', err);
                alert('Hubo un error al editar la publicación.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    });
});

async function cargarPublicacion() {
    try {
        const response = await fetch(`http://localhost:1984/api/publicaciones/${idPublicacion}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        if (!response.ok) throw new Error('Error al obtener la publicación');

        const data = await response.json();
        const pub = data.publicacion;
        const colores = data.colores;

        const inputTipo = document.getElementById('inputTipo');
        inputTipo.value = pub.tipo;
        inputTipo.classList.remove('input-tipo--perdido', 'input-tipo--encontrado');
        if (pub.tipo == 1) inputTipo.classList.add('input-tipo--perdido');
        if (pub.tipo == 2) inputTipo.classList.add('input-tipo--encontrado');

        document.getElementById('inputEspecie').value = pub.especie;
        document.getElementById('inputRaza').value = pub.raza || '';

        const sizeReverseMap = { 1: 'pequeño', 2: 'mediano', 3: 'grande' };
        document.getElementById('inputTamanio').value = sizeReverseMap[pub.tamanio] || 'mediano';

        document.getElementById('inputFecha').value = pub.fecha_suceso?.split('T')[0] || '';
        document.getElementById('inputHorario').value = pub.horario_contacto || '';
        document.getElementById('inputDescripcion').value = pub.descripcion;

        const lat = pub.latitud || 20.6767;
        const lng = pub.longitud || -103.3475;
        document.getElementById('inputLat').value = lat;
        document.getElementById('inputLng').value = lng;

        if (map && marker) {
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
        }

        colores.forEach(idColor => {
            const cb = document.querySelector(`input[name="colores"][value="${idColor}"]`);
            if (cb) cb.checked = true;
        });

        // Traer todas las fotos
        const resF = await fetch(`http://localhost:1984/api/publicaciones/${idPublicacion}/fotos`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const dataFotos = await resF.json();
        const previewFotos = document.getElementById('previewFotos');

        for (const foto of dataFotos.fotos) {
            const index = archivosAcumulados.length;

            const wrapper = document.createElement('div');
            wrapper.classList.add('preview-fotos__item');
            wrapper.dataset.index = index;

            const img = document.createElement('img');
            img.src = `data:image/jpeg;base64,${foto.imagenBase64}`;
            img.classList.add('preview-fotos__img');

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.classList.add('preview-fotos__delete');
            btn.textContent = '✕';
            btn.addEventListener('click', () => {
                archivosAcumulados.splice(parseInt(wrapper.dataset.index), 1);
                wrapper.remove();
                document.querySelectorAll('.preview-fotos__item').forEach((el, i) => {
                    el.dataset.index = i;
                });
            });

            wrapper.appendChild(img);
            wrapper.appendChild(btn);
            previewFotos.appendChild(wrapper);

            const byteString = atob(foto.imagenBase64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: 'image/jpeg' });
            const file = new File([blob], `foto_${foto.id_Fotografia}.jpg`, { type: 'image/jpeg' });
            archivosAcumulados.push(file);
        }

    } catch (error) {
        console.error('Error al cargar publicación:', error);
        alert('No se pudo cargar la publicación.');
        window.location.href = 'misPublicaciones.html';
    }
}

const validarFormulario = () => {
    document.getElementById('alertaCampos').style.display = 'none';
    let valido = true;

    document.querySelectorAll('.card__label').forEach(label => {
        label.style.color = '';
    });

    const camposObligatorios = [
        { el: document.getElementById('inputTipo') },
        { el: document.getElementById('inputEspecie') },
        { el: document.getElementById('inputTamanio') },
        { el: document.getElementById('inputFecha') },
        { el: document.getElementById('inputDescripcion') },
    ];

    camposObligatorios.forEach(({ el }) => {
        if (!el.value.trim()) {
            valido = false;
            const campo = el.closest('.card__field');
            if (campo) campo.querySelector('.card__label').style.color = '#cc0000';
        }
    });

    const coloresSeleccionados = document.querySelectorAll('input[name="colores"]:checked');
    if (coloresSeleccionados.length === 0) {
        valido = false;
        const campoColores = document.querySelector('input[name="colores"]').closest('.card__field');
        if (campoColores) campoColores.querySelector('.card__label').style.color = '#cc0000';
    }

    if (!valido) {
        document.getElementById('alertaCampos').style.display = 'block';
    }

    return valido;
};