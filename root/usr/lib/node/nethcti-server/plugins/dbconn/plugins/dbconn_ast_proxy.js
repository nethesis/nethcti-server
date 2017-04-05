/**
* Provides database functions.
*
* @module dbconn
* @submodule plugins
*/
var async = require('async');

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
* Set the main dbconn architect component.
*
* @method setCompDbconnMain
* @param {object} comp The architect main dbconn component
* @static
*/
function setCompDbconnMain(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compDbconnMain = comp;
        logger.log(IDLOG, 'main dbconn component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        if (    typeof uniqueid   !== 'string' || typeof cb  !== 'function'
            || (typeof privacyStr !== 'string' && privacyStr !== undefined) ) {

            throw new Error('wrong parameters');
        }

        var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

        // if the privacy string is present, than hide the numbers
        if (privacyStr) {
            // the numbers are hidden
            attributes.push([  'CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten'       ]);
            attributes.push([  'CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode' ]);
            var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
            attributes.push([ 'concat(cid_name, " ", ' + cidNumHidden + ')', 'cid' ]);

        } else {
            // the numbers are clear
            attributes.push('exten');
            attributes.push('accountcode');
            attributes.push([ 'concat(cid_name, " ", cid_num)', 'cid' ]);
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

            logger.info(IDLOG, results.length + ' results searching CEL on uniqueid "' + uniqueid + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching CEL on uniqueid "' + uniqueid + '"');
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get answered calls statistics by hold time
*
* @method getQueuesQOS
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getQueuesQOS(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null)) {

            throw new Error('wrong parameters');
        }

        async.parallel({
            stats : function (callback) {
                compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
                    where: ['event in ("COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                    ],
                    attributes: [
                        'agent',
                        [ 'DATE_FORMAT(time,"%d-%m-%Y")', 'period' ],
                        'queuename',
                        [ 'count(id)', 'calls' ],
                        [ 'sum(cast(data2 as unsigned))', 'tot_duration' ],
                        [ 'max(cast(data2 as unsigned))', 'max_duration' ],
                        [ 'min(cast(data2 as unsigned))', 'min_duration' ],
                        [ 'avg(cast(data2 as unsigned))', 'avg_duration' ] ],
                    group: ['agent', 'queuename'],
                    order: ['agent', 'queuename']

                }).success(function (results) {
                    if (results) {
                        logger.info(IDLOG, 'get queues answered qos has been successful');
                        callback(null, results);
                    } else {
                        logger.info(IDLOG, 'get queues answered qos: not found');
                        callback(null, {});
                    }

                }).error(function (err1) { // manage the error
                    logger.error(IDLOG, 'get queues answered qos: ' + err1.toString());
                    callback(err1, {});
                });
            },
            noanswer : function(callback) {
                 compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
                    where: ['event = "RINGNOANSWER"'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                    ],
                    attributes: [
                        'agent',
                        'queuename',
                        [ 'count(id)', 'calls' ]
                    ],
                    group: ['agent', 'queuename'],
                    order: ['agent', 'queuename']
                }).success(function (results) {
                    if (results) {
                        logger.info(IDLOG, 'get ring no answered queues qos has been successful');
                        var res = {};

                        for (var i in results) {
                            if (!(results[i].agent in res))
                                res[results[i].agent] = {};

                            res[results[i].agent][results[i].queuename] = results[i].calls;
                        }

                        callback(null, res);
                    } else {
                        logger.info(IDLOG, 'get ring no answered queues qos: not found');
                        callback(null, {});
                    }
                }).error(function (err1) { // manage the error
                    logger.error(IDLOG, 'get ring no answered queues qos: ' + err1.toString());
                    callback(err1, {});
                });
            },
            last_call : function(callback) {
                compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
                    where: ['event = "CONNECT"'],
                    attributes: [
                        'agent',
                        'queuename',
                        //FIXME: if named different than 'calls' it does not value it!
                        [ 'max(time)', 'calls' ]
                    ],
                    group: ['agent', 'queuename'],
                    order: ['agent', 'queuename']
                }).success(function(results) {
                    if (results) {
                        logger.info(IDLOG, 'get last call time queues qos has been successful');
                        var res = {};

                        for (var i in results) {
                            if (!(results[i].agent in res))
                                res[results[i].agent] = {};

                            res[results[i].agent][results[i].queuename] = results[i].calls;
                        }

                        callback(null, res);
                    } else {
                        logger.error(IDLOG, 'get last call time queues qos: not found');
                        callback(null, {});
                    }
                }).error(function (err1) { // manage the error
                    logger.info(IDLOG, 'get last call time queues qos: ' + err1.toString());
                    callback(err1, {});
                });
            }
        }, function(err, results) {
            var res = [];

            for (var i in results.stats) {
                var values = {};
                for (var z in results.stats[i].dataValues)
                    values[z] = results.stats[i].dataValues[z]

                res.push(values);
            }

            for (var i in res) {
                if ('noanswer' in results &&
                  res[i].agent in results.noanswer &&
                  res[i].queuename in results.noanswer[res[i].agent])
                    res[i].ringnoanswers = results.noanswer[res[i].agent][res[i].queuename];

                if ('last_call' in results &&
                  res[i].agent in results.last_call &&
                  res[i].queuename in results.last_call[res[i].agent])
                    res[i].last_call = results.last_call[res[i].agent][res[i].queuename];
            }

            cb(null, res);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the details about caller id from queue_recall db table.
*
* @method getQueueRecallInfo
* @param {object}   data
*   @param {string} data.type The type of search ("hours" || "day")
*   @param {string} data.val  The value of the interval time to be searched
*   @param {string} data.cid  The caller identifier
* @param {function} cb  The callback function
*/
function getQueueRecallInfo(data, cb) {
    try {
        // check parameters
        if (typeof data     !== 'object'   ||
            typeof cb       !== 'function' ||
            typeof data.val !== 'string'   ||
            typeof data.cid !== 'string'   ||
            (data.type !== 'hours' && data.type !== 'day')) {

            throw new Error('wrong parameters');
        }

        var query = [
            'SELECT queuename, ',
                   'direction, ',
                   'action, ',
                   'CAST(time as CHAR(50)) as time, ',
                   'position, ',
                   'duration, ',
                   'hold, ',
                   'cid, ',
                   'agent ',
            'FROM ', getQueueRecallQueryTable(data.type, data.val), ' ',
            'WHERE cid="', data.cid, '"'
        ].join('');

        compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).success(function (results) {
            logger.info(IDLOG, results.length + ' results searching details about queue recall on cid "' + data.cid + '"');
            cb(null, results);

        }).error(function (err1) {
            logger.error(IDLOG, 'searching details about queue recall on cid "' + data.cid + '"');
            cb(err.toString(), {});
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the query that returns the entries corresponding to queue recalls table.
*
* @method getQueueRecallQueryTable
* @param  {string} type The type of search ("hours" || "day")
* @param  {string} val  The value of the interval time to be searched
* @return {string} The query to obtain the entries about queue recall table
* @private
*/
function getQueueRecallQueryTable(type, val) {
    try {
        // check parameters
        if (typeof val !== 'string' ||
            (type !== 'hours' && type !== 'day')) {

            throw new Error('wrong parameters');
        }

        var timeConditionQl,  // time condition on queue_log
            timeConditionCdr; // time condition on cdr

        if (type === 'hours') {
            timeConditionQl  = 'TIMESTAMPDIFF(HOUR, time, now()) < '     + val;
            timeConditionCdr = 'TIMESTAMPDIFF(HOUR, calldate, now()) < ' + val;
        }
        else {
            timeConditionQl  = 'DATE(time) = "'     + val + '"';
            timeConditionCdr = 'DATE(calldate) = "' + val + '"';
        }

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
                           'SELECT data2 ',
                           'FROM   queue_log z ',
                           'WHERE  z.event="ENTERQUEUE" AND z.callid=a.callid',
                     ' ) AS cid,',
                     ' agent ',
               'FROM   queue_log a ',
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
                           'SELECT data2 ',
                           'FROM   queue_log z ',
                           'WHERE  z.event="ENTERQUEUE"',
                                 ' AND z.callid=a.callid',
                     ' ) AS cid,',
                     ' agent ',
               'FROM   queue_log a ',
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
                     ' src AS agent ',
               'FROM   cdr c ',
               'INNER JOIN queue_log l ON c.dst=l.data2 ',
               'WHERE  l.event="ENTERQUEUE" ',
                     ' AND ', timeConditionCdr,
                     ' AND ', timeConditionQl,

         ' ORDER BY time DESC',

         ') queue_recall'

        ].join('');

        return query;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Gets the last calls from queue_recall db table basing the search
* into the last X hours or a specific day in YYYYMMDD format.
*
* @method getQueueRecall
* @param {object}   data
*   @param {string} data.type The type of search ("hours" || "day")
*   @param {string} data.val  The value of the interval time to be searched (or X hours or YYYYMMDD specific day)
*   @param {string} data.qid  The queue identifier
* @param {function} cb        The callback function
*/
function getQueueRecall(data, cb) {
    try {
        // check parameters
        if (typeof data     !== 'object'   ||
            typeof cb       !== 'function' ||
            typeof data.val !== 'string'   ||
            typeof data.qid !== 'string'   ||
            (data.type !== 'hours' && data.type !== 'day')) {

            throw new Error('wrong parameters');
        }

        var query = [
            'SELECT b.company,',
                  ' b.name,',
                  ' cid,',
                  ' action,',
                  ' CAST(time as CHAR(50)) as time,',
                  ' direction,',
                  ' queuename ',
            'FROM ', getQueueRecallQueryTable(data.type, data.val), ' ',
            'LEFT JOIN phonebook.phonebook b ON (queue_recall.cid=b.workphone OR queue_recall.cid=b.cellphone) ',
            'WHERE queuename="' + data.qid + '" ',
            'GROUP BY cid ',
            'ORDER BY time DESC;'
        ].join('');

        compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query).success(function (results) {
            logger.info(IDLOG, 'get queue ' + data.qid + ' recall of last ' + data.hours +
                               ' hours has been successful: ' + results.length + ' results');
            cb(null, results);

        }).error(function (err1) {
            logger.error(IDLOG, 'get queue ' + data.qid + ' recall of last ' + data.hours + ' hours: ' + err1.toString());
            cb(err1, {});
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
        if (    typeof linkedid   !== 'string' || typeof cb  !== 'function'
            || (typeof privacyStr !== 'string' && privacyStr !== undefined) ) {

            throw new Error('wrong parameters');
        }

        var attributes = ['eventtype', 'eventtime', 'context', 'channame'];

        // if the privacy string is present, than hide the numbers
        if (privacyStr) {
            // the numbers are hidden
            attributes.push([  'CONCAT( SUBSTRING(exten,       1, LENGTH(exten)       - ' + privacyStr.length + '), "' + privacyStr + '")', 'exten'       ]);
            attributes.push([  'CONCAT( SUBSTRING(accountcode, 1, LENGTH(accountcode) - ' + privacyStr.length + '), "' + privacyStr + '")', 'accountcode' ]);
            var cidNumHidden = 'CONCAT( SUBSTRING(cid_num,     1, LENGTH(cid_num)     - ' + privacyStr.length + '), "' + privacyStr + '")';
            attributes.push([ 'concat(cid_name, " ", ' + cidNumHidden + ')', 'cid' ]);

        } else {
            // the numbers are clear
            attributes.push('exten');
            attributes.push('accountcode');
            attributes.push([ 'concat(cid_name, " ", cid_num)', 'cid' ]);
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

            logger.info(IDLOG, results.length + ' results searching CEL on linkedid "' + linkedid + '"');
            cb(null, results);

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'searching CEL on linkedid "' + linkedid + '"');
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets statistics about queues.
*
* @method getQueuesStats
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getQueuesStats(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null)) {

            throw new Error('wrong parameters');
        }

        async.parallel({
            general: function (callback) {
                compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
                    where: [
                        'event in ("ABANDON","EXITWITHTIMEOUT","COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                        + ' GROUP BY queuename, action, hold'
                    ],
                    attributes: [
                        'id', 'queuename',
                        [ 'IF(event = "COMPLETEAGENT", "ANSWER",'
                            + ' IF(event = "COMPLETECALLER", "ANSWER",'
                            + ' IF(event = "EXITWITHTIMEOUT", "TIMEOUT", event)))',
                            'action' ],
                        [ 'IF(event = "ABANDON", IF(cast(data3 as unsigned) <= 50, "nulled", "failed"), cast(data1 as unsigned))', 'hold' ],
                        [ 'count(id)', 'calls' ]],
                    order: ['queuename', 'action', 'hold']

                }).success(function (results) {

                    if (results) {
                        logger.info(IDLOG, 'get extended queues statistics has been successful');

                        var stats = {};

                        for (var i in results) {
                            if (!(results[i].queuename in stats)) {
                                stats[results[i].queuename] = {
                                    'ANSWER' : {},
                                    'ABANDON' : {},
                                    'TIMEOUT' : 0
                                };
                            }

                            switch (results[i].action) {
                                case 'ANSWER':
                                case 'ABANDON':
                                    stats[results[i].queuename][results[i].action]
                                        [results[i].hold] = results[i].calls;
                                    break;
                                default:
                                    stats[results[i].queuename][results[i].action]
                                        = results[i].calls;
                            }

                        }

                        callback(null, stats);
                    }
                });
            },
            answer : function (callback) {
                compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].findAll({
                    where: [
                        'event in ("COMPLETEAGENT","COMPLETECALLER")'
                        + ' AND DATE_FORMAT(time,"%Y%m%d") = \'' + day + '\''
                        + ' GROUP BY queuename'
                    ],
                    attributes: [
                        'queuename',
                        [ 'count(id)', 'calls' ],
                        [ 'max(cast(data1 as unsigned))', 'max_hold' ],
                        [ 'min(cast(data1 as unsigned))', 'min_hold' ],
                        [ 'avg(cast(data1 as unsigned))', 'avg_hold' ],
                        [ 'max(cast(data2 as unsigned))', 'max_duration' ],
                        [ 'min(cast(data2 as unsigned))', 'min_duration' ],
                        [ 'avg(cast(data2 as unsigned))', 'avg_duration' ]],
                    order: ['queuename']

                }).success(function (results) {

                    if (results) {
                        logger.info(IDLOG, 'get extended queues statistics has been successful');

                        var stats = {};

                        for (var i in results) {
                            if (!(results[i].queuename in stats)) {
                                stats[results[i].queuename] = results[i];
                            }
                        }

                        callback(null, stats);

                    } else {
                        logger.info(IDLOG, 'get extended queues statistics: not found');
                        cb(null, {});
                    }
                });
            }
        }, function(err, results) {
            cb(null, results);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Get agent statistics about work times
*
* @method getAgentsStats
* @param {string}   day The query date (YYYYMMDD)
* @param {function} cb  The callback function
*/
function getAgentsStats(day, cb) {
    try {
        // check parameters
        if (typeof cb !== 'function'
            || typeof day !== 'string'
            || (typeof day === 'string' && day.match(/\d{8}/) === null))
            throw new Error('wrong parameters');

        var query = 'SELECT'
                    + ' a.agent AS agent'
                    + ', a.queuename AS queue'
                    + ', DATE_FORMAT(a.time, "%k:%i:%s") AS time_in'
                    + ', DATE_FORMAT(MIN(b.time), "%k:%i:%s") AS time_out'
                    + ', UNIX_TIMESTAMP(MIN(b.time))-UNIX_TIMESTAMP(a.time) AS secs'
                    + ', a.data1 AS reason'
                    + ' FROM asteriskcdrdb.queue_log a'
                    + ' LEFT JOIN asteriskcdrdb.queue_log b'
                    + ' ON b.agent = a.agent'
                        + ' AND b.queuename = a.queuename'
                        + ' AND b.time > a.time'
                        + ' AND $JOINS'
                    + ' WHERE $BINDS'
                    + ' AND DATE_FORMAT(a.time,"%Y%m%d") = \'' + day + '\''
                    + ' GROUP BY agent, queue, a.time';

        // Group results by agent
        var __group = function (rows) {
            var rows_grouped = {};

            for (var i in rows) {
                if (!(rows[i].agent in rows_grouped)) {
                    rows_grouped[rows[i].agent] = {};
                }

                if (!(rows[i].queue in rows_grouped[rows[i].agent])) {
                    rows_grouped[rows[i].agent][rows[i].queue] = [];
                }

                var agent = rows[i].agent;
                var queue = rows[i].queue;

                delete rows[i].agent;
                delete rows[i].queue;

                rows_grouped[agent][queue].push(rows[i]);
            }

            return rows_grouped;
        }

        // Launch agents queries
        async.parallel({
            pause_unpause : function (callback) {
                var binds = "a.event = 'PAUSE' AND a.callid = 'QUEUE_REPORT'";
                var joins = "b.event = 'UNPAUSE' AND b.callid = 'QUEUE_REPORT'";
                compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });
            },
            join_leave_queue : function (callback) {
                var binds = "a.event = 'ADDMEMBER' AND a.callid = 'QUEUE_REPORT'";
                var joins = "b.event = 'REMOVEMEMBER' AND b.callid = 'QUEUE_REPORT'";
                compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });
            },
            logon_logoff : function (callback) {
                var binds = "a.event = 'AGENTLOGIN'";
                var joins = "b.event = 'AGENTLOGOFF'";
                compDbconnMain.dbConn[compDbconnMain.JSON_KEYS.QUEUE_LOG].query(query.replace(/\$BINDS/g, binds)
                    .replace(/\$JOINS/g, joins))
                    .success(function (rows) {
                        callback(null, __group(rows));
                });

            }
        }, function(err, results) {
            var inqueue_outqueue = results.join_leave_queue;

            for (var i in results.logon_logoff) {
                if (!(i in inqueue_outqueue))
                   inqueue_outqueue[i] = {};

                inqueue_outqueue[i].push(results.logon_logoff[i]);
            }

            results['inqueue_outqueue'] = results.join_leave_queue;

            cb(null, results);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
            throw new Error('wrong parameters');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].find({
            where: [ 'uniqueid=?', uniqueid  ]

        }).success(function (task) {
            try {

                if (task) {

                    // empty the content of the "recordingfile" field
                    task.updateAttributes({ recordingfile: '' }, [ 'recordingfile' ]).success(function () {

                        logger.info(IDLOG, '"recordingfile" field of the call with uniqueid "' + uniqueid + '" has been emptied successfully from asteriskcdrdb.cdr table');
                        cb();
                    });

                } else {
                    var str = 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: entry not found';
                    logger.warn(IDLOG, str);
                    cb(str);
                }

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }

        }).error(function (err) { // manage the error

            logger.error(IDLOG, 'emptying "recordingfile" of the call with uniqueid "' + uniqueid + '" from asteriskcdrdb.cdr table: not found: ' + err.toString());
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
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
            throw new Error('wrong parameters');
        }

        // search
        compDbconnMain.models[compDbconnMain.JSON_KEYS.HISTORY_CALL].find({
            where: [
                'uniqueid=? AND recordingfile!=""', uniqueid
            ],
            attributes: [
                [ 'DATE_FORMAT(calldate, "%Y")', 'year'  ],
                [ 'DATE_FORMAT(calldate, "%m")', 'month' ],
                [ 'DATE_FORMAT(calldate, "%d")', 'day'   ],
                [ 'recordingfile', 'filename'            ]
            ]

        }).then(function (result) {
            // extract result to return in the callback function
            if (result) {
                logger.info(IDLOG, 'found data informations about recording call with uniqueid ' + uniqueid);
                cb(null, result.dataValues);

            } else {
                logger.info(IDLOG, 'no data informations about recording call with uniqueid ' + uniqueid);
                cb(null, false);
            }
        }, function (err) { // manage the error
            logger.error(IDLOG, 'getting data informations about recording call with uniqueid ' + uniqueid);
            cb(err.toString());
        });

        compDbconnMain.incNumExecQueries();
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Gets the data of the more recent started pause of the queue member in the specified
* queue. It searches the results into the _asteriskcdrdb.queue\_log_ database. If the
* queue member has never started a pause, the data values isn't present in the database.
* So, in this case, the method returns some null values.
*
* @method getQueueMemberLastPausedInData
* @param {string}   memberName The queue member name
* @param {string}   queueId    The queue identifier
* @param {string}   memberId   The queue member identifier
* @param {function} cb         The callback function
*/
function getQueueMemberLastPausedInData(memberName, queueId, memberId, cb) {
    try {
        // check parameters
        if (   typeof cb         !== 'function' || typeof memberId !== 'string'
            || typeof memberName !== 'string'   || typeof queueId  !== 'string') {

            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].find({
            where: [
                'agent=? ' +
                'AND queuename=? ' +
                'AND event=? ' +
                'ORDER BY time DESC',
                memberName, queueId, 'PAUSE'
            ],
            attributes: [
                [ 'time',  'timestamp' ],
                [ 'data1', 'reason'    ]
            ]

        }).success(function (result) {

            if (result && result.selectedValues) {

                logger.info(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '" has been successful');

                // if the queue member has never started a pause, the timestamp isn't present in the database. So check its presence
                if (result.selectedValues.timestamp) {
                    result.selectedValues.timestamp = new Date(result.selectedValues.timestamp).getTime();
                }

                // add received parameters used by the callback
                result.selectedValues.queueId  = queueId;
                result.selectedValues.memberId = memberId;

                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'get last "paused in" data of member "' + memberName + '" of the queue "' + queueId + '" failed: ' + err1.toString());
            cb(err1);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

/**
* Gets the data of the more recent ended pause of the queue member in the specified
* queue. It searches the results into the _asteriskcdrdb.queue\_log_ database. If the
* queue member has never ended a pause, the data values isn't present in the database.
* So, in this case, the method returns some null values.
*
* @method getQueueMemberLastPausedOutData
* @param {string}   memberName The queue member name
* @param {string}   queueId    The queue identifier
* @param {string}   memberId   The queue member identifier
* @param {function} cb         The callback function
*/
function getQueueMemberLastPausedOutData(memberName, queueId, memberId, cb) {
    try {
        // check parameters
        if (   typeof cb         !== 'function' || typeof memberId !== 'string'
            || typeof memberName !== 'string'   || typeof queueId  !== 'string') {

            throw new Error('wrong parameters');
        }

        compDbconnMain.models[compDbconnMain.JSON_KEYS.QUEUE_LOG].find({
            where: [
                'agent=? ' +
                'AND queuename=? ' +
                'AND event=? ' +
                'ORDER BY time DESC',
                memberName, queueId, 'UNPAUSE'
            ],
            attributes: [ [ 'time',  'timestamp' ] ]

        }).success(function (result) {

            if (result && result.selectedValues) {

                logger.info(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '" has been successful');

                // if the queue member has never ended a pause, the timestamp isn't present in the database. So check its presence
                if (result.selectedValues.timestamp) {
                    result.selectedValues.timestamp = new Date(result.selectedValues.timestamp).getTime();
                }

                // add received parameters used by the callback
                result.selectedValues.queueId  = queueId;
                result.selectedValues.memberId = memberId;

                cb(null, result.selectedValues);

            } else {
                logger.info(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '": not found');
                cb(null, {});
            }

        }).error(function (err1) { // manage the error

            logger.error(IDLOG, 'get last "paused out" data of member "' + memberName + '" of the queue "' + queueId + '" failed: ' + err1.toString());
            cb(err1);
        });

        compDbconnMain.incNumExecQueries();

    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err);
    }
}

apiList.getCallInfo                     = getCallInfo;
apiList.getQueuesQOS                    = getQueuesQOS;
apiList.getCallTrace                    = getCallTrace
apiList.getQueuesStats                  = getQueuesStats;
apiList.getAgentsStats                  = getAgentsStats;
apiList.getQueueRecall                  = getQueueRecall;
apiList.getQueueRecallInfo              = getQueueRecallInfo;
apiList.deleteCallRecording             = deleteCallRecording;
apiList.getCallRecordingFileData        = getCallRecordingFileData;
apiList.getQueueMemberLastPausedInData  = getQueueMemberLastPausedInData;
apiList.getQueueMemberLastPausedOutData = getQueueMemberLastPausedOutData;

// public interface
exports.apiList           = apiList;
exports.setLogger         = setLogger;
exports.setCompDbconnMain = setCompDbconnMain;
