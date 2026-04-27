const token = localStorage.getItem('JWT');

if (!token){
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCrearPub');
    const inputTipo = document.getElementById('inputTipo');
    const inputFotos = document.getElementById('photos');
    const previewFotos = document.getElementById('previewFotos');
    let archivosAcumulados = [];

    const defaultLat = 20.6767;
    const defaultLng = -103.3475;

    const map = L.map('map').setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    function updateCoords(lat, lng) {
        document.getElementById('inputLat').value = lat;
        document.getElementById('inputLng').value = lng;
    }

    updateCoords(defaultLat, defaultLng);

    marker.on('dragend', function(event) {
        const position = marker.getLatLng();
        updateCoords(position.lat, position.lng);
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng.lat, e.latlng.lng);
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            map.setView([userLat, userLng], 15);
            marker.setLatLng([userLat, userLng]);
            updateCoords(userLat, userLng);
        }, () => {
            console.log("El usuario no dio permisos de ubicación. Usando coordenadas por defecto.");
        });
    }

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
    document.getElementById('inputFecha').max = new Date().toISOString().split('T')[0];

    document.querySelectorAll('input[name="colores"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const seleccionados = document.querySelectorAll('input[name="colores"]:checked');
            if (seleccionados.length > 3) {
                cb.checked = false;
            }
        });
    });

    // Horario
    const radiosHorario = document.querySelectorAll('input[name="horarioTipo"]');
    const horarioRango = document.getElementById('horarioRango');
    const sliderDesde = document.getElementById('horarioDesde');
    const sliderHasta = document.getElementById('horarioHasta');
    const valorDesde = document.getElementById('horarioDesdeValor');
    const valorHasta = document.getElementById('horarioHastaValor');
    const inputHorario = document.getElementById('inputHorario');

    function formatHora(h) {
        return `${String(h).padStart(2, '0')}:00`;
    }

    function actualizarHorario() {
        const tipo = document.querySelector('input[name="horarioTipo"]:checked').value;
        if (tipo === 'cualquier') {
            inputHorario.value = 'Cualquier hora';
            horarioRango.style.display = 'none';
        } else {
            inputHorario.value = `${formatHora(sliderDesde.value)} - ${formatHora(sliderHasta.value)}`;
            horarioRango.style.display = 'flex';
        }
    }

    radiosHorario.forEach(r => r.addEventListener('change', actualizarHorario));

    sliderDesde.addEventListener('input', () => {
        if (parseInt(sliderDesde.value) > parseInt(sliderHasta.value)) {
            sliderHasta.value = sliderDesde.value;
            valorHasta.textContent = formatHora(sliderHasta.value);
        }
        valorDesde.textContent = formatHora(sliderDesde.value);
        inputHorario.value = `${formatHora(sliderDesde.value)} - ${formatHora(sliderHasta.value)}`;
    });

    sliderHasta.addEventListener('input', () => {
        if (parseInt(sliderHasta.value) < parseInt(sliderDesde.value)) {
            sliderDesde.value = sliderHasta.value;
            valorDesde.textContent = formatHora(sliderDesde.value);
        }
        valorHasta.textContent = formatHora(sliderHasta.value);
        inputHorario.value = `${formatHora(sliderDesde.value)} - ${formatHora(sliderHasta.value)}`;
    });

    actualizarHorario();

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

        if (archivosAcumulados.length === 0) {
            valido = false;
            const campoFotos = document.getElementById('photos').closest('.card__field');
            if (campoFotos) campoFotos.querySelector('.card__label').style.color = '#cc0000';
        }

        if (!valido){
            document.getElementById('alertaCampos').style.display = 'block';
        }

        return valido;
    };

    document.getElementById('btnPublicar').addEventListener('click', async () => {
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

        const nuevaPublicacion = {
            tipo: parseInt(document.getElementById('inputTipo').value),
            especie: document.getElementById('inputEspecie').value,
            raza: document.getElementById('inputRaza').value || 'Desconocida',
            tamanio: sizeMap[sizeString] || 2,
            descripcion: document.getElementById('inputDescripcion').value,
            fecha_suceso: document.getElementById('inputFecha').value,
            latitud: parseFloat(document.getElementById('inputLat').value),
            longitud: parseFloat(document.getElementById('inputLng').value),
            horario_contacto: inputHorario.value || 'Cualquier hora',
            colores: colores,
            imagenes: imagenesBase64
        };

        try {
            const response = await fetch('http://localhost:1984/api/publicaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(nuevaPublicacion)
            });

            if (response.ok) {
                window.location.href = 'misPublicaciones.html';
            } else if (response.status === 401) {
                window.location.href = 'login.html';
                return;
            } else {
                const err = await response.json();
                console.error('Error del servidor:', err);
                alert('Hubo un error al crear la publicación.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    });

    document.getElementById('btnCancelNav').addEventListener('click', () => {
        window.location.href = 'feed.html';
    });
});