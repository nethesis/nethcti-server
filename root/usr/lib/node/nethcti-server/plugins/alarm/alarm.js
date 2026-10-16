'use strict';
/**
 * Provides the alarm functions.
 *
 * @module alarm
 * @main arch_alarm
 */
/**
 * Provides the alarm functionalities.
 *
 * @class alarm
 * @static
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [alarm]
 */
const IDLOG = '[alarm]';

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
 * The data structure to store alarms.
 *
 * @property alarms
 * @type object
 * @private
 * @default {}
 */
const alarms = {};

/**
 * The interval in milliseconds between two checks of the queues.
 *
 * @property CHECK_INTERVAL
 * @type number
 * @private
 * @final
 * @readOnly
 * @default 30000
 */
const CHECK_INTERVAL = 30000;

/**
 * The thresholds used to raise the queues alarms. They are the same
 * defaults of the legacy collectd asterisk monitor plugin.
 *
 * @property THRESHOLDS
 * @type object
 * @private
 * @final
 * @readOnly
 */
const THRESHOLDS = {
  maxCallsPerOp: 2,
  maxCalls: 10,
  maxHoldtime: 120,
  callersMaxWait: 250
};

/**
 * The asterisk proxy component.
 *
 * @property compAstProxy
 * @type object
 * @private
 */
let compAstProxy;

/**
 * The communication ipc component.
 *
 * @property compComIpc
 * @type object
 * @private
 */
let compComIpc;

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object
 * @static
 */
function setLogger(log) {
  try {
    if (typeof log === 'object' &&
      typeof log.log.info === 'function' &&
      typeof log.log.warn === 'function' &&
      typeof log.log.error === 'function') {

      logger = log;
    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the communication websocket component to be used.
 *
 * @method setCompComNethctiWs
 * @param {object} comp The module to be set
 */
function setCompComIpc(comp) {
  compComIpc = comp;
}

/**
 * Sets the asterisk proxy component to be used.
 *
 * @method setCompAstProxy
 * @param {object} comp The module to be set
 */
function setCompAstProxy(comp) {
  compAstProxy = comp;
}

/**
 * Sets the event listeners for the communication ipc component.
 *
 * @method setComIpcListeners
 * @private
 */
function setComIpcListeners() {
  try {
    compComIpc.on(compComIpc.EVT_ALARM, evtAlarm);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Start the component.
 *
 * @method start
 * @private
 */
function start() {
  try {
    logger.log.info(IDLOG, 'set listeners for com ipc component');
    setComIpcListeners();
    setInterval(checkQueues, CHECK_INTERVAL);
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Checks the status of all the queues and updates their alarms.
 *
 * @method checkQueues
 * @private
 */
function checkQueues() {
  try {
    if (compAstProxy.getQMAlarmsNotificationsStatus() !== true) {
      return;
    }
    const queues = compAstProxy.getJSONQueues() || {};
    // drop the alarms of removed queues
    for (const q in alarms) {
      if (!queues[q]) {
        delete alarms[q];
      }
    }
    for (const q in queues) {
      const members = Object.values(queues[q].members || {});
      const callers = Object.values(queues[q].waitingCallers || {});
      const calls = callers.length;
      const onlineMembers = members.filter(m => m.loggedIn === true && m.paused !== true).length;
      const holdtime = parseInt(queues[q].avgHoldTime, 10) || 0;
      const callersMaxWait = callers.reduce((max, c) => Math.max(max, c.waiting || 0), 0);
      const status = {
        queueload: calls > THRESHOLDS.maxCalls && holdtime > THRESHOLDS.maxHoldtime,
        queuemaxwait: calls > THRESHOLDS.maxCalls && callersMaxWait > THRESHOLDS.callersMaxWait,
        queuefewop: calls > onlineMembers * THRESHOLDS.maxCallsPerOp,
        queueholdtime: holdtime > THRESHOLDS.maxHoldtime
      };
      for (const alarm in status) {
        const active = Boolean(alarms[q] && alarms[q][alarm]);
        if (status[alarm] !== active) {
          const data = {
            date: new Date().toISOString(),
            status: status[alarm] ? 'warning' : 'okay',
            alarm: alarm,
            queue: q
          };
          setAlarm(data);
          process.emit(compComIpc.EVT_ALARM, data);
        }
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Stores an active alarm or removes it when it is back to normal.
 *
 * @method setAlarm
 * @param {object} data The alarm data
 * @private
 */
function setAlarm(data) {
  if (data.status === 'okay') {
    if (alarms[data.queue]) {
      delete alarms[data.queue][data.alarm];
      if (Object.keys(alarms[data.queue]).length === 0) {
        delete alarms[data.queue];
      }
    }
    return;
  }
  if (!alarms[data.queue]) {
    alarms[data.queue] = {};
  }
  alarms[data.queue][data.alarm] = { status: data.status, date: data.date };
}

/**
 * Received an alarm. Store it into the memory data structure.
 *
 * @method evtAlarm
 * @private
 */
function evtAlarm(data) {
  try {
    if (data.status && data.alarm && data.queue) {
      logger.log.info(IDLOG, 'received valid alarm: ' + JSON.stringify(data));
      setAlarm(data);
      process.emit(compComIpc.EVT_ALARM, data);
    } else {
      logger.log.warn(IDLOG, 'received invalid alarm: ' + JSON.stringify(data));
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Get all the queues alarms.
 *
 * @method getQueuesAlarms
 * @private
 */
function getQueuesAlarms(data) {
  try {
    return alarms;
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

exports.start = start;
exports.setLogger = setLogger;
exports.setCompComIpc = setCompComIpc;
exports.setCompAstProxy = setCompAstProxy;
exports.getQueuesAlarms = getQueuesAlarms;