/**
 * Provides the authorization functions.
 *
 * @module authorization
 * @main authorization
 */

/**
 * Provides the authorization functions.
 *
 * @class authorization
 * @static
 */
var fs = require('fs');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [authorization]
 */
var IDLOG = '[authorization]';

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
 * The user module.
 *
 * @property compUser
 * @type object
 * @private
 */
var compUser;

/**
 * Mapping between users and profiles. The keys are the username
 * and the values are the profiles ids.
 *
 * @property mapUserProfile
 * @type object
 * @private
 */
var mapUserProfile;

/**
 * Authorization profiles. The keys are the profiles ids and
 * the values are the permissions.
 *
 * @property profiles
 * @type object
 * @private
 */
var profiles = {};

/**
 * The permission to view local operator panel groups for each remote site.
 *
 * @property remoteOperatorsAutho
 * @type object
 * @private
 */
var remoteOperatorsAutho;

/**
 * The dbconn module.
 *
 * @property compDbconn
 * @type object
 * @private
 */
var compDbconn;

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
      typeof log.info === 'function' &&
      typeof log.warn === 'function' &&
      typeof log.error === 'function') {

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
 * Set the user authorization by file. The file must use the JSON syntax.
 *
 * @method config
 * @param {object} obj
 *  @param {string} obj.users The path of the users file
 *  @param {string} obj.profiles The path of the profiles file
 */
function config(obj) {
  try {
    if (typeof obj !== 'object' || typeof obj.users !== 'string' || typeof obj.profiles !== 'string') {
      throw new Error('wrong parameter');
    }
    if (!fs.existsSync(obj.users)) {
      throw new Error(obj.users + ' does not exist');
    }
    if (!fs.existsSync(obj.profiles)) {
      throw new Error(obj.profiles + ' does not exist');
    }
    // initialize mapping between user and authorization profile
    var u;
    mapUserProfile = JSON.parse(fs.readFileSync(obj.users, 'utf8'));
    for (u in mapUserProfile) {
      delete mapUserProfile[u].name;
      delete mapUserProfile[u].endpoints;
    }
    // initialize profiles. The keys are the profile "id" and the value the profile object itself
    profiles = JSON.parse(fs.readFileSync(obj.profiles, 'utf8'));
    // fix the permission keys to be an object instead of an array
    var i, mp, id, temp;
    for (id in profiles) {
      for (mp in profiles[id].macro_permissions) {
        temp = {};
        for (i = 0; i < profiles[id].macro_permissions[mp].permissions.length; i++) {
          temp[profiles[id].macro_permissions[mp].permissions[i].name] = profiles[id].macro_permissions[mp].permissions[i];
        }
        profiles[id].macro_permissions[mp].permissions = temp;
      }
    }
    logger.info(IDLOG, 'configuration done by ' + obj.users + ' ' + obj.profiles);

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Return the authorization profile fo the user in JSON format.
 *
 * @method getUserProfileJSON
 * @param {string} username The username
 * @return {object} The authorization profile in JSON format.
 */
function getUserProfileJSON(username) {
  try {
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    if (mapUserProfile[username]) {
      var profileId = mapUserProfile[username].profile_id;
      return profiles[profileId];
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set dbconn module to be used.
 *
 * @method setCompDbconn
 * @param {object} comp The dbconn module
 * @private
 */
function setCompDbconn(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new TypeError('wrong parameter');
    }
    compDbconn = comp;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set user module to be used.
 *
 * @method setCompUser
 * @param {object} comp The user module
 * @private
 */
function setCompUser(comp) {
  try {
    // check parameter
    if (typeof comp !== 'object') {
      throw new TypeError('wrong parameter');
    }
    compUser = comp;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set the remote sites authorizations to view the operator panel groups
 * by file. The file must use the JSON syntax.
 *
 * @method configRemoteOperators
 * @param {string} path The path of the authorization file for operator panel
 *                      groups to be allowed for each remote site
 */
function configRemoteOperators(path) {
  try {
    if (typeof path !== 'string') {
      throw new Error('wrong parameter');
    }

    if (!fs.existsSync(path)) {
      logger.error(path + ' does not exist');
      return;
    }

    // read the file
    var json = require(path);

    if (typeof json !== 'object' ||
      typeof json.groups !== 'object') {

      logger.warn(IDLOG, 'wrong content in ' + path);
      return;
    }
    remoteOperatorsAutho = json.groups;
    logger.info(IDLOG, 'configuration of operator authorizations for remote sites by file ' + path + ' ended');

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Return true if the specified user has the phonebook authorization.
 *
 * @method authorizePhonebookUser
 * @param {string} username The username
 * @return {boolean} True if the user has the phonebook authorization.
 */
function authorizePhonebookUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return profiles[getUserProfileId(username)].macro_permissions.phonebook.value === true;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has the admin phonebook authorization.
 *
 * @method authorizeAdminPhonebookUser
 * @param {string} username The username
 * @return {boolean} True if the user has the admin phonebook authorization.
 */
function authorizeAdminPhonebookUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.phonebook.value === true &&
      profiles[profid].macro_permissions.phonebook.permissions.ad_phonebook.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the recording authorization.
 *
 * @method authorizeRecordingUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the recording authorization.
 */
function authorizeRecordingUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.settings.value === true &&
      profiles[profid].macro_permissions.settings.permissions.recording.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view the lost calls of the queues.
 *
 * @method authorizeLostQueueCallsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to view the lost calls of the queues.
 */
function authorizeLostQueueCallsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.lost_queue_calls, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration recording authorization.
 *
 * @method authorizeAdminRecordingUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration recording authorization.
 */
function authorizeAdminRecordingUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.ad_recording.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the post-it authorization.
 *
 * @method authorizePostitUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the post-it authorization.
 */
function authorizePostitUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.postit, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration post-it authorization.
 *
 * @method authorizeAdminPostitUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration post-it authorization.
 */
function authorizeAdminPostitUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.admin_postit, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration queues authorization.
 *
 * @method authorizeAdminQueuesUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration queues authorization.
 */
function authorizeAdminQueuesUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.queue_agent.value === true &&
      profiles[profid].macro_permissions.queue_agent.permissions.ad_queue_agent.value === true
    );
  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the offhour authorization.
 *
 * @method authorizeOffhourUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the offhour authorization.
 */
function authorizeOffhourUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.offhour, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the admin_offhour authorization.
 *
 * @method authorizeAdminOffhourUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the admin offhour authorization.
 */
function authorizeAdminOffhourUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.admin_offhour, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration hangup authorization.
 *
 * @method authorizeAdminHangupUser
 * @param {string} username The username
 * @return {boolean} True if the user has the administration hangup authorization.
 */
function authorizeAdminHangupUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.hangup.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration pickup authorization.
 *
 * @method authorizeAdminPickupUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration pickup authorization.
 */
function authorizeAdminPickupUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.admin_pickup, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view the call
 * detail recording (cdr).
 *
 * @method authorizeCdrUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the history authorization.
 */
function authorizeCdrUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);
    return profiles[profid].macro_permissions.cdr.value === true;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the sms authorization.
 *
 * @method authorizeSmsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the sms authorization.
 */
function authorizeSmsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.sms, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns the profile number identifier.
 *
 * @method getUserProfileId
 * @param {string} username The username
 * @return {string} The profile number identifier.
 * @private
 */
function getUserProfileId(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter: ' + username);
    }
    return mapUserProfile[username].profile_id;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Returns true if the specified user has the privacy enabled.
 *
 * @method isPrivacyEnabled
 * @param {string} username The username
 * @return {boolean} True if the user has the privacy enabled.
 */
function isPrivacyEnabled(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter: ' + username);
    }
    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.settings.value === true &&
      profiles[profid].macro_permissions.settings.permissions.privacy.value === true
    );
  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns true for security reasons
    return true;
  }
}

/**
 * Returns true if the specified user has the administration sms authorization.
 *
 * @method authorizeAdminSmsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration sms authorization.
 */
function authorizeAdminSmsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.admin_sms, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to spy the conversations.
 *
 * @method authorizeSpyUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to spy.
 */
function authorizeSpyUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.spy.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to
 * intrude himself into the conversations.
 *
 * @method authorizeIntrudeUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to intrude.
 */
function authorizeIntrudeUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.intrude, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the no spy permission enabled.
 * In this case no user can spy the conversation of the specified user.
 *
 * @method hasNoSpyEnabled
 * @param  {string}  username The username
 * @return {boolean} True if the user has the no spy permission enabled.
 */
function hasNoSpyEnabled(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.no_spy, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view and
 * set the don't disturb status of his endpoints.
 *
 * @method authorizeDndUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the don't disturb authorization.
 */
function authorizeDndUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.dnd, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view all extensions
 * with their complete status informations.
 *
 * @method authorizePresencePanelUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the operator panel authorization.
 */
function authorizePresencePanelUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    return profiles[getUserProfileId(username)].macro_permissions.presence_panel.value === true;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to the phone redirect.
 *
 * @method authorizePhoneRedirectUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the phone redirect authorization.
 */
function authorizePhoneRedirectUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.phone_redirect, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the administration transfer authorization.
 *
 * @method authorizeAdminTransferUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the administration transfer authorization.
 */
function authorizeAdminTransferUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.transfer.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view all parkings
 * with their complete status informations.
 *
 * @method authorizeOpParkingsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to view all parkings.
 */
function authorizeOpParkingsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.parkings, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view all trunks
 * with their complete status informations.
 *
 * @method authorizeOpTrunksUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to view all trunks.
 */
function authorizeOpTrunksUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.trunks, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to operate
 * with remote sites.
 *
 * @method authorizeRemoteSiteUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to view all queues.
 */
function authorizeRemoteSiteUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.remote_site, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view all queues
 * with their complete status informations.
 *
 * @method authorizeOpQueuesUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the authorization to view all queues.
 */
function authorizeOpQueuesUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.queues, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to view the
 * groups of the operator panel.
 *
 * @method authorizeOperatorGroupsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the operator panel authorization.
 */
function authorizeOperatorGroupsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get cusomter card authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.operator_groups);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.operator_groups];
    // var group;
    // for (group in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (objResult[group] === true) {
    //     return true;
    //   }
    // }
    // return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has the authorization to view the cdr of all extensions.
 *
 * @method authorizeAdminCdrUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the switchboard history authorization.
 */
function authorizeAdminCdrUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.cdr.value === true &&
      profiles[profid].macro_permissions.cdr.permissions.ad_cdr.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to park
 * any call and to pickup any parked call using any extension as destination.
 *
 * @method authorizeAdminParkingsUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the admin_parkings authorization.
 */
function authorizeAdminParkingsUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.ad_parking.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to originate
 * a call from any extension.
 *
 * @method authorizeAdminPhoneUser
 * @param {string} username The username
 * @return {boolean} True if the user has the admin_call authorization.
 */
function authorizeAdminPhoneUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    var profid = getUserProfileId(username);

    return (
      profiles[profid].macro_permissions.presence_panel.value === true &&
      profiles[profid].macro_permissions.presence_panel.permissions.ad_phone.value === true
    );

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has the caller note authorization. The caller
 * note authorization coincides with post-it authorization.
 *
 * @method authorizeCallerNoteUser
 * @param {string} username The username
 * @return {boolean} True if the user has the caller note authorization.
 */
function authorizeCallerNoteUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return authorizePostitUser(username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the admin caller note authorization.
 * The admin caller note authorization coincides with admin post-it authorization.
 *
 * @method authorizeAdminCallerNoteUser
 * @param  {string}  username The username
 * @return {boolean} True if the user has the admin caller note authorization.
 */
function authorizeAdminCallerNoteUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    return authorizeAdminPostitUser(username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has the chat authorization.
 *
 * @method authorizeChatUser
 * @param {string} username The username
 * @return {boolean} True if the user has the chat authorization.
 */
function authorizeChatUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // return authorizeUser(authorizationTypes.TYPES.chat, username);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * General function to check an authorization of a user. It's used
 * by all authorization with boolean value. E.g. customer card authorization
 * doesn't use this function.
 *
 * @method authorizeUser
 * @param {string} type The name of the authorization as reported by _authorization\_types.js_
 * @param {string} username The username to check the authorization
 * @private
 */
function authorizeUser(type, username) {
  try {
    // check parameter
    if (typeof type !== 'string' || typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get authorization type from the user
    var autho = compUser.getAuthorization(username, type);
    if (autho === undefined) {
      logger.warn(IDLOG, 'try to authorize non existent user "' + username + '" for authorization "' + type + '"');
      return false;
    }

    // check the type of the authorization. It must be a boolean value
    if (typeof autho[type] === 'boolean') {

      // return the authorization
      return autho[type];

    } else { // in all other case returns false for security reasons
      return false;
    }

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has at least one customer card authorization.
 *
 * @method authorizeCustomerCardUser
 * @param {string} username The username
 * @return {boolean} True if the user has at least one customer card authorization.
 */
function authorizeCustomerCardUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get cusomter card authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.customer_card);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.customer_card];
    // var cc;
    // for (cc in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (objResult[cc] === true) {
    //     return true;
    //   }

    // }
    // return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns true if the specified user has the authorization to pickup a conversation
 * of the specified extension.
 *
 * @method authorizePickupUser
 * @param  {string}  username   The username
 * @param  {string}  endpointId The endpoint identifier (e.g. the extension number)
 * @return {boolean} True if the user has the authorization to pickup a conversation of the endpoint
 */
function authorizePickupUser(username, endpointId) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof endpointId !== 'string') {
      throw new Error('wrong parameters');
    }

    // get pickup authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.pickup_groups);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.pickup_groups];
    // var ext;
    // for (ext in objResult) {

    //   if (ext === endpointId) {
    //     return true;
    //   }
    // }
    // return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has at least one streaming authorization.
 *
 * @method authorizeStreamingUser
 * @param {string} username The username
 * @return {boolean} True if the user has at least one streaming authorization.
 */
function authorizeStreamingUser(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get streaming authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.streaming);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.streaming];
    // var stream;
    // for (stream in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (objResult[stream] === true) {
    //     return true;
    //   }
    // }
    // return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Return true if the specified user has the authorization for the
 * specified streaming source.
 *
 * @method authorizeStreamingSourceUser
 * @param  {string} username    The username
 * @param  {string} streamingId The streaming source identifier
 * @return {boolean} True if the user has the authorization for the specified streaming source.
 */
function authorizeStreamingSourceUser(username, streamingId) {
  try {
    // check parameter
    if (typeof username !== 'string' || typeof streamingId !== 'string') {
      throw new Error('wrong parameter');
    }

    // get streaming authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.streaming);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.streaming];
    // var stream;
    // for (stream in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (stream === streamingId && objResult[stream] === true) {
    //     return true;
    //   }
    // }
    // return false;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false for security reasons
    return false;
  }
}

/**
 * Returns all the authorized streaming sources of the user.
 *
 * @method getAuthorizedStreamingSources
 * @param  {string} username The username
 * @return {object} All the authorized streaming sources.
 */
function getAuthorizedStreamingSources(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get streaming authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.streaming);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.streaming];
    // var stream;
    // var result = {}; // object to return
    // for (stream in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (objResult[stream] === true) {
    //     result[stream] = true;
    //   }
    // }
    // return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns and empty object
    return {};
  }
}

/**
 * Returns all the authorized groups of the operator panel for the specified remote site.
 *
 * @method getAuthorizedRemoteOperatorGroups
 * @param  {string} site The remote site name
 * @return {object} All the authorized operator panel groups for the specified remote site.
 */
function getAuthorizedRemoteOperatorGroups(site) {
  try {
    // check parameter
    if (typeof site !== 'string') {
      throw new Error('wrong parameter');
    }

    var gname;
    var result = {};
    for (gname in remoteOperatorsAutho) {
      if (remoteOperatorsAutho[gname].remote_site.indexOf(site) > -1) {
        result[gname] = true;
      }
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns and empty object
    return {};
  }
}

/**
 * Returns all the authorized groups of the operator panel of the user.
 *
 * @method getAuthorizedOperatorGroups
 * @param  {string} username The username
 * @return {object} All the authorized operator panel groups.
 */
function getAuthorizedOperatorGroups(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // get operator groups authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.operator_groups);

    // analize the result
    // var objResult = autho[authorizationTypes.TYPES.operator_groups];
    // var group;
    // var result = {}; // object to return
    // for (group in objResult) {

    //   // check the type of the authorization. It must be a boolean value
    //   if (objResult[group] === true) {
    //     result[group] = true;
    //   }
    // }
    // return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns and empty object
    return {};
  }
}

/**
 * Gets the name of the authorized customer cards of the user.
 *
 * @method authorizedCustomerCards
 * @param {string} username The username
 * @return {array} The list of the authorized customer cards of the user.
 */
function authorizedCustomerCards(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }
    var arr = [];

    // get cusomter card authorization from the user
    // var autho = compUser.getAuthorization(username, authorizationTypes.TYPES.customer_card);

    // // analize the result
    // var objResult = autho[authorizationTypes.TYPES.customer_card];
    // var cc;
    // for (cc in objResult) {

    //   // check the authorization
    //   if (objResult[cc] === true) {
    //     arr.push(cc);
    //   }
    // }
    // return arr;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns an empty array for security reasons
    return [];
  }
}

/**
 * Checks if the extension endpoint is owned by the specified user.
 *
 * @method verifyUserEndpointExten
 * @param {string} username The username
 * @param {string} endpoint The identifier of the extension endpoint
 * @return {boolean} True if the extension endpoint is owned by the user, false otherwise.
 */
function verifyUserEndpointExten(username, endpoint) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof endpoint !== 'string') {
      throw new Error('wrong parameters');
    }

    return compUser.hasExtensionEndpoint(username, endpoint);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false value for security reasons
    return false;
  }
}

/**
 * Checks if the cellphone endpoint is owned by the specified user.
 *
 * @method verifyUserEndpointCellphone
 * @param {string} username The username
 * @param {string} endpoint The identifier of the cellphone endpoint
 * @return {boolean} True if the cellphone endpoint is owned by the user, false otherwise.
 */
function verifyUserEndpointCellphone(username, endpoint) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof endpoint !== 'string') {
      throw new Error('wrong parameters');
    }

    return compUser.hasCellphoneEndpoint(username, endpoint);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false value for security reasons
    return false;
  }
}

/**
 * Checks if the voicemail endpoint is owned by the specified user.
 *
 * @method verifyUserEndpointVoicemail
 * @param  {string}  username The username
 * @param  {string}  endpoint The identifier of the endpoint
 * @return {boolean} True if the endpoint is owned by the user, false otherwise.
 */
function verifyUserEndpointVoicemail(username, endpoint) {
  try {
    // check parameters
    if (typeof username !== 'string' || typeof endpoint !== 'string') {
      throw new Error('wrong parameters');
    }

    return compUser.hasVoicemailEndpoint(username, endpoint);

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns false value for security reasons
    return false;
  }
}

/**
 * Returns the authorizations of all users.
 *
 * @method getAllUsersAuthorizations
 * @return {object} The authorizations of all users.
 */
function getAllUsersAuthorizations() {
  try {
    // object to return
    var result = {};

    var usernames = compUser.getUsernames();

    var i;
    for (i = 0; i < usernames.length; i++) {
      result[usernames[i]] = getUserAuthorizations(usernames[i]);
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns an empty object for security reasons
    return {};
  }
}

/**
 * Returns all authorizations of the user.
 *
 * @method getUserAuthorizations
 * @param  {string} username The username
 * @return {object} All authorizations of the user.
 */
function getUserAuthorizations(username) {
  try {
    // check parameter
    if (typeof username !== 'string') {
      throw new Error('wrong parameter');
    }

    // object to return
    var result = {};

    // cycle in all authorization types
    var type, obj;
    for (type in authorizationTypes.TYPES) {

      // get one specific authorization of the user
      obj = compUser.getAuthorization(username, type);

      // analize the returned authorization
      if (typeof obj === 'object') {

        // authorization values can be a boolean or an object with the list
        // of how is permitted as keys, e.g. the customer card authorizations
        if ((typeof obj[type] === 'boolean' && obj[type] === true) ||
          (typeof obj[type] === 'object' && Object.keys(obj[type]).length > 0)) {

          result[type] = true;

        } else if ((typeof obj[type] === 'boolean' && obj[type] === false) ||
          (typeof obj[type] === 'object' && Object.keys(obj[type]).length === 0)) {

          result[type] = false;

        } else {
          logger.warn(IDLOG, 'wrong value for authorization "' + type + '" of the user "' + username + '"');
        }

      } else {
        logger.warn(IDLOG, 'wrong "' + type + '" authorization result for user "' + username + '"');
      }
    }
    return result;

  } catch (err) {
    logger.error(IDLOG, err.stack);
    // in the case of exception it returns an empty object for security reasons
    return {};
  }
}

/**
 * Check if the user has the permission to listen audio file of announcement.
 * Returns true if the announcement is owned by the specified user or has the
 * "public" visibility.
 *
 * @method verifyOffhourListenAnnouncement
 * @param {string}   username       The user to verify
 * @param {string}   announcementId The announcement identifier
 * @param {function} cb             The callback function
 */
function verifyOffhourListenAnnouncement(username, announcementId, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof announcementId !== 'string' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    compDbconn.getAnnouncement(announcementId, function(err, result) {
      try {
        if (err) {
          var str = 'checking audio announcement id "' + announcementId + '" for user "' + username + '": ' + err;
          logger.warn(IDLOG, str);
          cb(err);

        } else {
          if (result.privacy === 'public' || result.username === username) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err);
  }
}

/**
 * Check if the user has the permission on audio file for announcement.
 * Returns true if the announcement is owned by the specified user.
 *
 * @method verifyOffhourUserAnnouncement
 * @param {string}   username       The user to verify
 * @param {string}   announcementId The announcement identifier
 * @param {function} cb             The callback function
 */
function verifyOffhourUserAnnouncement(username, announcementId, cb) {
  try {
    // check parameters
    if (typeof username !== 'string' ||
      typeof announcementId !== 'string' || typeof cb !== 'function') {

      throw new Error('wrong parameters');
    }

    compDbconn.getAnnouncement(announcementId, function(err, result) {
      try {
        if (err) {
          var str = 'checking audio announcement id "' + announcementId + '" for user "' + username + '": ' + err;
          logger.warn(IDLOG, str);
          cb(err);

        } else {
          if (result.username === username) {
            cb(null, true);
          } else {
            cb(null, false);
          }
        }
      } catch (error) {
        logger.error(IDLOG, error.stack);
        cb(error);
      }
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
    cb(err);
  }
}

// public interface
exports.config = config;
exports.setLogger = setLogger;
exports.setCompUser = setCompUser;
exports.setCompDbconn = setCompDbconn;
exports.hasNoSpyEnabled = hasNoSpyEnabled;
exports.authorizeSpyUser = authorizeSpyUser;
exports.authorizeDndUser = authorizeDndUser;
exports.authorizeCdrUser = authorizeCdrUser;
exports.isPrivacyEnabled = isPrivacyEnabled;
exports.authorizeSmsUser = authorizeSmsUser;
exports.authorizeChatUser = authorizeChatUser;
exports.getUserProfileJSON = getUserProfileJSON;
exports.authorizePickupUser = authorizePickupUser;
exports.authorizePostitUser = authorizePostitUser;
exports.authorizeIntrudeUser = authorizeIntrudeUser;
exports.authorizeOffhourUser = authorizeOffhourUser;
exports.configRemoteOperators = configRemoteOperators;
exports.authorizeOpTrunksUser = authorizeOpTrunksUser;
exports.authorizeAdminSmsUser = authorizeAdminSmsUser;
exports.authorizeOpQueuesUser = authorizeOpQueuesUser;
exports.authorizeAdminCdrUser = authorizeAdminCdrUser;
exports.getUserAuthorizations = getUserAuthorizations;
exports.authorizeAdminPhoneUser = authorizeAdminPhoneUser;
exports.authorizeRecordingUser = authorizeRecordingUser;
exports.authorizePhonebookUser = authorizePhonebookUser;
exports.authorizeStreamingUser = authorizeStreamingUser;
exports.authorizeRemoteSiteUser = authorizeRemoteSiteUser;
exports.authorizeCallerNoteUser = authorizeCallerNoteUser;
exports.authorizedCustomerCards = authorizedCustomerCards;
exports.verifyUserEndpointExten = verifyUserEndpointExten;
exports.authorizeOpParkingsUser = authorizeOpParkingsUser;
exports.authorizeAdminPostitUser = authorizeAdminPostitUser;
exports.authorizeAdminHangupUser = authorizeAdminHangupUser;
exports.authorizeAdminPickupUser = authorizeAdminPickupUser;
exports.getAllUsersAuthorizations = getAllUsersAuthorizations;
exports.authorizeCustomerCardUser = authorizeCustomerCardUser;
exports.authorizePresencePanelUser = authorizePresencePanelUser;
exports.authorizeAdminOffhourUser = authorizeAdminOffhourUser;
exports.authorizeAdminParkingsUser = authorizeAdminParkingsUser;
exports.authorizeAdminTransferUser = authorizeAdminTransferUser;
exports.authorizeAdminQueuesUser = authorizeAdminQueuesUser;
exports.authorizePhoneRedirectUser = authorizePhoneRedirectUser;
exports.authorizeAdminPhonebookUser = authorizeAdminPhonebookUser;
exports.verifyUserEndpointVoicemail = verifyUserEndpointVoicemail;
exports.authorizeLostQueueCallsUser = authorizeLostQueueCallsUser;
exports.authorizeAdminRecordingUser = authorizeAdminRecordingUser;
exports.getAuthorizedOperatorGroups = getAuthorizedOperatorGroups;
exports.authorizeOperatorGroupsUser = authorizeOperatorGroupsUser;
exports.verifyUserEndpointCellphone = verifyUserEndpointCellphone;
exports.authorizeAdminCallerNoteUser = authorizeAdminCallerNoteUser;
exports.authorizeStreamingSourceUser = authorizeStreamingSourceUser;
exports.getAuthorizedStreamingSources = getAuthorizedStreamingSources;
exports.verifyOffhourUserAnnouncement = verifyOffhourUserAnnouncement;
exports.verifyOffhourListenAnnouncement = verifyOffhourListenAnnouncement;
exports.getAuthorizedRemoteOperatorGroups = getAuthorizedRemoteOperatorGroups;
