// Asterisk 11 AMI Actions 
// All asterisk action have an ActionId
// An ActionId is composed by action name + separator char + timestamp
exports.dndGet        = dndGet;
exports.astVersion    = astVersion;
exports.actionName    = actionName;
exports.listSipPeers  = listSipPeers;
exports.getActionName = getActionName;

var SEP = '_'; // separator character to construct ActionId
// actions name
var actionName = {
    dndGet:       'dndGet',
    astVersion:   'astVersion',
    listSipPeers: 'listSipPeers'

};

// return the ActionId key
function getActionId(id) {
    if (id) { return id + SEP + (new Date()).getTime(); }
    return (new Date()).getTime();
}

// return the action name from ActionId value
function getActionName(actionid) {
    if (actionid && actionid.indexOf(SEP) !== -1) { return actionid.split(SEP)[0]; }
    return undefined;
}

// return the action to get DND status
function dndGet(exten, id) {
    return { Action: 'DBGet', ActionID: getActionId(actionName.dndGet), Family: 'DND', Key: exten };
}

// return the action to get all sip peers
function listSipPeers(id) {
    return { Action: 'SIPpeers', ActionID: getActionId(actionName.listSipPeers) };
}

// return th eaction to get asterisk version
function astVersion(id) {
    return { Action: 'CoreSettings', ActionId: getActionId(actionName.astVersion) };
}
