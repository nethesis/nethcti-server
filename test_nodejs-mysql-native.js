var db = require("./lib/nodejs-mysql-native/lib/mysql-native").createTCPClient();
db.auto_prepare = true;
function dump_rows(cmd)
{
   cmd.addListener('row', function(r) { sys.puts("row: " + sys.inspect(r)); } );
}

db.auth("root", "Amaduzzi,1234", "hotel");
dump_rows(db.query("CREATE DATABASE III"));
db.close();

for(;;);

