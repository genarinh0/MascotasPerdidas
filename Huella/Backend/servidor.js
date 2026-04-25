import express from 'express';
import db from './db.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
import verifyToken from './authMiddleware.js';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    let sql = `
        SELECT p.*,
        (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
        FROM publicacion p
    `;
    const filtros = req.query;
    const condiciones = [];
    const valores = [];

    Object.entries(filtros).forEach(([clave, valor]) => {
        condiciones.push(`p.${clave} = ?`);
        valores.push(valor);
    });

    if (condiciones.length > 0) {
        sql += ' WHERE ' + condiciones.join(' AND ');
    }
    
    try {
        const [rows] = await db.query(sql, valores);
        res.status(200).json({ message: 'Publicaciones recabadas con exito', publicaciones: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las publicaciones' })
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

        const sqlPub = `INSERT INTO publicacion (id_Usuario, tipo, especie, raza, tamanio, descripcion, fecha_suceso, fecha_creacion, estatus, ubicacion, horario_contacto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const parametrosPub = [id_Usuario, nuevaPub.tipo, nuevaPub.especie, nuevaPub.raza, nuevaPub.tamanio, nuevaPub.descripcion, nuevaPub.fecha_suceso, fecha_creacion, estatus, nuevaPub.ubicacion, nuevaPub.horario_contacto];
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
            `UPDATE publicacion SET tipo=?, especie=?, raza=?, tamanio=?, descripcion=?, fecha_suceso=?, ubicacion=?, horario_contacto=? WHERE id_Publicacion=?`,
            [pub.tipo, pub.especie, pub.raza, pub.tamanio, pub.descripcion, pub.fecha_suceso, pub.ubicacion, pub.horario_contacto, id]
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