// models/db.js
const mysql = require("mysql");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "uniclub_db",
  port: 3306,
  connectionLimit: 10,
  waitForConnections: true,
});

// Test on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL Database");
    connection.release();
  }
});

module.exports = db;