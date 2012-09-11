exports.ResponseMessage = function (clSessId, typeMess, respMess) {
    this.clientSessionId = clSessId;
    this.typeMessage = typeMess;
    this.respMessage = respMess;
}
