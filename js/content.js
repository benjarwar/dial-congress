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
      var title = '(Senator|Sen.|Congressman|Congresswoman)\\s*';
      var wildCardMiddle = '\\s*?(\'|")?(?:\\w*).?(\'|")?\\s*?';
      var upToTwoWildCardMiddles = '\\s' + wildCardMiddle + wildCardMiddle;
      var firstLastWithOptMiddle = senator.firstName + upToTwoWildCardMiddles + senator.lastName;
      var lastFirst = senator.lastName + ',\\s*' + senator.firstName;
      var withTitle = title + '(' + firstLastWithOptMiddle + '|' + senator.lastName + ')';
      var nicknames = '';

      function getNicknameString (nickname, lastName) {
        return '|(' + title + ')?' + nickname + upToTwoWildCardMiddles + lastName;
      }

      if (senator.nicknames) {
        if (Array.isArray(senator.nicknames)) {
          for (var j = 0; j < senator.nicknames.length; j++) {
            nicknames += getNicknameString(senator.nicknames[j], senator.lastName);
          }
        } else if (typeof senator.nicknames === 'string') {
          nicknames += getNicknameString(senator.nicknames[j], senator.lastName);
        }
      }

      var regExpString = firstLastWithOptMiddle + '|' + lastFirst + '|' + withTitle + nicknames;
      var regExp = new RegExp(regExpString, 'ig');

      console.log('looking for ' + senator.firstName + ' ' + senator.lastName);

      instance.markRegExp(regExp, {
        element: 'span',
        className: className,
        each: function(el) {
          el.setAttribute('title', senator.party + '/' + senator.state + ': ' + senator.phone);

          $(el).tooltipster({
            interactive: true,
            theme: ['tooltipster-noir', 'tooltipster-noir-customized']
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
