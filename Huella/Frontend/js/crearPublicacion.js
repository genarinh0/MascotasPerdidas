document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCrearPub');
    const inputTipo = document.getElementById('inputTipo');
    const inputFotos = document.getElementById('photos');
    const previewFotos = document.getElementById('previewFotos');
    let archivosAcumulados = [];

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

    const ID_USUARIO_ACTUAL = 1; //Hardcodeado

    const validarFormulario = () => {

        document.getElementById('alertaCampos').style.display = 'none';

        let valido = true;

        // Limpiar estilos previos
        document.querySelectorAll('.card__label').forEach(label => {
            label.style.color = '';
        });

        const camposObligatorios = [
            { el: document.getElementById('inputTipo') },
            { el: document.getElementById('inputEspecie') },
            { el: document.getElementById('inputTamanio') },
            { el: document.getElementById('inputUbicacion') },
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

        // Validar colores
        const coloresSeleccionados = document.querySelectorAll('input[name="colores"]:checked');
        if (coloresSeleccionados.length === 0) {
            valido = false;
            const campoColores = document.querySelector('input[name="colores"]').closest('.card__field');
            if (campoColores) campoColores.querySelector('.card__label').style.color = '#cc0000';
        }

        // Validar fotos
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

        //Convertir a Base64
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        //Imagenes
        const imagenesBase64 = [];
        for (let file of archivosAcumulados) {
            const base64 = await fileToBase64(file);
            imagenesBase64.push(base64);
        }

        //Colores
        const checkboxesColores = document.querySelectorAll('input[name="colores"]:checked');
        const colores = Array.from(checkboxesColores).map(cb => parseInt(cb.value));

        const sizeMap = { 'pequeño': 1, 'mediano': 2, 'grande': 3 };
        const sizeString = document.getElementById('inputTamanio').value;

        const nuevaPublicacion = {
            id_Usuario: ID_USUARIO_ACTUAL,
            tipo: parseInt(document.getElementById('inputTipo').value), // 1 o 2
            especie: document.getElementById('inputEspecie').value,
            raza: document.getElementById('inputRaza').value || 'Desconocida',
            tamanio: sizeMap[sizeString] || 2,
            descripcion: document.getElementById('inputDescripcion').value,
            fecha_suceso: document.getElementById('inputFecha').value,
            ubicacion: document.getElementById('inputUbicacion').value,
            horario_contacto: document.getElementById('inputHorario').value || 'Cualquier hora',
            colores: colores,
            imagenes: imagenesBase64
        };

        try {
            const response = await fetch('http://localhost:1984/api/publicaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevaPublicacion)
            });

            if (response.ok) {
                window.location.href = 'misPublicaciones.html';
            } else {
                const err = await response.json();
                console.error('Error del servidor:', err);
                alert('Hubo un error al crear la publicación.');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    });
});