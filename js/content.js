$(document).ready(function() {
  var $body = $('body');
  var className = 'dial-congress';
  var senateData;

  var scan = function() {
    console.log('dial-congress scanning...');

    var t0 = performance.now();
    var context = document.body;
    var instance = new Mark(context);
    var i = 0;

    function scanForSenator() {
      var senator = senateData[i];
      var firstLast = senator.firstName + '\\s+' + senator.lastName;
      var lastFirst = senator.lastName + ',\\s*' + senator.firstName;
      var withTitle = '(?:Senator\\s+|Sen.\\s+|Congressman\\s+|Congresswoman\\s+)(' + firstLast + '|' + senator.lastName + ')';
      var regExp = new RegExp(firstLast + '|' + lastFirst + '|' + withTitle, 'ig');

      console.log('looking for ' + senator.firstName + ' ' + senator.lastName);

      instance.markRegExp(regExp, {
        element: 'span',
        className: className,
        each: function(el) {
          el.setAttribute('title', senator.party + '/' + senator.state + ': ' + senator.phone);

          $(el).tooltipster({
            interactive: true
          });
        }
      });

      if (i < senateData.length - 1) {
        i++;
        setTimeout(scanForSenator, 5);
      } else {
        console.log('dial-congress total scan time: ' + (performance.now() - t0));
      }
    }

    scanForSenator();
  }

  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    scan();
  })
});
