document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRecuperar').addEventListener('click', async () => {
        const email = document.getElementById('email').value.trim();

        if (!email) {
            alert('Por favor ingresa tu correo.');
            return;
        }

        try {
            const res = await fetch('http://localhost:1984/api/recuperar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                alert('Si el correo está registrado, recibirás las instrucciones en breve.');
                window.location.href = 'login.html';
            } else {
                alert('Hubo un error. Intenta de nuevo.');
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('No se pudo conectar con el servidor.');
        }
    });
});