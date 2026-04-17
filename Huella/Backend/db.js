import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "ninguna",
    database: "bd_huella",
    port: 3306
});

const db = connection.promise();

console.log("Base de Datos Conectada");

export default db;