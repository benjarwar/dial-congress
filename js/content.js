$(document).ready(function() {
  var $body = $('body');
  var senateData;

  var scan = function() {
    $.each(senateData, function(i, senator) {
      var firstLastRegEx = new RegExp(senator.firstName + ' ' + senator.lastName);

      $body.highlightRegex(firstLastRegEx, {
        className: 'dial-congress',
        attrs: {
          'data-phone': senator.phone
        }
      });
    });
  }

  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    scan();
  })
});
