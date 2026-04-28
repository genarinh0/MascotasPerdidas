document.addEventListener('DOMContentLoaded', () => {
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
        alert('Enlace inválido.');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('btnReset').addEventListener('click', async () => {
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;

        if (password.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (password !== confirm) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        try {
            const res = await fetch('http://localhost:1984/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nuevaContrasena: password })
            });

            if (res.ok) {
                alert('¡Contraseña actualizada! Ya puedes iniciar sesión.');
                window.location.href = 'login.html';
            } else {
                alert('El enlace expiró o es inválido. Solicita uno nuevo.');
                window.location.href = 'recuperarPwd.html';
            }
        } catch (error) {
            console.error('Error de red:', error);
            alert('No se pudo conectar con el servidor.');
        }
    });
});
