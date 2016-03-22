function getUrlParams() {
  var match;
  var pl = /\+/g; // Regex for replacing addition symbol with a space
  var search = /([^&=]+)=?([^&]*)/g;

  var decode = function (s) {
    return decodeURIComponent(s.replace(pl, ' '));
  };

  var query = window.location.search.substring(1);

  var urlParams = {};
  match = search.exec(query);

  while (match) {
    urlParams[decode(match[1])] = decode(match[2]);
    match = search.exec(query);
  }

  return urlParams;
}

function ajaxBeforeSend(xhr) {
  xhr.setRequestHeader('Authorization', $userInfo.username + ':' + $userInfo.token);
}

var callServerAPI = function (protocol, host, port, url, data) {
  var params = getUrlParams();
  var url = protocol + '//' + host + (port ? ':' + port : '') + url;

  $.ajax({
    url: url,
    type: 'POST',
    data: data,
    beforeSend: ajaxBeforeSend,
  });
};
