/**
 * Provides the status of the user presence.
 *
 * **It can throw Exceptions.**
 *
 * @class user_presence
 * @static
 */

/**
 * The list of the user presence.
 *
 * @property STATUS
 * @type {object}
 * @readOnly
 * @default {
    dnd: "dnd",
    online: "online",
    voicemail: "voicemail",
    cellphone: "cellphone"
}
 */
var STATUS = {
  dnd: 'dnd',
  online: 'online',
  voicemail: 'voicemail',
  cellphone: 'cellphone'
};

/**
 * Checks if the user presence status is valid.
 *
 * @method isValidUserPresence
 * @param  {string}  status The status of the user presence
 * @return {boolean} Return true if the user presence status is valid, false otherwise.
 */
function isValidUserPresence(status) {
  if (typeof status !== 'string') {
    throw new Error('wrong parameter');
  }
  if (STATUS[status] !== undefined) {
    return true;
  }
  return false;
}

/**
 * Returns the list of user presence status in JSON format.
 *
 * @method getPresenceListJSON
 * @return {boolean} Returns the list of user presence status in JSON format.
 */
function getPresenceListJSON() {
  return Object.keys(STATUS);
}

// public interface
exports.STATUS = STATUS;
exports.getPresenceListJSON = getPresenceListJSON;
exports.isValidUserPresence = isValidUserPresence;
