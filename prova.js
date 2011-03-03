var fs = require('fs');
var path = require('path');
var util = require('util');

var par = { '1299144596.86': { name: '', number: '500', with: '1299144596.86' },
  '1299144601.87': { name: '', number: '501', with: '1299144601.87' } };
  

console.log(par);  
var str = '1299144596.86';
delete par[str];
console.log(par);
