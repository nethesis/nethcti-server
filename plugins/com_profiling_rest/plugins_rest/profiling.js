/**
* Provides configuration manager functions through REST API.
*
* @module com_profiling_rest
* @submodule plugins_rest
*/

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
* Sets the profiling architect component.
*
* @method setCompProfiling
* @param {object} comp The profiling architect component.
*/
function setCompProfiling(comp) {
    try {
        compProfiling = comp;
        logger.info(IDLOG, 'set profiling architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
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
        logger.info(IDLOG, 'set util architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides profiling functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`profiling/proc_mem`](#proc_memget)
        * 1. [`profiling/sys_cpus`](#sys_cpusget)
        * 1. [`profiling/num_clients`](#num_clientsget)
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
         "rss": 4935680,
         "heapTotal": 1826816,
         "heapUsed": 650472
     }
        *
        * ---
        *
        * ### <a id="sys_cpusget">**`profiling/sys_cpus`**</a>
        *
        * Returns the data about the system cpus.
        *
        * Example JSON response:
        *
        *     [{
         model: "AMD Athlon(tm) II X2 260 Processor",
         speed: 3203,
         times: {
             user: 19331800,
             nice: 22300,
             sys: 5780900,
             idle: 1808449400,
             irq: 2565200
         }
     }]
        *
        * ---
        *
        * ### <a id="num_clientsget">**`profiling/num_clients`**</a>
        *
        * Returns the number of connected clients.
        *
        * Example JSON response:
        *
        *     { num_clients: 4 }
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
                *   @param {string} proc_mem    To get the quantity of the memory usage by the process
                *   @param {string} sys_cpus    To get the data about the cpus of the system
                *   @param {string} num_clients To get the number of connected clients
                */
                'get': [
                    'proc_mem',
                    'sys_cpus',
                    'num_clients'
                ],

                'post': [],
                'head': [],
                'del' : []
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
                    var results  = compProfiling.getProcMem();

                    if (typeof results !== 'object') {
                        var strerr = 'wrong mem usage result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send mem usage data to user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the data about the cpus with the following REST API:
            *
            *     sys_cpus
            *
            * @method sys_cpus
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            sys_cpus: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = compProfiling.getSysCpus();

                    if (typeof results !== 'object') {
                        var strerr = 'wrong cpus result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send cpus data to user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the data number of connected clients with the following REST API:
            *
            *     num_clients
            *
            * @method num_clients
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            num_clients: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var results  = { num_clients: compProfiling.getNumConnectedClients() };

                    if (typeof results !== 'object') {
                        var strerr = 'wrong connected clients number result for user "' + username + '"';
                        logger.error(IDLOG, strerr);
                        compUtil.net.sendHttp500(IDLOG, res, strerr);

                    } else {

                        logger.info(IDLOG, 'send connected clients number data to user "' + username + '"');
                        res.send(200, results);
                    }

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api              = profiling.api;
        exports.sys_cpus         = profiling.sys_cpus;
        exports.proc_mem         = profiling.proc_mem;
        exports.setLogger        = setLogger;
        exports.num_clients      = profiling.num_clients;
        exports.setCompUtil      = setCompUtil;
        exports.setCompProfiling = setCompProfiling;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
