
callServerAPI(
  window.location.protocol,
  window.location.hostname,
  window.location.port ? ':' + window.location.port : '',
  '/webrest/streaming/open',
  { id: params.id }
);

window.onload = function () {
  $('.button').mouseout(function () {
    $(this).removeClass('mouseOverBut');
  });

  $('.button').mouseover(function () {
    $(this).addClass('mouseOverBut');
  });

  var params = getUrlParams();

  document.getElementById('stream-description').innerHTML = params.description;
  document.getElementById('stream-img').src = params.url + '?ie=' + (new Date()).getTime();

  if (!params.open || params.open === 'false') {
    document.getElementById('open-stream-but').style.display = 'none';
    document.getElementById('open-ctistream-but').style.width = '100%';
    $('#open-ctistream-but').css('background-position', '35%');
  }

  var argCtiStreamUrl = params.ctiProto + '://' + window.location.hostname +
    (window.location.port ? ':' + window.location.port : '') + '/cti/#/streaming';
  $('body').attr('arg', argCtiStreamUrl);
  $('#open-ctistream-but').attr('arg', argCtiStreamUrl);
};
