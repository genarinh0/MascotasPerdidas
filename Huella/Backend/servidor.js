import express from 'express';
import db from './db.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
import verifyToken from './authMiddleware.js';
import { Resend } from 'resend';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const resend = new Resend(process.env.RESEND_API_KEY); //Añadir el la API key al .env
const EMAIL = process.env.EMAIL; //Añadir el correo con el registraste la API en el .env
const HUELLA_URL = process.env.HUELLA_URL; //Temporal, porque mi URL es diferente.

app.post('/api/registro', async (req, res) => {
  const { email, contrasena, telefono } = req.body;

  if (!email || !contrasena) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const saltRounds = 12;
    const hashedPwd = await bcrypt.hash(contrasena, saltRounds);

    const [result] = await db.query(
      'INSERT INTO usuario(email, contrasena, telefono) VALUES (?, ?, ?)',
      [email, hashedPwd, telefono ?? null]
    );

    const payload = { id_Usuario: result.insertId, email };
    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h'});

    res.status(201).json({ message: 'Usuario creado con exito', token });

  } catch (error) {
    if (error.errno === 1062) {
      return res.status(409).json({ error: 'El correo electrónico ya esta registrado' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

app.post('/api/login', async (req, res) => {
    const { email, contrasena } = req.body;

    try {
        const [rows] = await db.query('SELECT id_Usuario, contrasena FROM usuario WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const usuario = rows[0];
        const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const payload = { id_Usuario: usuario.id_Usuario, email };
        const secretKey = process.env.JWT_SECRET;
        const token = jwt.sign(payload, secretKey, { expiresIn: '1h'});

        res.status(200).json({ message: 'Usuario autenticado correctamente', token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al autenticar el usuario' })
    }
});

app.get('/api/publicaciones', async (req, res) => {
    const filtros = req.query;
    const valores = [];
    const condiciones = [];

    const lat = parseFloat(filtros.latitud);
    const lng = parseFloat(filtros.longitud);
    const radio = parseFloat(filtros.radio);

    const usarDistancia = !isNaN(lat) && !isNaN(lng) && !isNaN(radio);

    let sqlSelect = `SELECT p.*,
        (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64`;

    if (usarDistancia) {
        sqlSelect += `, ( 6371 * acos(
            cos(radians(?)) * cos(radians(p.latitud)) *
            cos(radians(p.longitud) - radians(?)) +
            sin(radians(?)) * sin(radians(p.latitud))
        )) AS distancia`;
        valores.push(lat, lng, lat);
    }

    let sqlFrom = ` FROM publicacion p`;

    Object.entries(filtros).forEach(([clave, valor]) => {
        if (['latitud', 'longitud', 'radio', 'lat', 'lng', '_'].includes(clave)) return;
        if (valor === undefined || valor === null || valor === '' || valor === 'null' || valor === 'undefined') return;

        if (clave === 'colores') {
            const listaColores = valor.split(',');
            const placeholders = listaColores.map(() => '?').join(',');
            condiciones.push(`p.id_Publicacion IN (
                SELECT id_Publicacion FROM colorMascota WHERE id_Color IN (${placeholders})
            )`);
            listaColores.forEach(c => valores.push(c));
        }else if (clave === 'fechaInicio') {
            condiciones.push("p.fecha_suceso >= ?");
            valores.push(valor);
        }else if (clave === 'fechaFin') {
            condiciones.push("p.fecha_suceso <= ?");
            valores.push(valor);
        }else {
            const columnasValidas = ['tipo', 'especie', 'raza', 'tamanio', 'estatus'];
            if (columnasValidas.includes(clave)) {
                condiciones.push(`p.${clave} = ?`);
                valores.push(valor);
            }
        }
    });

    if (!filtros.estatus) {
        condiciones.push("p.estatus = 1");
    }

    const sqlWhere = condiciones.length > 0 ? ' WHERE ' + condiciones.join(' AND ') : '';

    let sqlFinal = sqlSelect + sqlFrom + sqlWhere;

    if (usarDistancia) {
        sqlFinal += ` HAVING distancia <= ? ORDER BY distancia ASC`;
        valores.push(radio);
    } else {
        sqlFinal += ` ORDER BY p.fecha_creacion DESC`;
    }

    try {
        const [rows] = await db.query(sqlFinal, valores);
        res.status(200).json({
            message: 'Publicaciones recabadas con éxito',
            publicaciones: rows
        });
    } catch (error) {
        console.error("ERROR CRÍTICO EN API FEED:", error);
        res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
});

app.post('/api/publicaciones', verifyToken, async (req, res) => {
    const nuevaPub = req.body;
    const fecha_creacion = new Date().toISOString().split('T')[0];
    const estatus = 1;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const { id_Usuario } = req.user;

        const sqlPub = `INSERT INTO publicacion (id_Usuario, tipo, especie, raza, tamanio, descripcion, fecha_suceso, fecha_creacion, estatus, latitud, longitud, horario_contacto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const parametrosPub = [id_Usuario, nuevaPub.tipo, nuevaPub.especie, nuevaPub.raza, nuevaPub.tamanio, nuevaPub.descripcion, nuevaPub.fecha_suceso, fecha_creacion, estatus, nuevaPub.latitud, nuevaPub.longitud, nuevaPub.horario_contacto];
        const [resultPub] = await conn.query(sqlPub, parametrosPub);
        const id_Publicacion = resultPub.insertId;

        if (nuevaPub.colores && nuevaPub.colores.length > 0) {
            const sqlColor = 'INSERT INTO colormascota (id_Publicacion, id_Color) VALUES (?, ?)';
            for (let id_Color of nuevaPub.colores) {
                await conn.query(sqlColor, [id_Publicacion, id_Color]);
            }
        }

        if (nuevaPub.imagenes && nuevaPub.imagenes.length > 0) {
            const sqlFoto = 'INSERT INTO fotografia (id_Publicacion, fotografia) VALUES (?, FROM_BASE64(?))';
            for (let base64Image of nuevaPub.imagenes) {
                const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
                await conn.query(sqlFoto, [id_Publicacion, cleanBase64]);
            }
        }

        await conn.commit();
        res.status(201).json({ message: 'Publicación, colores e imágenes creados con éxito', id: id_Publicacion });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al crear la publicación' });
    } finally {
        conn.release();
    }
});

app.delete('/api/publicaciones/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { id_Usuario } = req.user;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT * FROM publicacion WHERE id_Publicacion = ? AND id_Usuario = ?',
            [id, id_Usuario]
        );

        if (rows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(403).json({ error: 'No tiene autorizacion para borrar la publicacion' });
        }

        await conn.query('DELETE FROM colormascota WHERE id_Publicacion = ?', [id]);
        await conn.query('DELETE FROM fotografia WHERE id_Publicacion = ?', [id]);
        await conn.query('DELETE FROM guardados WHERE id_Publicacion = ?', [id]);
        await conn.query('DELETE FROM reporte WHERE id_Publicacion = ?', [id]);

        const [result] = await conn.query('DELETE FROM publicacion WHERE id_Publicacion = ?', [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        await conn.commit();
        res.status(200).json({ message: 'Publicación borrada con exito' });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al borrar la publicacion' });
    } finally {
        conn.release();
    }
});

app.get('/api/guardados', verifyToken, async (req, res) => {
    const sql = `
        SELECT p.*,
        (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
        FROM publicacion AS p
        INNER JOIN guardados AS g ON p.id_Publicacion = g.id_Publicacion
        WHERE g.id_Usuario = ?
    `;

    const { id_Usuario } = req.user;

    try {
        const [result] = await db.query(sql, [id_Usuario]);
        res.status(200).json({ message: 'Guardados recabados con exito', publicaciones: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recabar publicaciones guardadas' });
    }
});

app.post('/api/guardados/:id', verifyToken, async (req, res) => {
    const id_Publicacion = req.params.id;
    const { id_Usuario } = req.user;

    try {
        const [result] = await db.query(
            'INSERT INTO guardados (id_Publicacion, id_Usuario) VALUES (?, ?)',
            [id_Publicacion, id_Usuario]
        );
        res.status(200).json({ message: 'Publicacion guardada con exito' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar la publicacion' });
    }
});

app.delete('/api/guardados/:id', verifyToken, async (req, res) => {
    const id_Publicacion = req.params.id;
    const { id_Usuario } = req.user;

    try {
        const [result] = await db.query(
            'DELETE FROM guardados WHERE id_Publicacion = ? AND id_Usuario = ?',
            [id_Publicacion, id_Usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Publicacion no encontrada en guardados' });
        }

        res.status(200).json({ message: 'Publicacion borrada de guardados' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al quitar publicacion de guardados' });
    }
});

app.get('/api/mis-publicaciones', verifyToken, async (req, res) => {
    const { id_Usuario } = req.user;
    let sql = `
        SELECT p.*,
        (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
        FROM publicacion p
        WHERE p.id_Usuario = ?
    `;

    try {
        const [rows] = await db.query(sql, [id_Usuario]);
        res.status(200).json({ message: 'Publicaciones recabadas con exito', publicaciones: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener tus publicaciones' });
    }
});

app.put('/api/publicaciones/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { id_Usuario } = req.user;
    const pub = req.body;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            'SELECT * FROM publicacion WHERE id_Publicacion = ? AND id_Usuario = ?',
            [id, id_Usuario]
        );

        if (rows.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(403).json({ error: 'No tienes autorización para editar esta publicación' });
        }

        await conn.query(
            `UPDATE publicacion SET tipo=?, especie=?, raza=?, tamanio=?, descripcion=?, fecha_suceso=?, latitud=?, longitud=?, horario_contacto=? WHERE id_Publicacion=?`,
            [pub.tipo, pub.especie, pub.raza, pub.tamanio, pub.descripcion, pub.fecha_suceso, pub.latitud, pub.longitud, pub.horario_contacto, id]
        );

        await conn.query('DELETE FROM colormascota WHERE id_Publicacion = ?', [id]);
        if (pub.colores && pub.colores.length > 0) {
            for (let id_Color of pub.colores) {
                await conn.query('INSERT INTO colormascota (id_Publicacion, id_Color) VALUES (?, ?)', [id, id_Color]);
            }
        }

        if (pub.imagenes && pub.imagenes.length > 0) {
            await conn.query('DELETE FROM fotografia WHERE id_Publicacion = ?', [id]);
            const sqlFoto = 'INSERT INTO fotografia (id_Publicacion, fotografia) VALUES (?, FROM_BASE64(?))';
            for (let base64Image of pub.imagenes) {
                const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
                await conn.query(sqlFoto, [id, cleanBase64]);
            }
        }

        await conn.commit();
        res.status(200).json({ message: 'Publicación actualizada con éxito' });

    } catch (error) {
        try{
            await conn.rollback();
        } catch (rollbackError){
            console.error('Error en el rollback: ', rollbackError);
        }
        console.error(error);
        res.status(500).json({error: 'Error al actualizar publicacion'});
    } finally {
        try{
            conn.release();
        } catch (releaseError){
            console.error('Error al liberar conexión:', releaseError);
        }
    }
});

app.get('/api/publicaciones/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { id_Usuario } = req.user;

    try {
        const [rows] = await db.query(
            `SELECT p.*, 
            (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
            FROM publicacion p WHERE p.id_Publicacion = ? AND p.id_Usuario = ?`,
            [id, id_Usuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const [colores] = await db.query(
            'SELECT id_Color FROM colormascota WHERE id_Publicacion = ?',
            [id]
        );

        res.status(200).json({
            publicacion: rows[0],
            colores: colores.map(c => c.id_Color)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la publicación' });
    }
});

//ENDPOINT PARA RESOLVER EL CONFLICTO DE LAS FOTOS

app.get('/api/publicaciones/:id/fotos', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const [fotos] = await db.query(
            'SELECT id_Fotografia, TO_BASE64(fotografia) as imagenBase64 FROM fotografia WHERE id_Publicacion = ?',
            [id]
        );

        res.status(200).json({ fotos });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las fotos' });
    }
});

app.listen(1984, () => {
    console.log("Servidor Corriendo en puerto 1984");
});

//ENDPOINTS AÑADIDOS PARA MI PERFIL

app.get('/api/perfil', verifyToken, async (req, res) => {
    const { id_Usuario } = req.user;

    try {
        const [rows] = await db.query(
            'SELECT email, telefono FROM usuario WHERE id_Usuario = ?',
            [id_Usuario]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.status(200).json({ usuario: rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el perfil' });
    }
});

app.patch('/api/perfil/telefono', verifyToken, async (req, res) => {
    const { id_Usuario } = req.user;
    const { telefono } = req.body;

    if (!telefono) {
        return res.status(400).json({ error: 'Teléfono es obligatorio' });
    }

    try {
        await db.query(
            'UPDATE usuario SET telefono = ? WHERE id_Usuario = ?',
            [telefono, id_Usuario]
        );

        res.status(200).json({ message: 'Teléfono actualizado con éxito' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el teléfono' });
    }
});


//ENDPOINT PARA VISTA COMPLETA DE PUBLICACIONES

app.get('/api/publicacion/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query(
            `SELECT p.*, u.email as email_usuario,
            (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
            FROM publicacion p 
            JOIN usuario u ON p.id_Usuario = u.id_Usuario
            WHERE p.id_Publicacion = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const [colores] = await db.query(
            'SELECT id_Color FROM colormascota WHERE id_Publicacion = ?',
            [id]
        );

        const [fotos] = await db.query(
            'SELECT id_Fotografia, TO_BASE64(fotografia) as imagenBase64 FROM fotografia WHERE id_Publicacion = ?',
            [id]
        );

        res.status(200).json({
            publicacion: rows[0],
            colores: colores.map(c => c.id_Color),
            fotos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la publicación' });
    }
});

app.post('/api/publicaciones/:id/contactar', verifyToken, async (req, res) => {
    const { id } = req.params; //ID de la publicación a contactar
    const { mensaje } = req.body; //Mensaje escrito por el usuario interesado

    if (!mensaje) {
        return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    try {
        //Obtener el correo del dueño de la publicación
        const [rows] = await db.query(
            `SELECT u.email, p.especie, p.tipo
             FROM usuario u
             JOIN publicacion p ON u.id_Usuario = p.id_Usuario
             WHERE p.id_Publicacion = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const dueno = rows[0];
        const correoDestino = dueno.email;
        const tipoAlerta = dueno.tipo === 1 ? 'perdida' : 'encontrada';

        // 2. Usar Resend para despachar el correo
        const { data, error } = await resend.emails.send({
            from: 'Huella Notificaciones <onboarding@resend.dev>', //Correo por defecto de prueba de Resend
            to: [EMAIL], //Correo por defecto en el .env porque no tenemos dominio
            subject: `¡Alguien tiene información sobre tu mascota ${tipoAlerta}!`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Hola,</h2>
                    <p>Un miembro de la comunidad quiere contactarte respecto a tu publicación de un(a) <b>${dueno.especie}</b>.</p>
                    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Mensaje:</strong></p>
                        <p style="margin-top: 5px; font-style: italic;">"${mensaje}"</p>
                    </div>
                    <p>¡Inicia sesión en la plataforma para responder!</p>
                </div>
            `
        });

        if (error) {
            console.error('Error al enviar el correo con Resend:', error);
            return res.status(500).json({ error: 'No se pudo enviar la notificación' });
        }

        console.log('ID del correo enviado:', data.id);
        res.status(200).json({ message: 'Correo enviado con éxito' });

    } catch (error) {
        console.error('Error en el servidor al contactar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/recuperar-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    try {
        const [rows] = await db.query('SELECT id_Usuario FROM usuario WHERE email = ?', [email]);

        // Always respond OK to avoid exposing which emails are registered
        if (rows.length === 0) return res.status(200).json({ message: 'OK' });

        const usuario = rows[0];
        const resetToken = jwt.sign(
            { id_Usuario: usuario.id_Usuario, email, tipo: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const resetLink = `${HUELLA_URL}resetPwd.html?token=${resetToken}`;

        await resend.emails.send({
            from: 'Huella Notificaciones <onboarding@resend.dev>',
            to: [EMAIL], //Temporal, para que sirva con el registrado
            subject: 'Restablecer tu contraseña | Huella 🐾',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2>Recuperar contraseña</h2>
                    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                    <p>Haz clic en el siguiente botón. El enlace expira en <strong>15 minutos</strong>.</p>
                    <a href="${resetLink}" style="display:inline-block; padding: 12px 24px; background-color: #346739; color: white; border-radius: 5px; text-decoration: none; font-weight: bold;">
                        Restablecer contraseña
                    </a>
                    <p style="margin-top: 20px; font-size: 12px; color: gray;">Si no solicitaste esto, ignora este correo.</p>
                </div>
            `
        });

        res.status(200).json({ message: 'OK' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, nuevaContrasena } = req.body;
    if (!token || !nuevaContrasena) return res.status(400).json({ error: 'Datos incompletos' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.tipo !== 'reset') return res.status(400).json({ error: 'Token inválido' });

        const hashedPwd = await bcrypt.hash(nuevaContrasena, 12);
        await db.query('UPDATE usuario SET contrasena = ? WHERE id_Usuario = ?', [hashedPwd, payload.id_Usuario]);

        res.status(200).json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
});
