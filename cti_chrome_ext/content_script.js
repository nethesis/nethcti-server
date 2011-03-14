chrome.extension.onRequest.addListener(function(obj){

	console.log(obj.respMessage);

	switch(obj.typeMessage){
		case 'connected':

	    break;
		case 'error_login':

			updateInfoLogin(obj);
		break;
		case 'ack_login':

			updateAckLoginGui();
	    break;
	    case 'error_call':

	    	updateErrorCalling(obj);
	    break;
	    case 'dialing':

	    	updateCallingGui(obj);
	    	if(obj.notificationURL=='templateNotificationCallingPhonebook.html'){
		    	addTabDialing(obj);
		    }
	    break;
	    case 'callconnected':

	    	updateCallConnectedGui(obj)
	    break;
	    case 'hangup':

	    	updateHangupGui(obj);
	    break;
	    case 'error_redirect':

	    	updateErrorRedirectGui(obj);
	    break;
	    case 'ack_redirect':

		    updateAckRedirectGui(obj);
	    break;
	    case 'error_search_contacts':

	    	updateSearchContactsGui(obj);
	    break;
	    case 'search_contacts_results':

	    	updateSearchContactsResultsGui(obj);
	    break;
	    case 'error_record':

	    	updateErrorRecordGui(obj);
	    break;
	    case 'ack_record':

	    	updateAckRecordGui(obj);
	    break;
	    case 'ack_stoprecord':

	    	updateAckStopRecordGui(obj);		
	    break;
	    case 'ack_logout':

	    	updateLogoutGui(obj);		
	    break;
	    default:

	    break;    		
	}
	
});






