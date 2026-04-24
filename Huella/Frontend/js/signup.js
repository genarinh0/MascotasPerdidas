function redirect(page){
    window.location.href = page;
}

function validSignUp(email, pwd, confirmPwd){
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexPwd = /^.{8,}$/;

    const isValidEmail = regexEmail.test(email);
    const isValidPwd = regexPwd.test(pwd);

    if (!isValidEmail){
        alert("Email invalido");
        return false;
    }
    if (!isValidPwd){
        alert("Contraseña debe contener al menos 8 caracteres");
        return false;
    }

    if (pwd !== confirmPwd){
        alert("Contraseñas No Coinciden");
        return false;
    }

    return true;
}

async function trySignup(e){
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm_password = document.getElementById("confirm_password").value;

    if (!validSignUp(email, password, confirm_password)){
        return;
    }

    console.log("Signup intentado!");
    try {
        const response = await fetch('http://localhost:1984/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                contrasena: password
            })
        });

        if (response.ok){
            redirect("feed.html");
        }else {
            console.error('Error en la respuesta: ', response.status);
            alert("Error en el servidor: " + response.status);
        }
    }catch (error){
        console.error('Error de red: ', error);
        alert("No se pudo conectar con el servidor");
    }
}

window.onload = function () {
    document.getElementById("btnLoginNav").onclick = () => redirect("login.html");

    const btnSignup = document.getElementById("btnSignup");
    btnSignup.addEventListener('click', trySignup);

    const btnGuestFeed = document.getElementById("btnGuestFeed");
    btnGuestFeed.addEventListener('click', () => redirect ("feed.html"))
}