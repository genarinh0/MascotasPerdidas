import mysql from 'mysql2';

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "bd_huella",
    port: 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
});

const db = pool.promise();

console.log("Base de Datos Conectada");

export default db;