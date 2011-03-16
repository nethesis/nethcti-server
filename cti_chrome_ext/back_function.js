function htmlDesktopNotification(obj){
          
   	if (window.webkitNotifications) { //enable notification if supported
		
		var reqUrl = "./" + obj.notificationURL + "?from=" + obj.from + "&to=" + obj.to + "&respMessage=" + obj.respMessage;
   		notification = window.webkitNotifications.createHTMLNotification(reqUrl);
		notification.ondisplay = function() { console.log("Display notification"); };
		notification.onclose = function() { console.log("Close notification"); };
		notification.onclick = function() {
			
			window.open(INDEX_NAME);
			
			//chrome.tabs.create({url: INDEX_NAME});
			// ERROR: Error during tabs.create: No current window 
			//chrome/ExtensionProcessBindings:87
			
			
			notification.cancel();
		};
		
		notification.show(); 
            
        /*
    	setTimeout(function(){
			notification.cancel();
		}, notificationTimeout);
		*/
	}
}
		
		
function doLogin(objLogin){
	init();
	console.log(objLogin);
	socket.send(objLogin);
	console.log("sended login request for [" + objLogin.extFrom + "]");
}
function doCall(objCall){
			
	callFromExt = objCall.extFrom;
	callToExt = objCall.extToCall;
			
	console.log(objCall);
	socket.send(objCall);
	console.log("sended call request from " + objCall.extFrom + " -> to " + objCall.extToCall);
}
function doHangup(objHangup){
	socket.send(objHangup);
	console.log("Hangup request has been sent to server");
}
function doLogout(objLogout){
	socket.send(objLogout);
    console.log("sended disconnection request for " + objLogout.extFrom);
}
function doRedirect(objRedirect){

	var redirectFrom = '';
	
	// check if the current call has been originated from me
	if(callFromExt==localStorage.getItem('user')){
		redirectFrom = callToExt;
	}
	// in this case the call is in input
	else{
		redirectFrom = callFromExt;
	}
			
	objRedirect.redirectFrom = redirectFrom;
	socket.send(objRedirect);
	console.log("Redirect request from " + objRedirect.redirectFrom + " to " + objRedirect.redirectTo + " has been sent to server");
			
	callFromExt = '';
	callToExt = '';
}
function doSearchContact(objSearchContact){
	socket.send(objSearchContact);
	console.log('request to search contact in phonebook has been sent to server');
}
function doStartRecord(objStartRecord){
	objStartRecord.callFromExt = callFromExt;
	objStartRecord.callToExt = callToExt;
	socket.send(objStartRecord);
	console.log("sended record request for me [" + objStartRecord.extFrom + "]");
}
function doStopRecord(objStopRecord){
	socket.send(objStopRecord);
	console.log("sended stop record request for me [" + objStopRecord.extFrom + "]");
}



