/**
 * Provides configuration manager functions through REST API.
 *
 * @module com_profiling_rest
 * @submodule plugins_rest
 */
var moment = require('moment');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins_rest/profiling]
 */
var IDLOG = '[plugins_rest/profiling]';

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
 * The profiling architect component.
 *
 * @property compProfiling
 * @type object
 * @private
 */
var compProfiling;

/**
 * The configuration architect component.
 *
 * @property compConfigManager
 * @type object
 * @private
 */
var compConfigManager;

/**
 * The database architect component.
 *
 * @property compDbConn
 * @type object
 * @private
 */
var compDbConn;

/**
 * The utility architect component.
 *
 * @property compUtil
 * @type object
 * @private
 */
var compUtil;

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object. It must have at least three methods: _info, warn and error_ as console object.
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
 * Sets the profiling architect component.
 *
 * @method setCompProfiling
 * @param {object} comp The profiling architect component.
 */
function setCompProfiling(comp) {
  try {
    compProfiling = comp;
    logger.log.info(IDLOG, 'set profiling architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the database architect component.
 *
 * @method setCompDbConn
 * @param {object} comp The database architect component.
 */
function setCompDbConn(comp) {
  try {
    compDbConn = comp;
    logger.log.info(IDLOG, 'set database architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the configuration architect component.
 *
 * @method setCompConfigManager
 * @param {object} comp The configuration architect component.
 */
function setCompConfigManager(comp) {
  try {
    compConfigManager = comp;
    logger.log.info(IDLOG, 'set configuration architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

/**
 * Sets the utility architect component.
 *
 * @method setCompUtil
 * @param {object} comp The utility architect component.
 */
function setCompUtil(comp) {
  try {
    compUtil = comp;
    logger.log.info(IDLOG, 'set util architect component');
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
}

(function () {
  try {
    /**
        * REST plugin that provides profiling functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`profiling/proc`](#procget)
        * 1. [`profiling/pkg_ver`](#pkg_verget)
        * 1. [`profiling/node_ver`](#node_verget)
        * 1. [`profiling/proc_mem`](#proc_memget)
        * 1. [`profiling/db_stats`](#db_statsget)
        * 1. [`profiling/log_stats`](#log_statsget)
        * 1. [`profiling/tot_users`](#tot_usersget)
        * 1. [`profiling/conn_clients`](#conn_clientsget)
        *
        *
        * ---
        *
        * ### <a id="procget">**`profiling/proc`**</a>
        *
        * Returns the data about the process.
        *
        * Example JSON response:
        *
        *     {
         "pid": 23511,
         "uptime": "0 Days - 00:00:04",
         "pkg_ver": {
             "nethcti3": "nethcti3-3.0.5-1.ns7.noarch",
             "nethcti-server3": "nethcti-server3-3.0.4-1.ns7.x86_64",
             "janus-gateway": "janus-gateway-0.2.5-1.ns7.x86_64",
             "nethserver-nethvoice14": "nethserver-nethvoice14-14.0.9-1.ns7.noarch"
         },
         "proc_mem": {
             "rss": 96485376,
             "heapTotal": 77611008,
             "heapUsed": 55147992,
             "external": 2382791
         },
         "db_stats": {
             "numExecQueries": 7
         },
         "log_stats": {
             "warn": 5,
             "error": 0
         },
         "tot_users": 7,
         "conn_clients": {
             "ws_conn_clients": 1,
             "tcp_conn_clients": 0
         }
     }
        *
        * ---
        *
        * ### <a id="pkg_verget">**`profiling/pkg_ver`**</a>
        *
        * Returns the package software version.
        *
        * Example JSON response:
        *
        *     {
          "nethcti3": "nethcti3-3.0.5-1.ns7.noarch",
         "nethcti-server3": "nethcti-server3-3.0.4-1.ns7.x86_64",
         "janus-gateway": "janus-gateway-0.2.5-1.ns7.x86_64",
         "nethserver-nethvoice14": "nethserver-nethvoice14-14.0.9-1.ns7.noarch"
     }
        *
        * ---
        *
        * ### <a id="node_verget">**`profiling/node_ver`**</a>
        *
        * Returns the node version.
        *
        * Example JSON response:
        *
        *     { "node_ver": "v6.12.10" }
        *
        * ---
        *
        * ### <a id="proc_memget">**`profiling/proc_mem`**</a>
        *
        * Returns the quantity of the memory used by the process in byte.
        *
        * Example JSON response:
        *
        *     {
         "rss": 66650112,
         "heapTotal": 43016192,
         "heapUsed": 36679920,
         "external": 4317024
     }
        *
        * ---
        *
        * ### <a id="tot_usersget">**`profiling/tot_users`**</a>
        *
        * Returns the total number of the configured users.
        *
        * Example JSON response:
        *
        *     { tot_users: 15 }
        *
        * ---
        *
        * ### <a id="conn_clientsget">**`profiling/conn_clients`**</a>
        *
        * Returns the number of connected clients.
        *
        * Example JSON response:
        *
        *     { ws_conn_clients: 4, tcp_conn_clients: 2 }
        *
        * ---
        *
        * ### <a id="db_statsget">**`profiling/db_stats`**</a>
        *
        * Returns the database statistics.
        *
        * Example JSON response:
        *
        *     { num_exec_queries: 151 }
        *
        * ---
        *
        * ### <a id="log_statsget">**`profiling/log_stats`**</a>
        *
        * Returns the log statistics.
        *
        * Example JSON response:
        *
        *     { warn: 5, error: 0 }
        *
        * @class plugin_rest_profiling
        * @static
        */
    var profiling = {

      // the REST api
      api: {
        'root': 'profiling',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property get
         * @type {array}
         *
         *   @param {string} proc         To get the data about the process
         *   @param {string} pkg_ver      To get version of the packages
         *   @param {string} node_ver     To get version of the node
         *   @param {string} proc_mem     To get the quantity of the memory usage by the process
         *   @param {string} db_stats     To get the database statistics
         *   @param {string} log_stats    To get the log statistics
         *   @param {string} tot_users    To get the total number of the configured users
         *   @param {string} conn_clients To get the number of connected clients
         */
        'get': [
          'proc',
          'pkg_ver',
          'node_ver',
          'proc_mem',
          'db_stats',
          'log_stats',
          'tot_users',
          'conn_clients'
        ],

        'post': [],
        'head': [],
        'del': []
      },

      /**
       * Get the data about the process by the following REST API:
       *
       *     proc
       *
       * @method proc
       * @param {object}   req The client request
       * @param {object}   res The client response
       * @param {function} next Function to run the next handler in the chain
       */
      proc: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          compProfiling.getCtiPackageRelease(function (err1, result) {
            try {
              if (err1) {
                logger.log.error(IDLOG, err1);
                compUtil.net.sendHttp500(IDLOG, res, err1);
              } else {
                logger.log.info(IDLOG, 'send process data to user "' + username + '"');

                // calculate the uptime
                var uptime = '';
                var durationSec = Math.ceil(process.uptime());
                var uptimeSec = moment.duration(durationSec, 'seconds').seconds();
                var uptimeMin = moment.duration(durationSec, 'seconds').minutes();
                var uptimeHours = moment.duration(durationSec, 'seconds').hours();
                var uptimeDays = moment.duration(durationSec, 'seconds').days();
                var uptimeMonths = moment.duration(durationSec, 'seconds').months();
                var uptimeYears = moment.duration(durationSec, 'seconds').years();
                if (uptimeSec < 10) {
                  uptimeSec = '0' + uptimeSec;
                }
                if (uptimeMin < 10) {
                  uptimeMin = '0' + uptimeMin;
                }
                if (uptimeHours < 10) {
                  uptimeHours = '0' + uptimeHours;
                }
                if (uptimeYears > 0) {
                  uptime += uptimeYears + ' Years ';
                }
                if (uptimeYears > 0 || uptimeMonths > 0) {
                  uptime += uptimeMonths + ' Months ';
                }
                uptime += uptimeDays + ' Days - ' + uptimeHours + ':' + uptimeMin + ':' + uptimeSec;

                var result = {
                  pid: compProfiling.getProcessPid(),
                  uptime: uptime,
                  pkg_ver: result,
                  proc_mem: compProfiling.getProcMem(),
                  db_stats: compDbConn.getStats(),
                  log_stats: getLogStats(),
                  tot_users: compConfigManager.getTotNumUsers(),
                  conn_clients: getConnectedClientsNum()
                };
                res.send(200, result);
              }
            } catch (err2) {
              logger.log.error(IDLOG, err2.stack);
              compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
          });
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Get version of the packages by the following REST API:
       *
       *     pkg_ver
       *
       * @method pkg_ver
       * @param {object}   req The client request
       * @param {object}   res The client response
       * @param {function} next Function to run the next handler in the chain
       */
      pkg_ver: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          compProfiling.getCtiPackageRelease(function (err1, result) {
            try {
              if (err1) {
                logger.log.error(IDLOG, err1);
                compUtil.net.sendHttp500(IDLOG, res, err1);
              } else {
                logger.log.info(IDLOG, 'send sw pkg release data to user "' + username + '"');
                res.send(200, result);
              }
            } catch (err2) {
              logger.log.error(IDLOG, err2.stack);
              compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
          });
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Get the version of the node by the following REST API:
       *
       *     node_ver
       *
       * @method node_ver
       * @param {object}   req The client request
       * @param {object}   res The client response
       * @param {function} next Function to run the next handler in the chain
       */
      node_ver: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = compProfiling.getNodeVersion();

          if (typeof results !== 'string') {
            var strerr = 'wrong node version result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

          } else {
            logger.log.info(IDLOG, 'send node version to user "' + username + '"');
            res.send(200, {
              node_ver: results
            });
          }
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Get the quantity of the memory usage by the process by the following REST API:
       *
       *     proc_mem
       *
       * @method all
       * @param {object}   req The client request
       * @param {object}   res The client response
       * @param {function} next Function to run the next handler in the chain
       */
      proc_mem: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = compProfiling.getProcMem();

          if (typeof results !== 'object') {
            var strerr = 'wrong mem usage result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

          } else {

            logger.log.info(IDLOG, 'send mem usage data to user "' + username + '"');
            res.send(200, results);
          }

        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Gets the number of connected clients with the following REST API:
       *
       *     conn_clients
       *
       * @method conn_clients
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      conn_clients: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = getConnectedClientsNum();

          if (typeof results !== 'object') {
            var strerr = 'wrong connected clients number result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

          } else {

            logger.log.info(IDLOG, 'send connected clients number data to user "' + username + '"');
            res.send(200, results);
          }

        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Gets the number of executed queries with the following REST API:
       *
       *     db_stats
       *
       * @method db_stats
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      db_stats: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = compDbConn.getStats();

          if (typeof results !== 'object') {
            var strerr = 'wrong executed queries number result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

          } else {

            logger.log.info(IDLOG, 'send executed queries number data to user "' + username + '"');
            res.send(200, results);
          }

        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Gets the number of warning and error logs with the following REST API:
       *
       *     log_stats
       *
       * @method log_stats
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      log_stats: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = getLogStats();

          if (typeof results !== 'object') {
            var strerr = 'wrong log stats result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);
          } else {
            logger.log.info(IDLOG, 'send log stats data to user "' + username + '"');
            res.send(200, results);
          }
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Gets the total number of the configured users with the following REST API:
       *
       *     tot_users
       *
       * @method tot_users
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      tot_users: function (req, res, next) {
        try {
          var username = req.headers.authorization_user;
          var results = {
            tot_users: compConfigManager.getTotNumUsers()
          };

          if (typeof results !== 'object') {
            var strerr = 'wrong tot num users result for user "' + username + '"';
            logger.log.error(IDLOG, strerr);
            compUtil.net.sendHttp500(IDLOG, res, strerr);

          } else {

            logger.log.info(IDLOG, 'send tot num users data to user "' + username + '"');
            res.send(200, results);
          }
        } catch (err) {
          logger.log.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    }
    exports.api = profiling.api;
    exports.proc = profiling.proc;
    exports.pkg_ver = profiling.pkg_ver;
    exports.node_ver = profiling.node_ver;
    exports.proc_mem = profiling.proc_mem;
    exports.db_stats = profiling.db_stats;
    exports.log_stats = profiling.log_stats,
    exports.setLogger = setLogger;
    exports.tot_users = profiling.tot_users;
    exports.setCompUtil = setCompUtil;
    exports.conn_clients = profiling.conn_clients;
    exports.setCompDbConn = setCompDbConn;
    exports.setCompProfiling = setCompProfiling;
    exports.setCompConfigManager = setCompConfigManager;

  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
})();

/**
 * Returns the number of connected clients.
 *
 * @method getConnectedClientsNum
 * @private
 * @return {object} The number of connected clients by websocket and tcp.
 */
function getConnectedClientsNum() {
  try {
    return {
      ws_conn_clients: compProfiling.getWsNumConnectedClients(),
      tcp_conn_clients: compProfiling.getTcpNumConnectedClients()
    };
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    return {};
  }
}

/**
 * Returns the log statistics.
 *
 * @method getLogStats
 * @private
 * @return {object} The log statistics.
 */
function getLogStats() {
  try {
    return {
      warn: logger.log.getWarnCounter(),
      error: logger.log.getErrorCounter()
    };
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
    return -1;
  }
}
