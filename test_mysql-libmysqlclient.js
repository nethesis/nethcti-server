var sys = require("sys");

var mysql = require('./lib/node-mysql-libmysqlclient');
var conn = mysql.createConnectionSync();
conn.connectSync("localhost", "root", "Amaduzzi,1234", "hotel");

if (!conn.connectedSync()) {
  sys.puts("Connection error " + conn.connectErrno + ": " + conn.connectError);
  process.exit(1);
}
else{
	console.log("connectino OK");
}


/*
//
conn.realQuerySync("SHOW TABLES;");
result = conn.storeResultSync();
sys.puts("Tables in database hotel:");
while ((row = result.fetchArraySync())) {
  sys.puts(row[0]);
}
result.freeSync();

//
result = conn.querySync("SHOW TABLES;");
rows = result.fetchAllSync();
sys.puts("Tables in database hotel");
sys.puts(sys.inspect(rows) + "\n");


//
sys.puts("Information:");
sys.puts(sys.inspect(conn.getInfoSync()) + "\n");
*/

//
conn.query("SELECT * FROM camere;", function (err, res) {
  if (err) {
    throw err;
  }
  
  res.fetchAll(function (err, rows) {
    if (err) {
      throw err;
    }
    
    sys.puts("Rows in table hotel.camere:");
    sys.puts(sys.inspect(rows));
    
    // This isn't necessary since v1.2.0
    // See https://github.com/Sannis/node-mysql-libmysqlclient/issues#issue/60
    //res.freeSync();
  });
});


process.on('exit', function () {
  conn.closeSync();
});

