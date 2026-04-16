import express from 'express';
import db from './db.js';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/registro', async (req, res) => {
    // Crear cuenta nueva
    // Lo ideal es hashear la contrasena

    const credenciales = req.body;
    const parametros = [
        credenciales.email,
        credenciales.contrasena,
        credenciales.telefono ?? null
    ];

    try{
        const [result] = await db.query(
            'INSERT INTO usuario(email, contrasena, telefono) VALUES (?, ?, ?)',
            parametros
        );

        res.status(201).json({
            message: 'Usuario creado con exito',
            id: result.insertId
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al crear la cuenta'
        })
    }
})

app.post('/api/login', async (req, res) => {
    // Autenticar Usuario
    // Hacer email unique en bd
    const credenciales = req.body;
    const parametros = [
        credenciales.email,
        credenciales.contrasena
    ]

    try{
        const [result] = await db.query(
            'SELECT id_Usuario FROM Usuario WHERE email = ? AND contrasena = ?', 
            parametros
        )

        if (result.length === 0) {
            return res.status(401).json({
                error: 'Credenciales incorrectas'
            });
        }

        const usuario = result[0];

        res.status(200).json({
            message: 'Usuario autenticado correctamente',
            id: usuario.id_Usuario
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al autenticar el usuario'
        })
    }
})

app.get('/api/publicaciones', async (req, res) => {
    // Ver publicaciones con / sin filtros
    let sql = 'SELECT * FROM publicaciones';
    const filtros = req.query;
    const condiciones = [];
    const valores = [];

    Object.entries(filtros).forEach(([clave, valor]) => {
        // Filtro de color es distinto porque se busca en otra tabla
        condiciones.push(`${clave} = ?`);
        valores.push(valor);
    });

    if (condiciones.length > 0) {
        sql += ' WHERE ' + condiciones.join(' AND ');
    }

    try{
        const [rows] = await db.execute(sql, valores);

        res.status(200).json({
            message: 'Publicaciones recabadas con exito',
            publicaciones: rows
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al obtener las publicaciones'
        })
    }
})

app.post('/api/publicaciones', async (req, res) => {
    // Nueva Publicacion
    // Revisar si cumple con el formato, sino retornar un 400
    const nuevaPub = req.body;

    const sql = `
        INSERT INTO publicacion 
            (tipo, especie, raza, tamaño, descripcion, fecha_suceso, fecha_creacion, estatus, ubicacion, horario_contacto) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const parametros = [
        nuevaPub.tipo,
        nuevaPub.especie,
        nuevaPub.raza,
        nuevaPub.tamaño,
        nuevaPub.descripcion,
        nuevaPub.fecha_suceso,
        nuevaPub.fecha_creacion,
        nuevaPub.estatus,
        nuevaPub.ubicacion,
        nuevaPub.horario_contacto
    ];

    try{
        const [result] = await db.query(sql, parametros);

        res.status(201).json({
            message: 'Publicacion creada con exito',
            id: result.insertId
        });
        
    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al crear la publicacion'
        })
    }
})

app.delete('/api/publicaciones/:id', async (req, res) => {
    // Borrar publicacion con cierto id si es tuya
    // Autenticar primero, borrar despues
    const { id } = req.params;

    try{
        const [result] = await db.query('DELETE FROM publicaciones WHERE id_Publicacion = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Publicación no encontrada'
            });
        }

        res.status(200).json({
            message: 'Publicación borrada con exito'
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al borrar la publicacion'
        });
    }
})

app.get('/api/guardados/:id', async (req, res) => {
    // Ver publicaciones guardadas
    const sql = `SELECT p.* FROM Publicacion AS p 
        INNER JOIN Guardados AS g 
        ON p.id_Publicacion = g.id_Publicacion
        WHERE g.id_Usuario = ?
    `;

    const { id } = req.params;

    try{
        const [result] = await db.query(sql, [id]);

        res.status(200).json({
            message: 'Guardados recabados con exito',
            publicaciones: result
        })

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al recabar publicaciones guardadas'
        });
    }
})

app.post('/api/guardados/:id', async (req, res) => {
    // Guardar cierta publicacion
    const id_Publicacion = req.params.id;

    const { id_Usuario } = req.body;

    try{
        const [result] = await db.query(
            'INSERT INTO Guardados (id_Publicacion, id_Usuario) VALUES (?, ?)',
            [id_Publicacion, id_Usuario]
        );

        res.status(200).json({
            message: 'Publicacion guardada con exito'
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al guardar la publicacion'
        });
    }
})

app.delete('/api/guardados/:id', async (req, res) => {
    // Borrar cierta publicacion de guardados
    const id_Publicacion = req.params.id;
    const { id_Usuario } = req.body;

    try{
        const [result] = await db.query(
            'DELETE FROM Guardados WHERE id_Publicacion = ? AND id_Usuario = ?',
            [id_Publicacion, id_Usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Publicacion no encontrada en guardados'
            });
        }

        res.status(200).json({
            message: 'Publicacion borrada de guardados'
        });

    }catch (error){
        console.error(error);
        res.status(500).json({
            error: 'Error al quitar publicacion de guardados'
        });
    }
})

app.listen(1984, () => {
    console.log("Servidor Corriendo");
})