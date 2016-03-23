window.onload = function () {
  $('.button').mouseout(function () {
    $(this).removeClass('mouseOverBut');
  });

  $('.button').mouseover(function () {
    $(this).addClass('mouseOverBut');
  });

  var params = getUrlParams();

  if (params.callerName) {
    document.getElementById('contact-name').innerHTML = params.callerName;
    document.getElementById('contact-num').innerHTML = params.callerNum;
  } else {
    document.getElementById('contact-name').innerHTML = params.callerNum;
  }

  if (params.answerAction === 'true') {
    $('#answer').show();
  } else {
    $('#hangup').css('width', '100%');
  }

  var argCtiUrl = params.ctiProto + '://' + window.location.hostname +
    (window.location.port ? ':' + window.location.port : '') + '/cti';

  var argCtiCCUrl = params.ctiProto + '://' + window.location.hostname +
    (window.location.port ? ':' + window.location.port : '') +
    '/cti/#/customerCard/search/' + params.callerNum;

  $('body').attr('arg', argCtiUrl);
  $('#open-cticc-but').attr('arg', argCtiCCUrl);

  if (!(params.webrtc === 'true')) {
    $('#answer').attr('cmd', 'url');
    $('#answer').attr('arg', argCtiCCUrl);
  }

  // Handle Hangup button click
  $('#hangup').click(function () {
    // Call api
    callServerAPI(
      window.location.protocol,
      window.location.hostname,
      window.location.port ? ':' + window.location.port : '',
      '/webrest/astproxy/hangup_channel',
      {
        channel: params.channel,
        endpointType: 'extension',
        endpointId: params.dialExten,
      }
    );
  });

  // Handle Answer button click
  $('#answer').click(function () {
    // Call api
    callServerAPI(
      window.location.protocol,
      window.location.hostname,
      window.location.port ? ':' + window.location.port : '',
      params.webrtc === 'true' ? '/webrest/astproxy/answer_webrtc' :
        '/webrest/astproxy/answer',
      {
        endpointType: 'extension',
        endpointId: params.dialExten,
      }
    );
  });
};
