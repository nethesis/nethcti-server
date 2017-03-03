/**
 * The architect component that exposes _astproxy_ module.
 *
 * @class arch_astproxy
 */
var astProxy = require('./astproxy');
// var queueRecallingManager = require('./queue_recalling_manager');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [arch_astproxy]
 */
var IDLOG = '[arch_astproxy]';

module.exports = function(options, imports, register) {

  var logger = console;
  if (imports.logger) {
    logger = imports.logger;
  }
  var astProxyObj = astProxy;
  // astProxyObj.CF_TYPES = require('./proxy_logic_13/util_call_forward_13').CF_TYPES;
  // astProxyObj.getQueueRecallData = queueRecallingManager.getQueueRecallData;
  // astProxyObj.getQueueRecallInfo = queueRecallingManager.getQueueRecallInfo;
  // astProxyObj.checkQueueRecallingStatus = queueRecallingManager.checkQueueRecallingStatus;

  // public interface for other architect components
  register(null, {
    astProxy: astProxyObj
  });

  try {
    // imports.dbconn.on(imports.dbconn.EVT_READY, function () {
    astProxy.setLogger(logger);
    astProxy.config('/etc/nethcti/asterisk.json');
    // astProxy.configAstCodes('/etc/nethcti/asterisk_codes.json');
    // astProxy.configRemoteSitesPrefixes('/etc/nethcti/remote_sites.json');
    // astProxy.configSipWebrtc('/etc/nethcti/sip_webrtc.json');
    // astProxy.proxyLogic.setCompDbconn(imports.dbconn);
    // astProxy.proxyLogic.setCompPhonebook(imports.phonebook);
    // astProxy.proxyLogic.setCompCallerNote(imports.callerNote);
    astProxy.start();
    // queueRecallingManager.setLogger(logger);
    // queueRecallingManager.setCompAstProxy(astProxy);
    // queueRecallingManager.setCompDbconn(imports.dbconn);
    // });
  } catch (err) {
    logger.error(err.stack);
  }
};
