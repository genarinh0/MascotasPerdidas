const token = localStorage.getItem('JWT');
let ws = null;
let chatActual = null;

if (!token) {
    window.location.href = "login.html";
}

// Elementos inventados (luego los conectas al HTML)
const btnConectar = document.getElementById('btnConectar');
const btnUnirseChat = document.getElementById('btnUnirseChat');
const btnEnviar = document.getElementById('btnEnviar');
const inputChatID = document.getElementById('inputChatID');
const inputMensaje = document.getElementById('inputMensaje');
const contenedorMensajes = document.getElementById('contenedorMensajes');

function conectarUsuarioChat() {

    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("Ya estás conectado");
        return;
    }

    ws = new WebSocket("ws://localhost:3000");

    ws.addEventListener('open', () => {
        ws.send(JSON.stringify({
            tipo: 'auth',
            token
        }));
    });

    ws.addEventListener('message', manejarMensajesServidor);

    ws.addEventListener('close', (event) => {
        console.log("Desconectado del servidor:", event.code);

        if (event.code === 1008) {
            // token inválido
            localStorage.removeItem('JWT');
            window.location.href = "login.html";
        }

        chatActual = null; // limpiar chat actual
    });

    ws.addEventListener('error', () => {
        console.log("Error en WebSocket");
    });
}

function manejarMensajesServidor(event) {
    const data = JSON.parse(event.data);

    switch (data.tipo) {

        case 'auth_ok':
            console.log("Autenticado correctamente");
            break;

        case 'join_ok':
            console.log("Unido a la sala:", data.room);
            break;

        case 'historial':
            mostrarHistorial(data.mensajes);
            break;

        case 'nuevo_mensaje':
            mostrarMensaje(data);
            break;

        default:
            console.log("Mensaje desconocido:", data);
    }
}

function unirseAlChat() {

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return alert("Primero conéctate al servidor");
    }

    const id_chat = Number(inputChatID.value);

    if (!id_chat) return alert("Ingresa un ID de chat válido");

    chatActual = id_chat;

    contenedorMensajes.innerHTML = ""; // limpiar mensajes anteriores

    ws.send(JSON.stringify({
        tipo: 'join_chat',
        id_chat
    }));
}

function enviarMensaje() {

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return alert("No estás conectado al servidor");
    }

    if (!chatActual) return alert("Primero únete a un chat");

    const contenido = inputMensaje.value.trim();
    if (!contenido) return;

    ws.send(JSON.stringify({
        tipo: 'mensaje',
        id_chat: chatActual,
        contenido
    }));

    inputMensaje.value = "";
}

function mostrarHistorial(mensajes) {
    contenedorMensajes.innerHTML = ""; 

    mensajes.forEach(msg => {
        mostrarMensaje(msg);
    });
}

function mostrarMensaje(msg) {
    const div = document.createElement('div');

    div.textContent = `[${msg.fecha_envio}] Usuario ${msg.id_usuario_emisor || msg.id_Remitente}: ${msg.contenido}`;

    contenedorMensajes.appendChild(div);
}

btnConectar.addEventListener('click', conectarUsuarioChat);
btnUnirseChat.addEventListener('click', unirseAlChat);
btnEnviar.addEventListener('click', enviarMensaje);