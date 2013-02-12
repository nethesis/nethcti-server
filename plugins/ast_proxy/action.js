exports.dnd = dnd;
exports.listSipPeers = listSipPeers;

function dnd(exten) {
    return { Action: 'DBGet', Family: 'DND', Key: exten };
}

function listSipPeers(id) {
    return { Action: 'SIPpeers' };
}

