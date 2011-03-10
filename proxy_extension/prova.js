
alert('caricato prova.js');


chrome.extension.onRequest.addListener(function(obj){

	alert("sono sempre prova.js  e req = [" + obj + "]");
	
	switch(obj.typeMessage){
		case 'connected':
	    	console.log(obj.respMessage);
	    break;
		case 'error_login':
			console.log(obj.respMessage);
			updateInfoLogin(obj);
		break;
		case 'ack_login':
			console.log(obj.respMessage);
			updateAckLoginGui();
	    break;
	    case 'error_call':
	    	console.log(obj.respMessage);
	    	updateErrorCalling(obj);
	    break;
	    case 'dialing':
		    console.log(obj.respMessage);
	    	updateCallingGui(obj);
	    break;
	    case 'callconnected':
	    	console.log(obj.respMessage);
	    	updateCallConnectedGui(obj)
	    break;
	    case 'hangup':
	    	console.log(obj.respMessage);
	    	updateHangupGui(obj);
	    break;
	    case 'error_redirect':
	    	console.log(obj.respMessage);
	    	updateErrorRedirectGui(obj);
	    break;
	    case 'ack_redirect':
	    	console.log(obj.respMessage);
		    updateAckRedirectGui(obj);
	    break;
	    case 'error_search_contacts':
		    console.log(obj.respMessage);
	    	updateSearchContactsGui(obj);
	    break;
	    case 'search_contacts_results':
	    	console.log(obj.respMessage);
	    	updateSearchContactsResultsGui(obj);
	    break;
	    case 'error_record':
	    	console.log(obj.respMessage);
	    	updateErrorRecordGui(obj);
	    break;
	    case 'ack_record':
		    console.log(obj.respMessage);
	    	updateAckRecordGui(obj);
	    break;
	    case 'ack_stoprecord':
	    	console.log(obj.respMessage);
	    	updateAckStopRecordGui(obj);		
	    break;
	    case 'ack_logout':
	    	console.log(obj.respMessage);
	    	updateLogoutGui(obj);		
	    break;
	    default:
	    			
	    break;    		
	}
	
});

function updateInfoCalling(obj){
	document.getElementById('info_calling').innerText = obj.respMessage;
}

function updateAckStopRecordGui(obj){
	document.getElementById('record').value = 'Record';
}

function updateAckRecordGui(obj){
	document.getElementById('record').value = 'Stop recording...';
}

function updateErrorRecordGui(obj){
	updateInfoCalling(obj);
}

function updateSearchContactsResultsGui(obj){

	var results = obj.results;
	emptySearchContacts();
	      		
	var newDiv = document.createElement("div");
	      		
    var htmlResults = "";

    for(var i=0; i<results.length; i++){
    	var el = results[i];
    	for(key in el){
    		if(key=='workphone'){
    			var call = "callExt(" + el[key] + ");";
    			htmlResults += key + ':  <b>' + el[key] + '  </b><input type="button" onclick=' + call + ' value="Call"/><br/>';
    		}
    		else{      				
				htmlResults += key + ':  <b>' + el[key] + '</b><br/>';
	   		}
		}
		htmlResults += '<br/>';
    }
    newDiv.innerHTML = htmlResults;

    document.getElementById('searchContacts').appendChild(newDiv);
}

function emptySearchContacts(){
	var cell = document.getElementById('searchContacts');
	if(cell.hasChildNodes()){
		while(cell.childNodes.length>=1){
			cell.removeChild(cell.firstChild);
		}
	}
}

function updateSearchContactsGui(obj){
	emptySearchContacts();
	var txtNode = document.createTextNode(obj.respMessage);
	document.getElementById('searchContacts').appendChild(txtNode);
}

function updateAckRedirectGui(obj){
	updateInfoCalling(obj);
}

function updateErrorRedirectGui(obj){
	updateInfoCalling(obj);
}

function updateHangupGui(obj){
	document.getElementById('info_calling').innerText = obj.respMessage;
	document.getElementById('buttoncall').style.display = 'none';
	document.getElementById('call_out_div').style.display = 'block';
	document.getElementById('address').style.display = 'block';
	document.getElementById('call').value = 'Call';
	document.getElementById('record').disabled = true;
	document.getElementById('call').disabled = false;
}

function updateCallConnectedGui(obj){
	document.getElementById('info_calling').innerText = obj.respMessage;
	document.getElementById('call').value = 'Calling...';
	document.getElementById('call').disabled = true;
	document.getElementById('redirect').disabled = false;
	document.getElementById('record').disabled = false;
}

function updateCallingGui(obj){
	document.getElementById('call_out_div').style.display = 'none';
	document.getElementById('login_div').style.display = 'none';
	document.getElementById('address').style.display = 'none';
	document.getElementById('buttoncall').style.display = 'block';
	document.getElementById('info_calling').innerText = 'Call incoming from ' + obj.from;
}

function updateLogoutGui(obj){
	document.getElementById('login_div').style.display = 'block';
	document.getElementById('logout_div').style.display = 'none';
	document.getElementById('dialout_div').style.display = 'none';
	document.getElementById('address').style.display = 'none';
}

function updateErrorCalling(obj){
	updateInfoCalling(obj);
	document.getElementById('call').value = 'Call';
	document.getElementById('call').disabled = false;
	document.getElementById('record').disabled = true;
}

function updateInfoLogin(obj){
	document.getElementById('info_login').innerText = obj.respMessage;
}

function updateAckLoginGui(){
	document.getElementById('login_div').style.display = 'none';
	document.getElementById('info_notification').style.display = 'none';
	document.getElementById('logout_div').style.display = 'block';
	document.getElementById('logout').value = "Logout " + localStorage.getItem('user');
	document.getElementById('dialout_div').style.display = 'block';
	document.getElementById('address').style.display = 'block';
}


	

