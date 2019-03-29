'use strict';
const ipc = require('node-ipc');
const name = 'nethcti.sock';

if (process.argv[2] !== 'reload') {
  console.log('usage: node nethcti-cli reload');
  process.exit(2);
}

ipc.config.id = 'nethcti-cli';
ipc.config.socketRoot = '/run/nethvoice/';
ipc.config.appspace = '';
ipc.config.encoding = 'utf8';
ipc.config.stopRetrying = true;
ipc.config.silent = true;

ipc.connectTo(name, () => {
  ipc.of[name].on('connect', () => {
    ipc.of[name].emit('message', 'reload');
    ipc.disconnect(name);
  });
  ipc.of[name].on('disconnect', () => {
    process.exit(0);
  });
  ipc.of[name].on('error', (err) => {
    console.error(err);
    process.exit(1);
  });
});