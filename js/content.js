$(document).ready(function() {
  var $body = $('body');
  var senateData;

  var scan = function() {
    $.each(senateData, function(i, senator) {
      var firstLast = senator.firstName + '\\s+' + senator.lastName;
      var lastFirst = senator.lastName + ',\\s*' + senator.firstName;
      var withTitle = '(?:Senator\\s+|Sen.\\s+|Congressman\\s+|Congresswoman\\s+)(' + firstLast + '|' + senator.lastName + ')';
      var regExp = new RegExp(firstLast + '|' + lastFirst + '|' + withTitle, 'ig');

      $body.highlightRegex(regExp, {
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
