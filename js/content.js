$(document).ready(function() {
  var className = 'dial-congress';
  var i = 0;
  var senateData;
  var context = document.body;
  var instance = new Mark(context);
  var t0 = performance.now();

  function getRegExpString(senator) {
    var title = '(Senator|((?!([A-Z0-9])).|^)Sen.|Congressman|Congresswoman)\\s*';
    var optionalTitle = '(' + title + ')?';
    var wildCardMiddle = '\\s*?(\'|")?(?:\\w*).?(\'|")?\\s*?';
    var upToTwoWildCardMiddles = '\\s' + wildCardMiddle + wildCardMiddle;
    var firstLast = optionalTitle + senator.firstName + upToTwoWildCardMiddles + senator.lastName;
    var titleLast = title + senator.lastName;
    var lastFirst = senator.lastName + ',\\s*' + senator.firstName;
    var nicknames = '';

    function getNicknameString (nickname, lastName) {
      return '|' + optionalTitle + nickname + upToTwoWildCardMiddles + lastName + '|' + senator.lastName + ',\\s*' + nickname;
    }

    if (senator.nicknames) {
      if (Array.isArray(senator.nicknames)) {
        for (var i = 0; i < senator.nicknames.length; i++) {
          nicknames += getNicknameString(senator.nicknames[i], senator.lastName);
        }
      } else if (typeof senator.nicknames === 'string') {
        nicknames += getNicknameString(senator.nicknames[i], senator.lastName);
      }
    }

    return firstLast + '|' + lastFirst + '|' + titleLast + nicknames;
  }

  function scanForSenator(i) {
    var senator = senateData[i];
    var regExpString = getRegExpString(senator);
    var regExp = new RegExp(regExpString, 'ig');

    console.log('looking for ' + senator.firstName + ' ' + senator.lastName);

    instance.markRegExp(regExp, {
      element: 'span',
      className: className,
      each: function(el) {
        buildTooltip(el, senator);
      }
    });
  }

  function buildTooltip(el, senator) {
    el.setAttribute('title', senator.party + '/' + senator.state + ': ' + senator.phone);

    $(el).tooltipster({
      interactive: true,
      theme: ['tooltipster-noir', 'tooltipster-noir-customized']
    });
  }

  function scan() {
    scanForSenator(i);

    if (i < senateData.length - 1) {
      i++;
      setTimeout(scan, 5);
    } else {
      console.log('dial-congress total scan time: ' + (performance.now() - t0));
    }
  }

  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    console.log('dial-congress scanning...');
    scan();
  })
});
