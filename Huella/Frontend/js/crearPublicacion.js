document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formCrearPub');

    const ID_USUARIO_ACTUAL = 1; //Hardcodeado

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        //Convertir a Base64
        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        //Imagenes
        const inputFotos = document.getElementById('photos');
        const imagenesBase64 = [];

        for (let file of inputFotos.files) {
            const base64 = await fileToBase64(file);
            imagenesBase64.push(base64);
        }

        //Colores
        const checkboxesColores = document.querySelectorAll('input[name="colores"]:checked');
        const colores = Array.from(checkboxesColores).map(cb => parseInt(cb.value));

        if (colores.length === 0) {
            alert("Por favor selecciona al menos un color.");
            return;
        }
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