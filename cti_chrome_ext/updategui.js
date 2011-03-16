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
    			htmlResults += key + ':  <b><a href="#" onclick=' + call + '>' + el[key] + '</a></b><br/>';
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
	//document.getElementById('call_out_div').style.display = 'block';
	//document.getElementById('address').style.display = 'block';
	//document.getElementById('call').value = 'Call';
	document.getElementById('record').disabled = true;
	//document.getElementById('call').disabled = false;
}

function updateCallConnectedGui(obj){
	$('#buttoncall').show();
	document.getElementById('info_calling').innerText = obj.respMessage;
	//document.getElementById('call').value = 'Calling...';
	//document.getElementById('call').disabled = true;
	document.getElementById('redirect').disabled = false;
	document.getElementById('record').disabled = false;
}

function updateCallingGui(obj){
	$('#buttoncall').show();
	document.getElementById('info_calling').innerText = 'Call incoming from ' + obj.from;
}

function updateLogoutGui(obj){

	$('#logout').hide();
	$('#tabs').hide();
	$('#login_page').show();
	
}

function updateErrorCalling(obj){
	updateInfoCalling(obj);
	//document.getElementById('call').value = 'Call';
	//document.getElementById('call').disabled = false;
	document.getElementById('record').disabled = true;
}

function updateInfoLogin(obj){
	document.getElementById('info_login').innerText = obj.respMessage;
}

function updateAckLoginGui(){
	$('#buttoncall').hide();
	$('#info_login').text("");
	$('#login_page').hide();
	$('#tabs').show();
	$('#tabs').tabs("select", 1);
	$('.tab_login').hide();

	$('.tab_phonebook').show();
	$('.tab_history').show();
	$('#logout').show();
	
}
function addTabDialing(obj){
	
	$("#tabs").tabs("remove", 3);
	$("#tabs").tabs("add", "#tabs-3", "Customer card");
	$('#tabs').tabs('select', 3);
	
	var content = '';
	if(obj.customerCard!=undefined && obj.customerCard!=null){
		content = createPhonebookHTMLPage(obj.customerCard[0]);
		
	}
	else{
		content = '<h3>No data</h3>';
	}
	console.log("content = " + content);
	localStorage.removeItem('lastCustomerCard');
	localStorage.setItem('lastCustomerCard', content);
	
	$('#tabs-3').append(content);
}


/*
 * Create the HTML page of customer card. This is created from template.
 * The parameter represents the response query executed in database.
 */ 
createPhonebookHTMLPage = function(phonebook){

	var dynamicHtml = '<h3>' + phonebook.name + '</h3>';

	for(var key in phonebook){
	
		if(key=='workphone'){
    		var call = "callExt(" + phonebook[key] + ");";
    		dynamicHtml += key + ':  <a href="#" onclick=' + call + '>' + phonebook[key] + '</a><br/>';
    	}
    	else{      				
			dynamicHtml += key + ': <a href="">' + phonebook[key] + '</a><br/>';
		}
	}
	return dynamicHtml;
}



	
