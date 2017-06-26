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
    cellphone: "cellphone",
    callforward: "callforward"
}
 */
var STATUS = {
  online: 'online',
  dnd: 'dnd',
  voicemail: 'voicemail',
  cellphone: 'cellphone',
  callforward: 'callforward'
};

/**
 * Checks if the user presence status is valid.
 *
 * @method isValidUserPresence
 * @param  {string}  status The status of the user presence
 * @return {boolean} Return true if the user presence status is valid, false otherwise.
 */
function isValidUserPresence(status) {
  if (STATUS[status] !== undefined) {
    return true;
  }
  return false;
}

// public interface
exports.STATUS = STATUS;
exports.isValidUserPresence = isValidUserPresence;
