// ======================================================
// 0. VALIDAR TOKEN Y OBTENER DATOS DEL USUARIO
// ======================================================
const token = localStorage.getItem('JWT');
let ws = null;
let chatActual = null;
let miID = null;
let pendingChatId = null;
let pendingChatName = null;

if (!token) {
    window.location.href = "login.html";
}

// Decodificar JWT para obtener mi ID
try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    miID = payload.id_Usuario;
} catch {
    localStorage.removeItem('JWT');
    window.location.href = "login.html";
}

// ======================================================
// 1. ELEMENTOS DEL HTML REAL
// ======================================================
const chatsList = document.getElementById('chatsList');
const chatsMessages = document.getElementById('chatsMessages');
const chatsPlaceholder = document.getElementById('chatsPlaceholder');
const convoHeader = document.getElementById('convoHeader');
const chatsInputArea = document.getElementById('chatsInputArea');
const chatInput = document.getElementById('chatInput');
const btnSend = document.getElementById('btnSend');
const btnBack = document.getElementById('btnBack');
const buscarChat = document.getElementById('buscarChat');


// ======================================================
// 2. CONECTAR WEBSOCKET AUTOMÁTICAMENTE
// ======================================================
function conectarUsuarioChat() {
    ws = new WebSocket("ws://localhost:3000");

    ws.addEventListener('open', () => {
        console.log('WebSocket conectado, autenticando...');
        ws.send(JSON.stringify({
            tipo: 'auth',
            token
        }));
    });

    ws.addEventListener('message', manejarMensajesServidor);

    ws.addEventListener('close', (event) => {
        console.log('WebSocket cerrado:', event.code, event.reason);
        if (event.code === 1008) {
            localStorage.removeItem('JWT');
            window.location.href = "login.html";
        }
        chatActual = null;
        
        // Intentar reconectar después de 3 segundos
        setTimeout(() => {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                console.log('Reconectando WebSocket...');
                conectarUsuarioChat();
            }
        }, 3000);
    });

    ws.addEventListener('error', (error) => {
        console.error('Error en WebSocket:', error);
    });
}

conectarUsuarioChat();

// ======================================================
// 3. MANEJAR MENSAJES DEL SERVIDOR
// ======================================================
function manejarMensajesServidor(event) {
    try {
        const data = JSON.parse(event.data);

        switch (data.tipo) {
            case 'auth_ok':
                console.log('Autenticación exitosa');
                cargarListaChats();
                verificarChatSeleccionado();
                break;

            case 'join_ok':
                console.log("Unido al chat:", data.room);
                break;

            case 'historial':
                mostrarHistorial(data.mensajes);
                break;

            case 'nuevo_mensaje':
                if (chatActual === data.id_chat) {
                    mostrarMensaje(data);
                } else {
                    actualizarVistaPreviaChat(data.id_chat, data.contenido);
                }
                break;
        }
    } catch (error) {
        console.error('Error al procesar mensaje del servidor:', error);
    }
}

// ======================================================
// 4. CARGAR LISTA DE CHATS DEL USUARIO
// ======================================================
async function cargarListaChats() {
    try {
        const res = await fetch('http://localhost:1984/api/chats/lista', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (res.status === 401) {
            console.log('Token expirado o inválido, redirigiendo a login...');
            localStorage.removeItem('JWT');
            window.location.href = "login.html";
            return;
        }
        
        if (!res.ok) {
            throw new Error(`Error al cargar chats: ${res.status}`);
        }
        
        const chats = await res.json();
        console.log('Chats cargados:', chats);

        chatsList.innerHTML = "";

        if (!chats || chats.length === 0) {
            const emptyDiv = document.getElementById("chats-empty");
            if (emptyDiv) emptyDiv.style.display = "block";
            return;
        }

        const emptyDiv = document.getElementById("chats-empty");
        if (emptyDiv) emptyDiv.style.display = "none";

        chats.forEach(chat => {
            const li = document.createElement('li');
            li.classList.add('chats-list__item');
            li.setAttribute('data-chat-id', chat.id_chat);

            // Determinar texto de vista previa
            let previewText = chat.ultimo_mensaje || "Sin mensajes aún";
            if (previewText.length > 50) {
                previewText = previewText.substring(0, 47) + '...';
            }

            // Formatear fecha del último mensaje
            let fechaFormateada = '';
            if (chat.fecha_ultimo_mensaje) {
                fechaFormateada = formatFecha(chat.fecha_ultimo_mensaje);
            }

            li.innerHTML = `
                <div class="chats-list__avatar">🐾</div>
                <div class="chats-list__info">
                    <p class="chats-list__name">${escapeHtml(chat.nombre_otro_usuario)}</p>
                    <p class="chats-list__preview">${escapeHtml(previewText)}</p>
                    <span class="chats-list__time">${fechaFormateada}</span>
                </div>
            `;

            li.onclick = () => seleccionarChat(chat.id_chat, chat.nombre_otro_usuario);
            chatsList.appendChild(li);
        });
        
        // Seleccionar chat pendiente si existe y está en la lista
        if (pendingChatId && pendingChatName) {
            const chatExistente = chats.find(c => c.id_chat === pendingChatId);
            if (chatExistente) {
                // Pequeño delay para asegurar que el DOM está listo
                setTimeout(() => {
                    seleccionarChat(pendingChatId, pendingChatName);
                    pendingChatId = null;
                    pendingChatName = null;
                }, 300);
            }
        }
        
        
    } catch (error) {
        console.error('Error al cargar lista de chats:', error);
        chatsList.innerHTML = '<li class="chats-list__error">Error al cargar conversaciones. <button onclick="cargarListaChats()">Reintentar</button></li>';
    }
}

// ======================================================
// 5. CREAR O RECUPERAR CHAT CON ALGUIEN
// ======================================================
async function abrirChatCon(id_otro_usuario, nombreUsuario, id_publicacion) {
    try {
        const res = await fetch('http://localhost:1984/api/chats/crear', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_usuario_2: id_otro_usuario,
                id_publicacion
            })
        });

        if (!res.ok) throw new Error('Error al crear/obtener chat');
        
        const data = await res.json();
        seleccionarChat(data.id_chat, nombreUsuario);
        
    } catch (error) {
        console.error('Error al abrir chat:', error);
        alert('Error al abrir el chat. Por favor intenta de nuevo.');
    }
}

// ======================================================
// 6. SELECCIONAR CHAT
// ======================================================
function seleccionarChat(id_chat, nombreUsuario) {
    chatActual = id_chat;

    // Mostrar elementos de conversación
    chatsPlaceholder.style.display = "none";
    chatsMessages.style.display = "flex";
    chatsInputArea.style.display = "flex";
    convoHeader.style.display = "flex";

    document.getElementById('convoName').textContent = nombreUsuario;
    document.getElementById('convoSub').textContent = 'En línea';
    chatsMessages.innerHTML = "";

    // Remover clase active de todos los chats
    document.querySelectorAll('.chats-list__item').forEach(item => {
        item.classList.remove('chats-list__item--active');
        if (item.getAttribute('data-chat-id') == id_chat) {
            item.classList.add('chats-list__item--active');
            // Remover badge de no leídos
            const badge = item.querySelector('.chats-list__badge');
            if (badge) badge.remove();
        }
    });

    // Verificar que el WebSocket esté conectado
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            tipo: 'join_chat',
            id_chat
        }));
    } else {
        console.warn('WebSocket no está listo, esperando conexión...');
        const esperarWS = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                clearInterval(esperarWS);
                ws.send(JSON.stringify({
                    tipo: 'join_chat',
                    id_chat
                }));
            }
        }, 500);
        
        // Timeout por si nunca se conecta
        setTimeout(() => clearInterval(esperarWS), 10000);
    }
}

// ======================================================
// 7. ENVIAR MENSAJE
// ======================================================
btnSend.addEventListener('click', () => {
    enviarMensaje();
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarMensaje();
    }
});

function enviarMensaje() {
    if (!chatActual) {
        console.warn('No hay chat seleccionado');
        alert('No has seleccionado un chat para mandar este mensaje!');
        return;
    }

    const contenido = chatInput.value.trim();
    if (!contenido) return;
    
    // Validación básica de contenido (opcional)
    if (contenido.length > 2000) {
        alert('El mensaje es demasiado largo (máximo 2000 caracteres)');
        return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            tipo: 'mensaje',
            id_chat: chatActual,
            contenido
        }));
        chatInput.value = "";
        chatInput.style.height = 'auto';
    } else {
        console.error('WebSocket no está conectado');
        alert('Error de conexión. No se pudo enviar el mensaje.');
    }
}

// Auto-resize del textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ======================================================
// 8. MOSTRAR HISTORIAL
// ======================================================
function mostrarHistorial(mensajes) {
    chatsMessages.innerHTML = "";
    
    if (!mensajes || mensajes.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('mensaje-empty');
        emptyDiv.textContent = 'No hay mensajes aún. ¡Envía el primero!';
        chatsMessages.appendChild(emptyDiv);
        return;
    }

    mensajes.forEach(msg => mostrarMensaje(msg));
    scrollToBottom();
}

// ======================================================
// 9. MOSTRAR MENSAJE INDIVIDUAL
// ======================================================
function mostrarMensaje(msg) {
    const div = document.createElement('div');
    div.classList.add('mensaje-item');
    
    const esMio = msg.id_usuario_emisor === miID || msg.id_Remitente === miID;
    div.classList.add(esMio ? 'mensaje-item--own' : 'mensaje-item--other');
    
    const fecha = new Date(msg.fecha_envio);
    const horaFormateada = fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const nombreUsuario = esMio ? 'Tú' : (msg.nombre_usuario || `Usuario ${msg.id_usuario_emisor || msg.id_Remitente}`);
    
    div.innerHTML = `
        <div class="mensaje-item__content">
            <div class="mensaje-item__header">
                <span class="mensaje-item__author">${escapeHtml(nombreUsuario)}</span>
                <span class="mensaje-item__time">${horaFormateada}</span>
            </div>
            <div class="mensaje-item__text">${escapeHtml(msg.contenido)}</div>
        </div>
    `;
    
    chatsMessages.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    setTimeout(() => {
        chatsMessages.scrollTop = chatsMessages.scrollHeight;
    }, 100);
}

// ======================================================
// 11. ACTUALIZAR VISTA PREVIA DEL CHAT
// ======================================================
function actualizarVistaPreviaChat(id_chat, mensaje) {
    const chatItem = document.querySelector(`.chats-list__item[data-chat-id="${id_chat}"]`);
    if (chatItem) {
        const preview = chatItem.querySelector('.chats-list__preview');
        if (preview) {
            let previewText = mensaje;
            if (previewText.length > 50) {
                previewText = previewText.substring(0, 47) + '...';
            }
            preview.textContent = escapeHtml(previewText);
        }
        
        const timeSpan = chatItem.querySelector('.chats-list__time');
        if (timeSpan) {
            timeSpan.textContent = formatFecha(new Date());
        }
        
        // Mover al principio de la lista
        const parent = chatItem.parentNode;
        parent.removeChild(chatItem);
        parent.insertBefore(chatItem, parent.firstChild);
    }
}

// ======================================================
// 13. ACTUALIZAR CONTADOR TOTAL DE NO LEÍDOS — REMOVED
// ======================================================
// ======================================================
// 14. VERIFICAR CHAT SELECCIONADO DESDE REDIRECCIÓN
// ======================================================
function verificarChatSeleccionado() {
    const chatGuardado = localStorage.getItem('chatSeleccionado');
    if (chatGuardado) {
        try {
            const { id_chat, nombre_usuario } = JSON.parse(chatGuardado);
            localStorage.removeItem('chatSeleccionado');
            
            // Esperar a que la lista de chats esté cargada
            const esperarYSeleccionar = setInterval(() => {
                const chatExiste = document.querySelector(`.chats-list__item[data-chat-id="${id_chat}"]`);
                if (chatExiste) {
                    clearInterval(esperarYSeleccionar);
                    seleccionarChat(id_chat, nombre_usuario);
                } else if (document.querySelector('.chats-list__item')) {
                    // La lista está cargada pero el chat no existe (debería crearse)
                    clearInterval(esperarYSeleccionar);
                    // Buscar el chat en la lista o crearlo
                    setTimeout(() => {
                        if (!document.querySelector(`.chats-list__item[data-chat-id="${id_chat}"]`)) {
                            // Recargar la lista para que aparezca el nuevo chat
                            cargarListaChats().then(() => {
                                setTimeout(() => {
                                    seleccionarChat(id_chat, nombre_usuario);
                                }, 500);
                            });
                        } else {
                            seleccionarChat(id_chat, nombre_usuario);
                        }
                    }, 500);
                }
            }, 100);
            
            setTimeout(() => clearInterval(esperarYSeleccionar), 10000);
        } catch (error) {
            console.error('Error al procesar chat pendiente:', error);
        }
    }
}

// ======================================================
// 15. BÚSQUEDA DE CHATS
// ======================================================
if (buscarChat) {
    buscarChat.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.chats-list__item');
        
        items.forEach(item => {
            const nombre = item.querySelector('.chats-list__name')?.textContent.toLowerCase() || '';
            const preview = item.querySelector('.chats-list__preview')?.textContent.toLowerCase() || '';
            
            if (nombre.includes(termino) || preview.includes(termino)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// ======================================================
// 16. BOTÓN VOLVER (MÓVIL)
// ======================================================
if (btnBack) {
    btnBack.addEventListener('click', () => {
        // En móvil, volver a la lista de chats
        if (window.innerWidth <= 768) {
            document.querySelector('.chats-sidebar').classList.add('chats-sidebar--visible');
            document.querySelector('.chats-conversation').classList.remove('chats-conversation--active');
        } else {
            // En desktop, deseleccionar chat
            chatActual = null;
            chatsPlaceholder.style.display = "flex";
            chatsMessages.style.display = "none";
            chatsInputArea.style.display = "none";
            convoHeader.style.display = "none";
            
            document.querySelectorAll('.chats-list__item').forEach(item => {
                item.classList.remove('chats-list__item--active');
            });
        }
    });
}

// ======================================================
// 17. FUNCIONES UTILITARIAS
// ======================================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatFecha(fecha) {
    if (!fecha) return '';
    
    const date = new Date(fecha);
    const ahora = new Date();
    const diffDias = Math.floor((ahora - date) / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) {
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDias === 1) {
        return 'Ayer';
    } else if (diffDias < 7) {
        return date.toLocaleDateString('es-MX', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }
}

// ======================================================
// 18. RESPONSIVE: Mostrar/ocultar sidebar en móvil
// ======================================================
function handleResponsive() {
    const sidebar = document.querySelector('.chats-sidebar');
    const conversation = document.querySelector('.chats-conversation');
    
    if (window.innerWidth <= 768) {
        if (chatActual) {
            sidebar?.classList.remove('chats-sidebar--visible');
            conversation?.classList.add('chats-conversation--active');
        } else {
            sidebar?.classList.add('chats-sidebar--visible');
            conversation?.classList.remove('chats-conversation--active');
        }
    } else {
        sidebar?.classList.remove('chats-sidebar--visible');
        conversation?.classList.remove('chats-conversation--active');
    }
}

window.addEventListener('resize', handleResponsive);
handleResponsive();

// ======================================================
// 19. RECUPERAR CONVERSACIÓN AL RECARGAR
// ======================================================
function recuperarUltimoChat() {
    const ultimoChat = localStorage.getItem('ultimoChat');
    if (ultimoChat && !pendingChatId) {
        try {
            const { id_chat, nombre_usuario } = JSON.parse(ultimoChat);
            // No seleccionar automáticamente, solo guardar para posible recuperación
            window.ultimoChatData = { id_chat, nombre_usuario };
        } catch (e) {
            console.error('Error al recuperar último chat:', e);
        }
    }
}

// Guardar el chat actual antes de cerrar/recargar
window.addEventListener('beforeunload', () => {
    if (chatActual) {
        const nombreElement = document.getElementById('convoName');
        const nombre = nombreElement ? nombreElement.textContent : '';
        localStorage.setItem('ultimoChat', JSON.stringify({
            id_chat: chatActual,
            nombre_usuario: nombre
        }));
    }
});

recuperarUltimoChat();

console.log('Chat.js cargado correctamente');