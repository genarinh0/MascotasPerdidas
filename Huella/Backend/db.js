import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bd_huella",
    port: 3307
});

const db = connection.promise();

console.log("Base de Datos Conectada");

export default db;