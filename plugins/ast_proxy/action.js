// Contains the common operations for all asterisk actions

var SEP = '_'; // separator character to construct ActionID

// return the value for the ActionID key
// An ActionID value is composed by action name + separator char + timestamp
function getActionId(id) {
    if (id) { return id + SEP + (new Date()).getTime(); }
    return (new Date()).getTime();
}

// return the action name from the ActionID value
function getActionName(actionid) {
    if (actionid && actionid.indexOf(SEP) !== -1) { return actionid.split(SEP)[0]; }
    return undefined;
}

// exports methods
exports.getActionName = getActionName;
exports.getActionId = getActionId;
