/**
 * Provides database functions.
 *
 * @module dbconn
 * @submodule plugins
 */
var async = require('async');
var moment = require('moment');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins/dbconn_ast_proxy]
 */
var IDLOG = '[plugins/dbconn_ast_proxy]';

/**
 * The logger. It must have at least three methods: _info, warn and error._
 *
 * @property logger
 * @type object
 * @private
 * @default console
 */
var logger = console;

/**
 * The exported apis.
 *
 * @property apiList
 * @type object
 */
var apiList = {};

/**
 * The main architect dbconn component.
 *
 * @property compDbconnMain
 * @type object
 * @private
 */
var compDbconnMain;

/**
 * Enable/disable cache.
 *
 * @property CACHE_ENABLED
 * @type boolean
 * @private
 */
var CACHE_ENABLED = true;

/**
 * Cache period time for some data.
 *
 * @property CACHE_TIMEOUT
 * @type number
 * @private
 * @default { "ASTATS": 2000 }
 */
var CACHE_TIMEOUT = {
  ASTATS: 2000
};

/**
 * The data cache.
 *
 * @property cache
 * @type object
 * @private
 */
var cache = {};

/**
 * The data cache timestamps.
 *
 * @property cacheTimestamps
 * @type object
 * @private
 */
var cacheTimestamps = {};

/**
 * Set the main dbconn architect component.
 *
 * @method setCompDbconnMain
 * @param {object} comp The architect main dbconn component
 * @static
 */
function setCompDbconnMain(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    compDbconnMain = comp;
    logger.log.info(IDLOG, 'main dbconn component has been set');

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object. It must have at least
 * three methods: _info, warn and error_ as console object.
 * @static
 */
function setLogger(log) {
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
 * Return the sha1 password of the FreePBX admin user or
 * boolean false if it is not found.
 *
 * @method getFpbxAdminSha1Pwd
 * @param {function} cb The callback function
 */
function getFpbxAdminSha1Pwd(cb) {
  try {
    if (typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    var user = 'admin';
    compDbconnMain.models[compDbconnMain.JSON_KEYS.AMPUSERS].find({
      where: ['username=?', user],
      attributes: ['password_sha1']

    }).then(function (result) {
      // extract result to return in the callback function
      if (result) {
        logger.log.info(IDLOG, 'found sha1 password of freepbx admin user');
        cb(null, result.password_sha1);

      } else {
        logger.log.info(IDLOG, 'no sha1 password of freepbx admin user has been found');
        cb(null, false);
      }

    }, function (error) { // manage the error
      logger.log.error(IDLOG, 'getting sha1 password of freepbx admin user');
      cb(error.toString());
    });

    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Get call info of speciefied uniqueid. It searches the results into the
 * database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
 * or _/etc/nethcti/dbdynamic.json_ files.
 *
 * @method getCallInfo
 * @param {string}   uniqueid   The call uniqueid
 * @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
 * @param {function} cb         The callback function
 */
function getCallInfo(uniqueid, privacyStr, cb) {
  try {
    // check parameters
    if (typeof uniqueid !== 'string' || typeof cb !== 'function' || (typeof privacyStr !== 'string' && privacyStr !== undefined)) {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

    // if the privacy string is present, than hide the numbers
    if (privacyStr) {
      // the numbers are hidden
      attributes.push(['CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten']);
      attributes.push(['CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode']);
      var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
      attributes.push(['concat(cid_name, " ", ' + cidNumHidden + ')', 'cid']);

    } else {
      // the numbers are clear
      attributes.push('exten');
      attributes.push('accountcode');
      attributes.push(['concat(cid_name, " ", cid_num)', 'cid']);
    }

    // search
    compDbconnMain.models[compDbconnMain.JSON_KEYS.CEL].findAll({
      where: [
        'uniqueid=?', uniqueid
      ],
      attributes: attributes

    }).success(function (results) {

      // extract results to return in the callback function
      var i;
      for (i = 0; i < results.length; i++) {
        results[i] = results[i].selectedValues;
      }

      logger.log.info(IDLOG, results.length + ' results searching CEL on uniqueid "' + uniqueid + '"');
      cb(null, results);

    }).error(function (err) { // manage the error

      logger.log.error(IDLOG, 'searching CEL on uniqueid "' + uniqueid + '"');
      cb(err.toString());
    });

    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Gets the details about caller id from queue_recall db table.
 *
 * @method getQueueRecallInfo
 * @param {object} data
 *   @param {string} data.hours The value of the hours of the current day to be searched
 *   @param {string} data.cid The caller identifier
 *   @param {string} data.qid The queue identifier
 * @param {function} cb The callback function
 */
function getQueueRecallInfo(data, cb) {
  try {
    if (typeof data !== 'object' ||
      typeof cb !== 'function' ||
      typeof data.hours !== 'string' ||
      typeof data.qid !== 'string' ||
      typeof data.cid !== 'string') {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    var query = [
      'SELECT queuename, ',
      'direction, ',
      'action, ',
      'UNIX_TIMESTAMP(time) as time, ',
      'position, ',
      'duration, ',
      'hold, ',
      'cid, ',
      'agent, ',
      ' IF (event = "", action, event) AS event ',
      'FROM ', getQueueRecallQueryTable(data.hours), ' ',
      'WHERE cid="', data.cid, '" AND queuename="', data.qid, '" ',
      'ORDER BY time ASC'
    ].join('');

    compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).then(function (results) {
      logger.log.info(IDLOG, results.length + ' results searching details about queue recall on cid "' + data.cid + '"');
      cb(null, results[0]);
    }, function (err1) {
      logger.log.error(IDLOG, 'searching details about queue recall on cid "' + data.cid + '"');
      cb(err.toString(), {});
    });
    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Gets the query that returns the entries corresponding to queue recalls table.
 *
 * @method getQueueRecallQueryTable
 * @param {string} hours The value of the interval time to be searched
 * @return {string} The query to obtain the entries about queue recall table
 * @private
 */
function getQueueRecallQueryTable(hours) {
  try {
    if (typeof hours !== 'string') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    var timeConditionQl = 'TIMESTAMPDIFF(HOUR, time, now()) < ' + hours; // time condition on queue_log
    var timeConditionCdr = 'TIMESTAMPDIFF(HOUR, calldate, now()) < ' + hours; // time condition on cdr
    var query = [
      '(',
      'SELECT TIMESTAMP(time) AS time,',
      ' queuename,',
      ' "IN" AS direction,',
      ' "TIMEOUT" AS action,',
      ' CAST(data1 AS UNSIGNED) AS position,',
      ' CAST(data2 AS UNSIGNED) AS duration,',
      ' CAST(data3 AS UNSIGNED) AS hold,',
      ' (',
      'SELECT DISTINCT(data2) ',
      'FROM   asteriskcdrdb.queue_log z ',
      'WHERE  z.event="ENTERQUEUE" AND z.callid=a.callid',
      ' ) AS cid,',
      ' (',
      'SELECT DISTINCT(cdr.cnam) ',
      'FROM   asteriskcdrdb.cdr cdr ',
      'WHERE  cdr.uniqueid = a.callid GROUP BY cdr.uniqueid',
      ' ) AS name,',
      ' (',
      'SELECT DISTINCT(cdr.ccompany) ',
      'FROM   asteriskcdrdb.cdr cdr ',
      'WHERE  cdr.uniqueid = a.callid GROUP BY cdr.uniqueid',
      ' ) AS company,',
      ' agent, ',
      ' event ',
      'FROM   asteriskcdrdb.queue_log a ',
      'WHERE  event IN ("ABANDON", "EXITWITHTIMEOUT", "EXITWITHKEY", "EXITEMPTY")',
      ' AND ', timeConditionQl,

      ' UNION ALL ',

      'SELECT TIMESTAMP(time) AS time,',
      ' queuename,',
      ' "IN" AS direction,',
      ' "DONE" AS action,',
      ' CAST(data3 AS UNSIGNED) AS position,',
      ' CAST(data2 AS UNSIGNED) AS duration,',
      ' CAST(data1 AS UNSIGNED) AS hold,',
      ' (',
      'SELECT DISTINCT(data2) ',
      'FROM   asteriskcdrdb.queue_log z ',
      'WHERE  z.event="ENTERQUEUE"',
      ' AND z.callid=a.callid',
      ' ) AS cid,',
      ' (',
      'SELECT DISTINCT(cdr.cnam) ',
      'FROM   asteriskcdrdb.cdr cdr ',
      'WHERE  cdr.uniqueid = a.callid GROUP BY cdr.uniqueid',
      ' ) AS name,',
      ' (',
      'SELECT DISTINCT(cdr.ccompany) ',
      'FROM   asteriskcdrdb.cdr cdr ',
      'WHERE  cdr.uniqueid = a.callid GROUP BY cdr.uniqueid',
      ' ) AS company,',
      ' agent, ',
      ' event ',
      'FROM   asteriskcdrdb.queue_log a ',
      'WHERE  event IN ("COMPLETEAGENT", "COMPLETECALLER")',
      ' AND ', timeConditionQl,

      ' UNION ALL ',

      'SELECT TIMESTAMP(calldate) AS time,',
      ' l.queuename as queuename,',
      ' "OUT" AS direction,',
      ' IF (disposition="ANSWERED", "DONE", disposition) AS action,',
      ' 0 AS position,',
      ' 0 AS duration,',
      ' 0 AS hold,',
      ' dst AS cid,',
      ' cnam AS name,',
      ' ccompany AS company,',
      ' src AS agent, ',
      ' "" ',
      'FROM   cdr c ',
      'INNER JOIN asteriskcdrdb.queue_log l ON c.dst=l.data2 ',
      'WHERE  l.event="ENTERQUEUE" ',
      ' AND ', timeConditionCdr,
      ' AND ', timeConditionQl,

      ' ORDER BY time DESC',

      ') queue_recall'

    ].join('');

    return query;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    return '';
  }
}

/**
 * Gets the last calls from queue_log db table basing the search
 * with the last X hours of the current day.
 *
 * @method getQueueRecall
 * @param {object} data
 *   @param {string} data.hours The value of the hours to be searched
 *   @param {array} data.queues The queues identifiers
 * @param {function} cb The callback function
 */
function getQueueRecall(data, cb) {
  try {
    if (typeof data !== 'object' ||
      typeof cb !== 'function' ||
      typeof data.hours !== 'string' ||
      Array.isArray(data.queues) !== true) {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    if (data.queues.length === 0) {
      return cb(null, []);
    }

    var query = [
      'SELECT cid,',
      ' name,',
      ' company,',
      ' action,',
      ' UNIX_TIMESTAMP(time) as time,',
      ' direction,',
      ' queuename, ',
      ' IF (event = "", action, event) AS event ',
      'FROM ', getQueueRecallQueryTable(data.hours), ' ',
      'WHERE queuename IN (' + data.queues + ') ',
      'GROUP BY cid, queuename ',
      'ORDER BY time DESC;'
    ].join('');

    compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).then(function (results) {
      logger.log.info(IDLOG, 'get queues ' + data.queues + ' recall of last ' + data.hours +
        ' hours has been successful: ' + results.length + ' results');
      cb(null, results[0]);

    }, function (err1) {
      logger.log.error(IDLOG, 'get queues ' + data.queues + ' recall of last ' + data.hours + ' hours: ' + err1.toString());
      cb(err1, {});
    });

    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Get call trace of speciefied linkedid. It searches the results into the
 * database specified into the key names of one of the _/etc/nethcti/dbstatic.json_
 * or _/etc/nethcti/dbdynamic.json_ files.
 *
 * @method getCallTrace
 * @param {string}   link       The call linkedid
 * @param {string}   privacyStr The privacy string to be used to hide the phone numbers. It can be undefined
 * @param {function} cb         The callback function
 */
function getCallTrace(linkedid, privacyStr, cb) {
  try {
    // check parameters
    if (typeof linkedid !== 'string' || typeof cb !== 'function' || (typeof privacyStr !== 'string' && privacyStr !== undefined)) {

      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

    // if the privacy string is present, than hide the numbers
    if (privacyStr) {
      // the numbers are hidden
      attributes.push(['CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten']);
      attributes.push(['CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode']);
      var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
      attributes.push(['concat(cid_name, " ", ' + cidNumHidden + ')', 'cid']);

    } else {
      // the numbers are clear
      attributes.push('exten');
      attributes.push('accountcode');
      attributes.push(['concat(cid_name, " ", cid_num)', 'cid']);
    }

    // search
    compDbconnMain.models[compDbconnMain.JSON_KEYS.CEL].findAll({
      where: [
        'linkedid=?', linkedid
      ],
      attributes: attributes

    }).success(function (results) {

      // extract results to return in the callback function
      var i;
      for (i = 0; i < results.length; i++) {
        results[i] = results[i].selectedValues;
      }

      logger.log.info(IDLOG, results.length + ' results searching CEL on linkedid "' + linkedid + '"');
      cb(null, results);

    }).error(function (err) { // manage the error

      logger.log.error(IDLOG, 'searching CEL on linkedid "' + linkedid + '"');
      cb(err.toString());
    });

    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Gets statistic about the queue.
 *
 * @method getQueueStats
 * @param {string} qid The queue identifier
 * @param {number} nullCallPeriod The period of time to consider a call as null
 * @param {string} sla The service level of the queue
 * @param {function} cb The callback function
 */
function getQueueStats(qid, nullCallPeriod, sla, cb) {
  try {
    if (typeof cb !== 'function' ||
      typeof qid !== 'string' ||
      typeof sla !== 'string' ||
      typeof nullCallPeriod !== 'number') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].find({
      where: [
        'event IN ("DID","ENTERQUEUE","COMPLETEAGENT","COMPLETECALLER","ABANDON","EXITEMPTY","EXITWITHKEY","EXITWITHTIMEOUT","FULL","JOINEMPTY","JOINUNAVAIL") ' +
        'AND queuename=?',
        qid
      ],
      attributes: [
        ['IFNULL(queuename, ' + qid + ')', 'queueman'],
        ['COUNT(IF(event="DID", 1, NULL))', 'tot'],
        ['COUNT(IF(event IN ("COMPLETEAGENT","COMPLETECALLER"), 1, NULL))', 'tot_processed'],
        ['COUNT(IF(event IN ("COMPLETEAGENT","COMPLETECALLER") AND data1<' + sla + ', 1, NULL))', 'processed_less_sla'],
        ['COUNT(IF(event IN ("COMPLETEAGENT","COMPLETECALLER") AND data1>=' + sla + ', 1, NULL))', 'processed_greater_sla'],
        ['COUNT(IF(event="ABANDON" AND data3<' + nullCallPeriod + ', 1, NULL))', 'tot_null'],
        ['COUNT(IF((event IN ("EXITEMPTY","EXITWITHKEY","EXITWITHTIMEOUT","FULL","JOINEMPTY","JOINUNAVAIL")) OR (event="ABANDON" AND data3>=' + nullCallPeriod + '), 1, NULL))', 'tot_failed'],
        ['COUNT(IF(event="EXITEMPTY", 1, NULL))', 'failed_inqueue_noagents'],
        ['COUNT(IF(event="EXITWITHKEY", 1, NULL))', 'failed_withkey'],
        ['COUNT(IF(event="EXITWITHTIMEOUT", 1, NULL))', 'failed_timeout'],
        ['COUNT(IF((event="ABANDON" AND data3>=' + nullCallPeriod + '), 1, NULL))', 'failed_abandon'],
        ['COUNT(IF(event="FULL", 1, NULL))', 'failed_full'],
        ['COUNT(IF(event IN ("JOINEMPTY","JOINUNAVAIL"), 1, NULL))', 'failed_outqueue_noagents'],
        ['IFNULL(MIN(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data2 AS UNSIGNED), NULL)), 0)', 'min_duration'],
        ['IFNULL(MAX(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data2 AS UNSIGNED), NULL)), 0)', 'max_duration'],
        ['IFNULL(ROUND(AVG(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data2 AS UNSIGNED), NULL)), 0), 0)', 'avg_duration'],
        ['IFNULL(MIN(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data1 AS UNSIGNED), ' +
          'IF(event="ABANDON" AND data3>=' + nullCallPeriod + ', CAST(data3 AS UNSIGNED), ' +
          'IF(event IN ("EXITWITHTIMEOUT","EXITEMPTY","EXITWITHKEY"), CAST(data3 AS UNSIGNED), NULL))' +
          ')), 0)',
          'min_wait'
        ],
        ['IFNULL(MAX(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data1 AS UNSIGNED), ' +
          'IF(event="ABANDON" AND data3>=' + nullCallPeriod + ', CAST(data3 AS UNSIGNED), ' +
          'IF(event IN ("EXITWITHTIMEOUT","EXITEMPTY","EXITWITHKEY"), CAST(data3 AS UNSIGNED), NULL))' +
          ')), 0)',
          'max_wait'
        ],
        ['IFNULL(ROUND(AVG(IF(event IN ("COMPLETECALLER","COMPLETEAGENT"), CAST(data1 AS UNSIGNED), ' +
          'IF(event="ABANDON" AND data3>=' + nullCallPeriod + ', CAST(data3 AS UNSIGNED), ' +
          'IF(event IN ("EXITWITHTIMEOUT","EXITEMPTY","EXITWITHKEY"), CAST(data3 AS UNSIGNED), NULL))' +
          ')), 0), 0)',
          'avg_wait'
        ]
      ]
    }).then(function (results) {
      try {
        if (results && results.dataValues) {
          logger.log.info(IDLOG, 'get stats of queue "' + qid + '" has been successful');
          results.dataValues.sla = parseInt(sla);
          results.dataValues.nullCallPeriod = parseInt(nullCallPeriod);
          cb(null, results.dataValues);
        } else {
          logger.log.info(IDLOG, 'get stats of queue "' + qid + '": not found');
          cb(null, {});
        }
      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error);
      }
    }, function (err) {
      logger.log.error(IDLOG, 'get stats of queue "' + qid + '": ' + err.toString());
      cb(err.toString());
    });
    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Gets hourly statistics about queues calls.
 *
 * @method getQCallsStatsHist
 * @param {number} nullCallPeriod The period of time to consider a call as null
 * @param {function} cb The callback function
 */
function getQCallsStatsHist(nullCallPeriod, cb) {
  try {
    if (typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    const period = [
      '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30',
      '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
      '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00'
    ];
    const day = moment();
    const currday = day.format('DD-MMMM-YY');
    let caseClause = 'CASE ';
    for (var i = 0; i < period.length - 1; i++) {
      caseClause += 'WHEN TIME(time) >= "' + period[i] + ':00" AND TIME(time) < "' + period[i+1] + ':00" THEN DATE_FORMAT(time, "' + currday + '-' + period[i+1] + '") ';
    }
    caseClause += 'END';
    compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
      where: [
        'event IN ("DID","ENTERQUEUE","COMPLETEAGENT","COMPLETECALLER","ABANDON","EXITEMPTY","EXITWITHKEY","EXITWITHTIMEOUT","FULL","JOINEMPTY","JOINUNAVAIL") ' +
        'GROUP BY queuename, date'
      ],
      attributes: [
        'queuename',
        [caseClause, 'date'],
        ['COUNT(IF(event="DID", 1, NULL))', 'total'],
        ['COUNT(IF(event IN ("COMPLETEAGENT","COMPLETECALLER"), 1, NULL))', 'answered'],
        ['COUNT(IF((event IN ("EXITEMPTY","EXITWITHKEY","EXITWITHTIMEOUT","FULL","JOINEMPTY","JOINUNAVAIL")) OR (event="ABANDON" AND data3>=' + nullCallPeriod + '), 1, NULL))', 'failed'],
        ['COUNT(IF(event="ABANDON" AND data3<' + nullCallPeriod + ', 1, NULL))', 'invalid']
      ]
    }).then(function (results) {
      try {
        let tempdate, i, tempval,
            min = Math.floor(day.minutes()/30)*30,
            currDatetime = currday + '-' + ('0' + day.hours()).slice(-2) + ':' + (min === 0 ? '00' : min),
            basevalues = {},
            emptyValues = {};
        for (i = 0; i < period.length - 1; i++) {
          tempdate = currday + '-' + period[i+1];
          tempval = {
            value: 0,
            date: tempdate,
            fullDate: new Date(tempdate).toISOString()
          };
          basevalues[tempdate] = tempval;
          if (new Date(tempdate).getTime() <= new Date(currDatetime).getTime()) {
            emptyValues[tempdate] = tempval;
          }
        }
        if (results.length > 0) {
          logger.log.info(IDLOG, 'get hist queues calls stats has been successful');
          let values = {};
          for (i = 0; i < results.length; i++) {
            if (!values[results[i].dataValues.queuename]) {
              values[results[i].dataValues.queuename] = {
                totalTemp: JSON.parse(JSON.stringify(basevalues)),
                answeredTemp: JSON.parse(JSON.stringify(basevalues)),
                failedTemp: JSON.parse(JSON.stringify(basevalues)),
                invalidTemp: JSON.parse(JSON.stringify(basevalues))
              };
            }
            values[results[i].dataValues.queuename].totalTemp[results[i].dataValues.date].value = results[i].dataValues.total;
            values[results[i].dataValues.queuename].answeredTemp[results[i].dataValues.date].value = results[i].dataValues.answered;
            values[results[i].dataValues.queuename].failedTemp[results[i].dataValues.date].value = results[i].dataValues.failed;
            values[results[i].dataValues.queuename].invalidTemp[results[i].dataValues.date].value = results[i].dataValues.invalid;
          }
          let q, entry;
          for (q in values) {
            values[q].total = [];
            for (entry in values[q].totalTemp) {
              values[q].total.push(values[q].totalTemp[entry]);
              if (entry === currDatetime) { break; }
            }
            delete values[q].totalTemp;
            values[q].answered = [];
            for (entry in values[q].answeredTemp) {
              values[q].answered.push(values[q].answeredTemp[entry]);
              if (entry === currDatetime) { break; }
            }
            delete values[q].answeredTemp;
            values[q].failed = [];
            for (entry in values[q].failedTemp) {
              values[q].failed.push(values[q].failedTemp[entry]);
              if (entry === currDatetime) { break; }
            }
            delete values[q].failedTemp;
            values[q].invalid = [];
            for (entry in values[q].invalidTemp) {
              values[q].invalid.push(values[q].invalidTemp[entry]);
              if (entry === currDatetime) { break; }
            }
            delete values[q].invalidTemp;
          }
          cb(null, values, results.length);
        } else {
          logger.log.info(IDLOG, 'get hist queues calls stats: no results');
          cb(null, emptyValues, results.length);
        }
      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error);
      }
    }, function (err) {
      logger.log.error(IDLOG, 'get hist queues calls stats: ' + err.toString());
      cb(err.toString());
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have the time spent into pause queues.
 *
 * @method getAgentsPauseDurations
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsPauseDurations(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        var query = [
          'SELECT a.agent AS agent,',
            'a.queuename AS queue,',
            'UNIX_TIMESTAMP(MIN(b.time))-UNIX_TIMESTAMP(a.time) AS secs',
          'FROM asteriskcdrdb.queue_log a',
          'LEFT JOIN asteriskcdrdb.queue_log b',
            'ON b.agent = a.agent',
            'AND b.queuename = a.queuename',
            'AND b.time > a.time',
            'AND b.event = "UNPAUSE"',
            'AND b.callid = "NONE"',
          'WHERE a.event = "PAUSE"',
            'AND a.callid = "NONE"',
            'AND a.agent IN ("' + agents.join('","') + '")',
          'GROUP BY agent, queue, a.time'
        ].join(' ');
        compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).then(function (results) {
          try {
            if (results && results[0]) {

              logger.log.info(IDLOG, 'get pause duration of queue agents "' + agents + '" has been successful');
              results = results[0];
              var i, u, q;
              var resdata = {};
              for (i = 0; i < results.length; i++) {
                if (!resdata[results[i].agent]) {
                  resdata[results[i].agent] = {};
                }
                if (!resdata[results[i].agent][results[i].queue]) {
                  resdata[results[i].agent][results[i].queue] = results[i].secs;
                } else {
                  resdata[results[i].agent][results[i].queue] += results[i].secs;
                }
              }
              for (u in resdata) {
                for (q in resdata[u]) {
                  resdata[u][q] = Math.round(resdata[u][q]);
                }
              }
              callback(null, resdata);

            } else {
              logger.log.info(IDLOG, 'get pause duration of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get pause duration of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have the time spent into the queues.
 *
 * @method getAgentsLogonDurations
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsLogonDurations(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        var query = [
          'SELECT a.agent AS agent,',
            'a.queuename AS queue,',
            'UNIX_TIMESTAMP(MIN(b.time))-UNIX_TIMESTAMP(a.time) AS secs',
          'FROM asteriskcdrdb.queue_log a',
          'LEFT JOIN asteriskcdrdb.queue_log b',
            'ON b.agent = a.agent',
            'AND b.queuename = a.queuename',
            'AND b.time > a.time',
            'AND b.event = "REMOVEMEMBER"',
          'WHERE a.event = "ADDMEMBER"',
            'AND a.agent IN ("' + agents.join('","') + '")',
          'GROUP BY agent, queue, a.time'
        ].join(' ');
        compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).then(function (results) {
          try {
            if (results && results[0]) {

              logger.log.info(IDLOG, 'get logon duration of queue agents "' + agents + '" has been successful');
              results = results[0];
              var i, u, q;
              var resdata = {};
              for (i = 0; i < results.length; i++) {
                if (!resdata[results[i].agent]) {
                  resdata[results[i].agent] = {};
                }
                if (!resdata[results[i].agent][results[i].queue]) {
                  resdata[results[i].agent][results[i].queue] = results[i].secs;
                } else {
                  resdata[results[i].agent][results[i].queue] += results[i].secs;
                }
              }
              for (u in resdata) {
                for (q in resdata[u]) {
                  resdata[u][q] = Math.round(resdata[u][q]);
                }
              }
              callback(null, resdata);

            } else {
              logger.log.info(IDLOG, 'get logon duration of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get logon duration of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have pause, unpause stats of queue agents.
 *
 * @method getAgentsStatsPauseUnpause
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsStatsPauseUnpause(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
          where: [
            'event IN ("PAUSE","UNPAUSE") AND agent IN ("' + agents.join('","') + '") AND callid="NONE" GROUP BY queuename, agent, event ORDER BY time'
          ],
          attributes: [
            ['MAX(time)', 'last_time'],
            'id', 'callid', 'queuename', 'agent', 'event'
          ]
        }).then(function (results) {
          try {
            if (results) {
              logger.log.info(IDLOG, 'get pause/unpause stats of queue agents "' + agents + '" has been successful');
              var values = {};
              var i;
              for (i = 0; i < results.length; i++) {
                results[i].dataValues.last_time = Math.round(new Date(results[i].dataValues.last_time).getTime() / 1000);
                if (!values[results[i].dataValues.agent]) {
                  values[results[i].dataValues.agent] = {};
                }
                if (!values[results[i].dataValues.agent][results[i].dataValues.queuename]) {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename] = {};
                }
                if (results[i].dataValues.event === 'PAUSE') {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename].last_paused_time = Math.floor(results[i].dataValues.last_time);
                } else if (results[i].dataValues.event === 'UNPAUSE') {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename].last_unpaused_time = Math.floor(results[i].dataValues.last_time);
                }
              }
              callback(null, values);
            } else {
              logger.log.info(IDLOG, 'get pause/unpause stats of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get pause/unpause stats of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have calls taken counter of queue agents and their
 * time of last call.
 *
 * @method getAgentsStatsCalls
 * @return {function} The function to be executed
 */
function getAgentsStatsCalls(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
          where: [
            'event IN ("COMPLETEAGENT","COMPLETECALLER") AND agent IN ("' + agents.join('","') + '") GROUP BY agent, queuename'
          ],
          attributes: [
            ['MAX(time)', 'last_call_time'],
            ['COUNT(queuename)', 'calls_taken'],
            ['SUM(data2)', 'duration_incoming'],
            ['MAX(data2)', 'max_duration_incoming'],
            ['MIN(data2)', 'min_duration_incoming'],
            ['AVG(data2)', 'avg_duration_incoming'],
            'queuename', 'agent'
          ]
        }).then(function (results) {
          try {
            if (results) {
              logger.log.info(IDLOG, 'get calls taken count stats of queue agents "' + agents + '" has been successful');
              var values = {};
              var i;
              for (i = 0; i < results.length; i++) {
                results[i].dataValues.last_call_time = Math.round(new Date(results[i].dataValues.last_call_time).getTime() / 1000);
                if (!values[results[i].dataValues.agent]) {
                  values[results[i].dataValues.agent] = {};
                }
                if (!values[results[i].dataValues.agent][results[i].dataValues.queuename]) {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename] = {};
                }
                values[results[i].dataValues.agent][results[i].dataValues.queuename].duration_incoming = results[i].dataValues.duration_incoming;
                values[results[i].dataValues.agent][results[i].dataValues.queuename].calls_taken = results[i].dataValues.calls_taken;
                values[results[i].dataValues.agent][results[i].dataValues.queuename].last_call_time = Math.floor(results[i].dataValues.last_call_time);
                values[results[i].dataValues.agent][results[i].dataValues.queuename].max_duration_incoming = parseInt(results[i].dataValues.max_duration_incoming);
                values[results[i].dataValues.agent][results[i].dataValues.queuename].min_duration_incoming = parseInt(results[i].dataValues.min_duration_incoming);
                values[results[i].dataValues.agent][results[i].dataValues.queuename].avg_duration_incoming = Math.floor(results[i].dataValues.avg_duration_incoming);
              }
              callback(null, values);
            } else {
              logger.log.info(IDLOG, 'get calls taken count stats of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get calls taken count stats of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have missed calls counter of queue agents.
 *
 * @method getAgentsMissedCalls
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsMissedCalls(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
          where: [
            'event="RINGNOANSWER" AND agent IN ("' + agents.join('","') + '") GROUP BY queuename, agent ORDER BY agent'
          ],
          attributes: [
            ['COUNT(event)', 'noanswercalls'], 'agent', 'queuename'
          ]
        }).then(function (results) {
          try {
            if (results) {
              logger.log.info(IDLOG, 'get missed calls count of queue agents "' + agents + '" has been successful');
              var values = {};
              for (var i = 0; i < results.length; i++) {
                if (!values[results[i].dataValues.agent]) {
                  values[results[i].dataValues.agent] = {};
                }
                if (!values[results[i].dataValues.agent][results[i].dataValues.queuename]) {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename] = {};
                }
                values[results[i].dataValues.agent][results[i].dataValues.queuename].noanswercalls = results[i].dataValues.noanswercalls;
              }
              callback(null, values);
            } else {
              logger.log.info(IDLOG, 'get missed calls of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get missed calls of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have outgoing calls counter of queue agents.
 *
 * @method getAgentsOutgoingCalls
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsOutgoingCalls(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].findAll({
          where: [
            'disposition="ANSWERED" AND cnam IN ("' + agents.join('","') + '") AND calldate LIKE "' + moment().format('YYYY-MM-DD') + '%" GROUP BY cnam'
          ],
          attributes: [
            ['MAX(duration)', 'max_duration_outgoing'],
            ['MIN(duration)', 'min_duration_outgoing'],
            ['AVG(duration)', 'avg_duration_outgoing'],
            ['SUM(duration)', 'tot_duration_outgoing'],
            ['COUNT(cnam)', 'outgoing_calls'],
            ['cnam', 'agent']
          ]
        }).then(function (results) {
          try {
            if (results) {
              logger.log.info(IDLOG, 'get outgoing calls of queue agents "' + agents + '" has been successful');
              var values = {};
              for (var i = 0; i < results.length; i++) {
                values[results[i].dataValues.agent] = {
                  outgoing_calls: results[i].dataValues.outgoing_calls,
                  duration_outgoing: results[i].dataValues.tot_duration_outgoing,
                  max_duration_outgoing: results[i].dataValues.max_duration_outgoing,
                  min_duration_outgoing: results[i].dataValues.min_duration_outgoing,
                  avg_duration_outgoing: Math.floor(results[i].dataValues.avg_duration_outgoing)
                }
              }
              callback(null, values);
            } else {
              logger.log.info(IDLOG, 'get outgoing calls of queue agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get outgoing calls of queue agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return function to have logint, logout stats of queue agents.
 *
 * @method getAgentsStatsLoginLogout
 * @param {array} agents The list of the agents
 * @return {function} The function to be executed
 */
function getAgentsStatsLoginLogout(agents) {
  try {
    if (Array.isArray(agents) !== true) {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    return function (callback) {
      try {
        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
          where: [
            'event IN ("REMOVEMEMBER","ADDMEMBER") ' +
            'AND ( (agent IN ("' + agents.join('","') + '") ' +
            'AND data1="") || ' +
            '(agent IN ("' + agents.join('","') + '") AND data1!="") ) '+
            'GROUP BY queuename, agent, event ORDER BY time'
          ],
          attributes: [
            ['MAX(time)', 'last_time'],
            'id', 'callid', 'queuename', 'agent', 'event'
          ]
        }).then(function (results) {
          try {
            if (results) {
              logger.log.info(IDLOG, 'get login/logout stats of queue agents "' + agents + '" has been successful');
              var values = {};
              var i;
              for (i = 0; i < results.length; i++) {
                results[i].dataValues.last_time = Math.round(new Date(results[i].dataValues.last_time).getTime() / 1000);
                if (!values[results[i].dataValues.agent]) {
                  values[results[i].dataValues.agent] = {};
                }
                if (!values[results[i].dataValues.agent][results[i].dataValues.queuename]) {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename] = {};
                }
                if (results[i].dataValues.event === 'ADDMEMBER') {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename].last_login_time = Math.floor(results[i].dataValues.last_time);
                } else if (results[i].dataValues.event === 'REMOVEMEMBER') {
                  values[results[i].dataValues.agent][results[i].dataValues.queuename].last_logout_time = Math.floor(results[i].dataValues.last_time);
                }
              }
              callback(null, values);
            } else {
              logger.log.info(IDLOG, 'get login/logout stats of agents "' + agents + '": not found');
              callback(null, {});
            }
          } catch (error) {
            logger.log.error(IDLOG, error.stack);
            callback(error);
          }
        }, function (err) {
          logger.log.error(IDLOG, 'get login/logout stats of agents "' + agents + '": ' + err.toString());
          callback(err.toString());
        });
        compDbconnMain.incNumExecQueries();
      } catch (err) {
        logger.log.error(IDLOG, err.stack);
        callback(err);
      }
    }
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Get agents statistics.
 *
 * @method getAgentsStatsByList
 * @param {object} members The list of all agents of all queues with logged-in and pause status
 * @param {function} cb The callback function
 */
function getAgentsStatsByList(members, cb) {
  try {
    if (typeof cb !== 'function' || typeof members !== 'object') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    // check if the cache is enabled and result is into the cache
    if (CACHE_ENABLED &&
      cache.getAgentsStatsByList &&
      (new Date().getTime() - cacheTimestamps.getAgentsStatsByList) < CACHE_TIMEOUT.ASTATS) {

      cb(null, cache.getAgentsStatsByList);
      return;
    }
    var agents = Object.keys(members);
    var functs = {
      calls_stats: getAgentsStatsCalls(agents),
      pause_unpause: getAgentsStatsPauseUnpause(agents),
      login_logout: getAgentsStatsLoginLogout(agents),
      calls_missed: getAgentsMissedCalls(agents),
      calls_outgoing: getAgentsOutgoingCalls(agents),
      pause_durations: getAgentsPauseDurations(agents),
      logon_durations: getAgentsLogonDurations(agents)
    };
    async.parallel(functs, function (err, data) {
      try {
        if (err) {
          logger.log.error(IDLOG, 'getting stats about qmanager agents:', err);
          cb(err);
        } else {
          var u, q;
          var ret = {};
          for (u in data.calls_stats) {
            if (!ret[u]) {
              ret[u] = {
                incomingCalls: {
                  duration_incoming: 0,
                  avg_duration_incoming: 0,
                  min_duration_incoming: 99999,
                  max_duration_incoming: 0
                }
              };
            }
            for (q in data.calls_stats[u]) {
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].calls_taken = data.calls_stats[u][q].calls_taken;
              ret[u][q].last_call_time = data.calls_stats[u][q].last_call_time;
              ret[u][q].duration_incoming = data.calls_stats[u][q].duration_incoming;
              ret[u][q].max_duration_incoming = data.calls_stats[u][q].max_duration_incoming;
              ret[u][q].min_duration_incoming = data.calls_stats[u][q].min_duration_incoming;
              ret[u][q].avg_duration_incoming = data.calls_stats[u][q].avg_duration_incoming;
              ret[u].incomingCalls.duration_incoming += data.calls_stats[u][q].duration_incoming;
              ret[u].incomingCalls.avg_duration_incoming += data.calls_stats[u][q].avg_duration_incoming;
              ret[u].incomingCalls.min_duration_incoming = data.calls_stats[u][q].min_duration_incoming < ret[u].incomingCalls.min_duration_incoming ? data.calls_stats[u][q].min_duration_incoming : ret[u].incomingCalls.min_duration_incoming;
              ret[u].incomingCalls.max_duration_incoming = data.calls_stats[u][q].max_duration_incoming > ret[u].incomingCalls.max_duration_incoming ? data.calls_stats[u][q].max_duration_incoming : ret[u].incomingCalls.max_duration_incoming;
            }
            ret[u].incomingCalls.avg_duration_incoming = Math.floor(ret[u].incomingCalls.avg_duration_incoming / Object.keys(data.calls_stats[u]).length);
          }
          for (u in data.pause_unpause) {
            if (!ret[u]) {
              ret[u] = {};
            }
            for (q in data.pause_unpause[u]) {
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].last_paused_time = data.pause_unpause[u][q].last_paused_time;
              ret[u][q].last_unpaused_time = data.pause_unpause[u][q].last_unpaused_time;
            }
          }
          for (u in data.login_logout) {
            if (!ret[u]) {
              ret[u] = {};
            }
            for (q in data.login_logout[u]) {
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].last_login_time = data.login_logout[u][q].last_login_time;
              ret[u][q].last_logout_time = data.login_logout[u][q].last_logout_time;
            }
          }
          // missed calls
          for (u in data.calls_missed) {
            if (!ret[u]) {
              ret[u] = {};
            }
            for (q in data.calls_missed[u]) {
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].no_answer_calls = data.calls_missed[u][q].noanswercalls;
            }
          }
          // outgoing calls
          for (u in data.calls_outgoing) {
            if (!ret[u]) {
              ret[u] = {};
            }
            ret[u].outgoingCalls = data.calls_outgoing[u];
          }
          // pause durations
          var nowtime = Math.round(new Date().getTime() / 1000);
          for (u in data.pause_durations) {
            if (!ret[u]) {
              ret[u] = {};
            }
            for (q in data.pause_durations[u]){
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].time_in_pause = data.pause_durations[u][q];
              // check if the agent is currently in pause: in this case add
              // current time passed from the last pause
              if (members[u] && members[u][q] && members[u][q].isInPause === true) {
                ret[u][q].time_in_pause += nowtime - data.pause_unpause[u][q].last_paused_time;
              }
            }
          }
          // logon durations
          for (u in data.logon_durations) {
            if (!ret[u]) {
              ret[u] = {};
            }
            for (q in data.logon_durations[u]){
              if (!ret[u][q]) {
                ret[u][q] = {};
              }
              ret[u][q].time_in_logon = data.logon_durations[u][q];
              // check if the agent is currently logged-in: in this case add
              // current time passed from the last logon
              if (members[u] && members[u][q] && members[u][q].isLoggedIn === true) {
                ret[u][q].time_in_logon += nowtime - data.login_logout[u][q].last_login_time;
              }
              // pause percentage of logon time
              if (ret[u][q].time_in_pause && ret[u][q].time_in_logon) {
                var cp = (ret[u][q].time_in_pause * 100) / ret[u][q].time_in_logon;
                ret[u][q].pause_percent = Math.round(cp) > 0 ? Math.round(cp) : cp.toFixed(2);
              }
              // in conversation percentage of logon time
              if (ret[u][q].duration_incoming && ret[u][q].time_in_logon && ret[u][q].time_in_logon > ret[u][q].duration_incoming) {
                var cp = (ret[u][q].duration_incoming * 100) / ret[u][q].time_in_logon;
                ret[u][q].conversation_percent = Math.round(cp) > 0 ? Math.round(cp) : cp.toFixed(2);
              }
            }
          }
          // all calls: incoming & outgoing
          for (u in ret) {
            ret[u].allCalls = {};
            // total avg duration
            if (ret[u].incomingCalls && ret[u].incomingCalls.avg_duration_incoming && ret[u].outgoingCalls && ret[u].outgoingCalls.avg_duration_outgoing) {
              ret[u].allCalls.avg_duration = Math.floor((ret[u].incomingCalls.avg_duration_incoming + ret[u].outgoingCalls.avg_duration_outgoing) / 2);
            } else if (ret[u].incomingCalls && ret[u].incomingCalls.avg_duration_incoming) {
              ret[u].allCalls.avg_duration = ret[u].incomingCalls.avg_duration_incoming;
            } else if (ret[u].outgoingCalls && ret[u].outgoingCalls.avg_duration_outgoing) {
              ret[u].allCalls.avg_duration = ret[u].outgoingCalls.avg_duration_outgoing;
            }
            // total min duration
            if (ret[u].incomingCalls && ret[u].incomingCalls.min_duration_incoming && ret[u].outgoingCalls && ret[u].outgoingCalls.min_duration_outgoing) {
              ret[u].allCalls.min_duration = ret[u].incomingCalls.min_duration_incoming < ret[u].outgoingCalls.min_duration_outgoing ? ret[u].incomingCalls.min_duration_incoming : ret[u].outgoingCalls.min_duration_outgoing;
            } else if (ret[u].incomingCalls && ret[u].incomingCalls.min_duration_incoming) {
              ret[u].allCalls.min_duration = ret[u].incomingCalls.min_duration_incoming;
            } else if (ret[u].outgoingCalls && ret[u].outgoingCalls.min_duration_outgoing) {
              ret[u].allCalls.min_duration = ret[u].outgoingCalls.min_duration_outgoing;
            }
            // total max duration
            if (ret[u].incomingCalls && ret[u].incomingCalls.max_duration_incoming && ret[u].outgoingCalls && ret[u].outgoingCalls.max_duration_outgoing) {
              ret[u].allCalls.max_duration = ret[u].incomingCalls.max_duration_incoming > ret[u].outgoingCalls.max_duration_outgoing ? ret[u].incomingCalls.max_duration_incoming : ret[u].outgoingCalls.max_duration_outgoing;
            } else if (ret[u].incomingCalls && ret[u].incomingCalls.max_duration_incoming) {
              ret[u].allCalls.max_duration = ret[u].incomingCalls.max_duration_incoming;
            } else if (ret[u].outgoingCalls && ret[u].outgoingCalls.max_duration_outgoing) {
              ret[u].allCalls.max_duration = ret[u].outgoingCalls.max_duration_outgoing;
            }
          }
          if (CACHE_ENABLED) {
            cache.getAgentsStatsByList = ret;
            cacheTimestamps.getAgentsStatsByList = new Date().getTime();
          }
          cb(null, ret);
        }
      } catch (err1) {
        logger.log.error(IDLOG, err1.stack);
        cb(err1);
      }
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Deletes a call recording from the database. It updates the entry of the specified call emptying
 * the content of the _recordingfile_ field of the _asteriskcdrdb.cdr_ database table.
 *
 * @method deleteCallRecording
 * @param {string}   uniqueid The database identifier of the call
 * @param {function} cb       The callback function
 */
function deleteCallRecording(uniqueid, cb) {
  try {
    // check parameters
    if (typeof uniqueid !== 'string' || typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    // search
    compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].find({
      where: ['uniqueid=?', uniqueid]

    }).then(function (task) {
      try {

        if (task) {

          // empty the content of the "recordingfile" field
          task.updateAttributes({
            recordingfile: ''
          }, ['recordingfile']).then(function () {

            logger.log.info(IDLOG, '"recordingfile" field of the call with uniqueid "' + uniqueid + '" has been emptied successfully from asteriskcdrdb.cdr table');
            cb();
          });

        } else {
          var str = 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: entry not found';
          logger.log.warn(IDLOG, str);
          cb(str);
        }

      } catch (error) {
        logger.log.error(IDLOG, error.stack);
        cb(error);
      }

    }, function (err) { // manage the error

      logger.log.error(IDLOG, 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: not found: ' + err.toString());
      cb(err.toString());
    });

    compDbconnMain.incNumExecQueries();

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Returns the data about the call recording audio file as an object, or
 * a false value if no data has been found.
 *
 * @method getCallRecordingFileData
 * @param {string}   uniqueid The call identifier in the database
 * @param {function} cb       The callback function
 */
function getCallRecordingFileData(uniqueid, cb) {
  try {
    // check parameters
    if (typeof cb !== 'function' || typeof uniqueid !== 'string') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }

    // search
    compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].find({
      where: [
        'uniqueid=? AND recordingfile!=""', uniqueid
      ],
      attributes: [
        ['DATE_FORMAT(calldate, "%Y")', 'year'],
        ['DATE_FORMAT(calldate, "%m")', 'month'],
        ['DATE_FORMAT(calldate, "%d")', 'day'],
        ['recordingfile', 'filename']
      ]

    }).then(function (result) {
      // extract result to return in the callback function
      if (result) {
        logger.log.info(IDLOG, 'found data information about recording call with uniqueid ' + uniqueid);
        cb(null, result.dataValues);

      } else {
        logger.log.info(IDLOG, 'no data information about recording call with uniqueid ' + uniqueid);
        cb(null, false);
      }
    }, function (err) { // manage the error
      logger.log.error(IDLOG, 'getting data information about recording call with uniqueid ' + uniqueid);
      cb(err.toString());
    });

    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err.toString());
  }
}

/**
 * Get pin of extensions.
 *
 * @method getPinExtens
 * @param {array} extens The extension list
 * @param {function} cb The callback
 */
function getPinExtens(extens, cb) {
  try {
    if (!Array.isArray(extens) || typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    compDbconnMain.models[compDbconnMain.JSON_KEYS.PIN].findAll({
      where: [
        'extension IN ("' + extens.join('","') + '")'
      ],
      attributes: [ 'extension', 'pin', 'enabled' ]
    }).then(function (results) {
      let retval = {};
      if (results && results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          retval[results[i].dataValues.extension] = results[i].dataValues;
          retval[results[i].dataValues.extension].enabled = retval[results[i].dataValues.extension].enabled === 1;
        }
        logger.log.info(IDLOG, 'found pin of extens ' + extens);
        cb(null, retval);
      } else {
        logger.log.info(IDLOG, `no pin found for extens ${extens}`);
        cb(null, []);
      }
    }, function (err) {
      logger.log.error(IDLOG, 'getting pin of extens ' + extens.toString());
      logger.log.error(IDLOG, err);
      cb(err);
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Set pin for the extension.
 *
 * @method setPinExten
 * @param {string} extension The extension identifier
 * @param {string} pin The pin number to be set
 * @param {boolean} enabled True if the pin has to be enabled on the phone
 * @param {function} cb The callback
 * @private
 */
function setPinExten(extension, pin, enabled, cb) {
  try {
    if (typeof extension !== 'string' || typeof pin !== 'string' || typeof enabled !== 'boolean' || typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    compDbconnMain.models[compDbconnMain.JSON_KEYS.PIN].upsert({
      extension: extension,
      pin: pin,
      enabled: enabled
    }).then(function(result) {
      logger.log.info(IDLOG, `set pin ${pin} for exten ${extension} with status enabled "${enabled}"`);
      cb();
    }, function(err) {
      logger.log.error(IDLOG, `setting pin ${pin} for exten ${extension} with status enabled "${enabled}"`);
      logger.log.error(IDLOG, err);
      cb(err);
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Return true if the PIN has been enabled on at least one outbound route.
 *
 * @method isPinEnabledAtLeastOneRoute
 * @param {function} cb The callback function
 */
function isPinEnabledAtLeastOneRoute(cb) {
  try {
    if (typeof cb !== 'function') {
      throw new Error('wrong parameters: ' + JSON.stringify(arguments));
    }
    compDbconnMain.models[compDbconnMain.JSON_KEYS.PIN_PROTECTED_ROUTES].count({
      where: ['enabled=1']
    }).then(function (result) {
      cb(null, result > 0 ? true : false);
    }, function (error) {
      logger.log.error(IDLOG, 'getting pin activation status');
      cb(error.toString());
    });
    compDbconnMain.incNumExecQueries();
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    cb(err);
  }
}

apiList.setPinExten = setPinExten;
apiList.getPinExtens = getPinExtens;
apiList.getCallInfo = getCallInfo;
apiList.getCallTrace = getCallTrace;
apiList.getQueueStats = getQueueStats;
apiList.getQueueRecall = getQueueRecall;
apiList.getQueueRecallInfo = getQueueRecallInfo;
apiList.getFpbxAdminSha1Pwd = getFpbxAdminSha1Pwd;
apiList.deleteCallRecording = deleteCallRecording;
apiList.getAgentsStatsByList = getAgentsStatsByList;
apiList.getCallRecordingFileData = getCallRecordingFileData;
apiList.getQCallsStatsHist = getQCallsStatsHist;
apiList.isPinEnabledAtLeastOneRoute = isPinEnabledAtLeastOneRoute;
// public interface
exports.apiList = apiList;
exports.setLogger = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;

