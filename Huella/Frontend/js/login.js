function redirect(page){
    window.location.href = page;
}

function validLogin(email, pwd){
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

    return true;
}

function saveData(token){
    localStorage.setItem('JWT', token);
}

async function tryLogin(e){
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!validLogin(email, password)){
        return;
    }

    console.log("Login intentado!");
    try {
        const response = await fetch('http://localhost:1984/api/login', {
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
            const data = await response.json();
            const { message, token } = data;

            console.log(message);

            saveData(token);
            
            redirect("feed.html");
        }else {
            console.error('Error en la respuesta: ', response.status);
            if (response.status === 401){
                alert("Email o Contraseña Incorrectos!");
            }else{
                alert("Error en el servidor: " + response.status);
            }
        }
    }catch (error){
        console.error('Error de red: ', error);
        alert("No se pudo conectar con el servidor");
    }
}

window.onload = function () {
    const btnSignup = document.getElementById("btnSignup");
    btnSignup.addEventListener('click', () => redirect("signup.html"));

    const btnLogin = document.getElementById("btnLogin");
    btnLogin.addEventListener('click', tryLogin);

    google.accounts.id.initialize({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin
    });

    google.accounts.id.renderButton(
        document.getElementById("google-button"),
        {
            theme: "outline",
            size: "large",
            width: "250",
            text: "continue_with",
            locale: "es"
        }
    );
};

function handleGoogleLogin(response) {
    const idToken = response.credential;
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    console.log("Usuario De Google: ", payload);
    console.log("Email: ", payload.email);
    console.log("Nombre: ", payload.name);

    redirect("feed.html");
}