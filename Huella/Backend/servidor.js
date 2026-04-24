import express from 'express';
import db from './db.js';
import cors from 'cors';
import bcrypt from 'bcrypt';

const app = express();

app.use(cors());

//Límites ampliados para permitir las imágenes en Base64
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

    res.status(201).json({ 
      message: 'Usuario creado con exito', 
      id: result.insertId 
    });

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


        res.status(200).json({
            message: 'Usuario autenticado correctamente',
            id: usuario.id_Usuario
        });

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
    console.log(sql);
    try {
        const [rows] = await db.query(sql, valores);

        res.status(200).json({
            message: 'Publicaciones recabadas con exito',
            publicaciones: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las publicaciones' })
    }
});

app.post('/api/publicaciones', async (req, res) => {
    const nuevaPub = req.body;
    const fecha_creacion = new Date().toISOString().split('T')[0];
    const estatus = 1;

    try {
        await db.beginTransaction();

        const sqlPub = `INSERT INTO publicacion (id_Usuario, tipo, especie, raza, tamanio, descripcion, fecha_suceso, fecha_creacion, estatus, ubicacion, horario_contacto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const parametrosPub = [nuevaPub.id_Usuario, nuevaPub.tipo, nuevaPub.especie, nuevaPub.raza, nuevaPub.tamanio, nuevaPub.descripcion, nuevaPub.fecha_suceso, fecha_creacion, estatus, nuevaPub.ubicacion, nuevaPub.horario_contacto];
        const [resultPub] = await db.query(sqlPub, parametrosPub);
        const id_Publicacion = resultPub.insertId;

        //Vincular Colores a colormascota
        if (nuevaPub.colores && nuevaPub.colores.length > 0) {
            const sqlColor = 'INSERT INTO colormascota (id_Publicacion, id_Color) VALUES (?, ?)';
            for (let id_Color of nuevaPub.colores) {
                await db.query(sqlColor, [id_Publicacion, id_Color]);
            }
        }

        //Insertar Fotografías
        if (nuevaPub.imagenes && nuevaPub.imagenes.length > 0) {
            const sqlFoto = 'INSERT INTO fotografia (id_Publicacion, fotografia) VALUES (?, FROM_BASE64(?))';
            for (let base64Image of nuevaPub.imagenes) {
                const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
                await db.query(sqlFoto, [id_Publicacion, cleanBase64]);
            }
        }

        await db.commit();

        res.status(201).json({
            message: 'Publicación, colores e imágenes creados con éxito',
            id: id_Publicacion
        });

    } catch (error) {
        await db.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al crear la publicación' });
    }
});

app.delete('/api/publicaciones/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.beginTransaction();

        await db.query('DELETE FROM colormascota WHERE id_Publicacion = ?', [id]);
        await db.query('DELETE FROM fotografia WHERE id_Publicacion = ?', [id]);
        await db.query('DELETE FROM guardados WHERE id_Publicacion = ?', [id]);
        await db.query('DELETE FROM reporte WHERE id_Publicacion = ?', [id]);

        const [result] = await db.query('DELETE FROM publicacion WHERE id_Publicacion = ?', [id]);

        if (result.affectedRows === 0) {
            await db.rollback();
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        await db.commit();
        res.status(200).json({ message: 'Publicación borrada con exito' });

    } catch (error) {
        await db.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error al borrar la publicacion' });
    }
});

app.get('/api/guardados/:id', async (req, res) => {
    const sql = `
        SELECT p.*,
        (SELECT TO_BASE64(fotografia) FROM fotografia f WHERE f.id_Publicacion = p.id_Publicacion LIMIT 1) as imagenBase64
        FROM publicacion AS p
        INNER JOIN guardados AS g ON p.id_Publicacion = g.id_Publicacion
        WHERE g.id_Usuario = ?
    `;

    const { id } = req.params;

    try {
        const [result] = await db.query(sql, [id]);

        res.status(200).json({
            message: 'Guardados recabados con exito',
            publicaciones: result
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al recabar publicaciones guardadas' });
    }
});

app.post('/api/guardados/:id', async (req, res) => {
    const id_Publicacion = req.params.id;
    const { id_Usuario } = req.body;

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

app.delete('/api/guardados/:id', async (req, res) => {
    const id_Publicacion = req.params.id;
    const { id_Usuario } = req.body;

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

app.listen(1984, () => {
    console.log("Servidor Corriendo en puerto 1984");
});