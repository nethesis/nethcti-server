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
const EventEmitter = require('events').EventEmitter;

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
 * The name of the alarm event.
 *
 * @property EVT_ALARM
 * @type string
 * @default "evtAlarm"
 */
var EVT_ALARM = 'evtAlarm';

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
 * The event emitter.
 *
 * @property emitter
 * @type object
 * @private
 */
let emitter = new EventEmitter();

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
    ipc.config.rawBuffer = true;
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
      ipc.server.on('data', (data, socket) => {
        try {
          let o = JSON.parse(data.toString().trim());
          if (o.type === 'message' && o.data === 'reload') {
            logger.log.info(IDLOG, 'received event reload');
            process.emit('reloadApp');
          } else if (o.type === 'collectd_notify') {
            logger.log.info(IDLOG, 'received collectd event');
            emitter.emit(EVT_ALARM,
              {
                status: o.notification.status.toLowerCase(),
                alarm: o.notification.type,
                queue: o.notification.type_instance.replace('Queue','')
              }
            );
          } else {
            logger.log.warn(IDLOG, 'received unknown event: ' + JSON.stringify(o));
          }
        } catch (err1) {
          logger.log.error(IDLOG, 'wrong JSON object received: ' + data.toString());
        }
      });
    });
    ipc.server.start();
    logger.log.warn(IDLOG, 'listening on ' + sockPath);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
};

/**
 * Subscribe a callback function to a custom event fired by this object.
 * It's the same of nodejs _events.EventEmitter.on._
 *
 * @method on
 * @param {string} type The name of the event
 * @param {function} cb The callback to execute in response to the event
 * @return {object} A subscription handle capable of detaching that subscription.
 */
let on = (type, cb) => {
  try {
    return emitter.on(type, cb);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

exports.on = on;
exports.EVT_ALARM = EVT_ALARM;
exports.start = start;
exports.setLogger = setLogger;