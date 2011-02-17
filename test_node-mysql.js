var ClientMySQL = require("./lib/mysql/lib/mysql").Client;

var clientMySQL = new ClientMySQL();
clientMySQL.host = "localhost";
clientMySQL.port = 3306;
clientMySQL.user = "root";
clientMySQL.password = "Amaduzzi,1234";

console.log("connecting...");
clientMySQL.connect();
console.log("fatto");


clientMySQL.query('USE DATABASE hotel');

var res = clientMySQL.query("SELECT * FROM camere", function(err, results, fields) {
  if (err) {
    throw err;
  }
  console.log(results);
  console.log(fields);
  clientMySQL.end();
});
console.log("RES = " + res.sql);

/*
console.log("set database");
clientMySQL.query("USE hotel;");
console.log("fatto");

console.log("set exit");
clientMySQL.query("exit;");
console.log("fatto");
*/

//clientMySQL.end();
console.log("eccoci");


