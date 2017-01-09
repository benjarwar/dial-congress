$(document).ready(function() {
  var $body = $('body');
  var className = 'dial-congress';
  var senateData;

  var scan = function() {
    $.each(senateData, function(i, senator) {
      var firstLast = senator.firstName + '\\s+' + senator.lastName;
      var lastFirst = senator.lastName + ',\\s*' + senator.firstName;
      var withTitle = '(?:Senator\\s+|Sen.\\s+|Congressman\\s+|Congresswoman\\s+)(' + firstLast + '|' + senator.lastName + ')';
      var regExp = new RegExp(firstLast + '|' + lastFirst + '|' + withTitle, 'ig');

      $body.highlightRegex(regExp, {
        className: className,
        attrs: {
          'title': senator.party + '/' + senator.state + ': ' + senator.phone
        }
      });
    });
  }

  var createTooltips = function() {
    var $critters = $('.' + className);

    $critters.each(function(i, critter) {
      var $critter = $(critter);
      $critter.tooltipster({
        interactive: true
      });
    });
  }

  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    scan();
    createTooltips();
  })
});
