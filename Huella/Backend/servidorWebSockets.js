import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

const ws = new WebSocketServer({ port: 3000 });
const rooms = new Map();

ws.on('connection', (socket) => {
    socket.isAuth = false;
    socket.currentRoom = null;

    socket.on('message', async (data) => {

        // ---------------------------
        // 1. AUTENTICACIÓN
        // ---------------------------
        if (!socket.isAuth){
            try {
                const { tipo, token } = JSON.parse(data);

                if (tipo !== 'auth'){
                    socket.close(1008, 'No has autorizado el usuario');
                    return;
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const { id_Usuario, email } = decoded;

                socket.id_Usuario = id_Usuario;
                socket.email = email;

                socket.isAuth = true;
                socket.send(JSON.stringify({ tipo: "auth_ok" }));
                return;

            } catch (e) {
                socket.close(1008, 'No autorizado para este chat');
                return;
            }
        }

        if (!socket.isAuth) return;

        // ---------------------------
        // 2. PARSEAR MENSAJE
        // ---------------------------
        let datos;
        try {
            datos = JSON.parse(data);
        } catch {
            socket.close(1000, 'Formato de mensaje inválido');
            return;
        }

        const { tipo } = datos;

        // ---------------------------
        // 3. JOIN CHAT
        // ---------------------------
        if (tipo === 'join_chat') {
            const { id_chat } = datos;

            if (!Number.isInteger(id_chat)) {
                socket.close(1000, 'ID de chat invalido');
                return;
            }

            const pertenece = await isUserChat(id_chat, socket.id_Usuario);

            if (!pertenece){
                socket.close(1000, 'No perteneces a este chat');
                return;
            }

            const roomName = 'chat_' + id_chat;

            // salir de sala anterior
            if (socket.currentRoom) {
                const oldRoom = rooms.get(socket.currentRoom);
                if (oldRoom) {
                    rooms.set(socket.currentRoom, oldRoom.filter(s => s !== socket));
                }
            }

            // crear sala si no existe
            if (!rooms.has(roomName)) {
                rooms.set(roomName, []);
            }

            const room = rooms.get(roomName);

            // evitar duplicados
            if (!room.includes(socket)) {
                room.push(socket);
            }

            socket.currentRoom = roomName;

            // confirmar unión
            socket.send(JSON.stringify({ tipo: 'join_ok', room: roomName }));

            // enviar historial
            const historial = await obtenerHistorial(id_chat);

            socket.send(JSON.stringify({
                tipo: 'historial',
                mensajes: historial
            }));

            return;
        }

        // ---------------------------
        // 4. ENVIAR MENSAJE
        // ---------------------------
        if (tipo === 'mensaje') {
            const { id_chat, contenido } = datos;

            if (!socket.currentRoom) {
                socket.close(1000, 'No estás en ningún chat');
                return;
            }

            const roomNameEsperado = 'chat_' + id_chat;
            if (socket.currentRoom !== roomNameEsperado) {
                socket.close(1000, 'No puedes enviar mensajes a este chat');
                return;
            }

            const pertenece = await isUserChat(id_chat, socket.id_Usuario);
            if (!pertenece) {
                socket.close(1000, 'No perteneces a este chat');
                return;
            }

            // guardar en BD
            const id_mensaje = await guardarMensaje({
                id_chat,
                id_usuario_emisor: socket.id_Usuario,
                contenido
            });

            const payload = {
                tipo: 'nuevo_mensaje',
                id_mensaje,
                id_chat,
                id_usuario_emisor: socket.id_Usuario,
                contenido,
                fecha_envio: new Date().toISOString()
            };

            // reenviar a todos en la sala
            const room = rooms.get(socket.currentRoom) || [];
            for (const s of room) {
                s.send(JSON.stringify(payload));
            }

            return;
        }
    });

    // ---------------------------
    // 5. DESCONEXIÓN
    // ---------------------------
    socket.on('close', () => {
        if (socket.currentRoom) {
            const room = rooms.get(socket.currentRoom);
            if (room) {
                rooms.set(socket.currentRoom, room.filter(s => s !== socket));
            }
        }
    });
});

// ---------------------------
// HELPERS
// ---------------------------
async function isUserChat(chatID, userID){
    const sql = 'SELECT * FROM chat_usuario WHERE id_Chat = ? AND id_Usuario = ?';
    const [rows] = await db.query(sql, [chatID, userID]);
    return rows.length > 0;
}

async function obtenerHistorial(id_chat) {
    const sql = `
        SELECT id_Mensaje, id_Chat, id_Remitente, texto_mensaje, fecha_envio
        FROM mensaje
        WHERE id_Chat = ?
        ORDER BY fecha_envio ASC
    `;
    const [rows] = await db.query(sql, [id_chat]);
    return rows;
}

async function guardarMensaje({ id_chat, id_usuario_emisor, contenido }) {
    const sql = `
        INSERT INTO mensaje (id_Chat, id_Remitente, texto_mensaje, fecha_envio)
        VALUES (?, ?, ?, NOW())
    `;
    const [result] = await db.query(sql, [id_chat, id_usuario_emisor, contenido]);
    return result.insertId;
}
