'use strict';
/**
 * Provides the server for ipc communication.
 *
 * @module com_ipc
 * @main arch_com_ipc
 */

/**
 * Provides the IPC server.
 *
 * @class server_com_ipc
 */
const ipc = require('node-ipc');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [server_com_ipc]
 */
let IDLOG = '[server_com_ipc]';

/**
 * The logger. It must have at least three methods: _info, warn and error._
 *
 * @property logger
 * @type object
 * @private
 * @default console
 */
let logger = console;

/**
 * The unix socket file path.
 *
 * @property sockPath
 * @type string
 * @private
 * @default "/run/nethvoice/nethcti.sock"
 */
const sockPath = '/run/nethvoice/nethcti.sock';

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object. It must have at least
 * three methods: _info, warn and error_ as console object.
 * @static
 */
let setLogger = (log) => {
  try {
    if (typeof log === 'object' &&
      typeof log.log.info === 'function' &&
      typeof log.log.warn === 'function' &&
      typeof log.log.error === 'function') {

      logger = log;
      logger.log.info(IDLOG, 'new logger has been set');
    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Start the server.
 *
 * @method start
 * @static
 */
let start = () => {
  try {
    ipc.config.id = 'nethcti-server';
    ipc.config.encoding = 'utf8';
    ipc.config.silent = true;
    ipc.serve(sockPath, () => {
      ipc.server.on('error', (error) => {
        logger.log.error(IDLOG, error);
      });
      ipc.server.on('connect', (socket) => {
        logger.log.info(IDLOG, 'client connected');
      });
      ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
        logger.log.info(IDLOG, 'client disconnected');
      });
      ipc.server.on('message', (data, socket) => {
        if (data === 'reload') {
          process.emit('reloadApp');
        }
      });
    });
    ipc.server.start();
    logger.log.warn(IDLOG, 'listening on ' + sockPath);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
};

exports.start = start;
exports.setLogger = setLogger;