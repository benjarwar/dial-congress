var i = 0;
var mark;
var senateData;

function getRegExp(senator) {
  var title = '(Senator|((?!([A-Z0-9])).|^)Sen.|Congressman|Congresswoman)\\s*';
  var optionalTitle = '(' + title + ')?';
  var optionalQuote = '(\'|")?';
  var wildCardMiddle = optionalQuote + '(\\w*)(\\.)?' + optionalQuote;
  var upToTwoWildCardMiddles = '\\s*' + wildCardMiddle + '\\s*' + wildCardMiddle + '\\s*';
  var firstLast = optionalTitle + '\\b' + senator.firstName + '\\b' + upToTwoWildCardMiddles + '\\b' + senator.lastName + '\\b';
  var lastFirst = '\\b' + senator.lastName + ',\\s*' + senator.firstName + '\\b';
  var titleLast = title + '\\b' + senator.lastName + '\\b';
  var nicknames = '';
  var regExpString = '';

  function getNicknameString (nickname, lastName) {
    return '|' + optionalTitle + '\\b' + nickname + '\\b' + upToTwoWildCardMiddles + '\\b' + lastName + '\\b|\\b' + lastName + '\\b,\\b' + nickname + '\\b';
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

  regExpString += firstLast + '|' + lastFirst + '|' + titleLast + nicknames;

  return new RegExp(regExpString, 'ig');
}

function scanForSenator(i) {
  var senator = senateData[i];
  var regExp = getRegExp(senator);

  mark.markRegExp(regExp, {
    element: 'span',
    className: 'dial-congress',
    each: function(el) {
      buildTooltip(el, senator);
    }
  });
}

function buildTooltip(el, senator) {
  var $el = $(el);

  track({
    eventName: 'tooltip-built',
    congressman: senator.firstName + ' ' + senator.lastName,
    text: $el.text()
  });

  $el.attr('title', senator.party + '/' + senator.state + ': ' + senator.phone);

  $el.tooltipster({
    functionReady: function() {
      track({
        eventName: 'tooltip-hover',
        congressman: senator.firstName + ' ' + senator.lastName,
        text: $el.text()
      });
    },
    interactive: true,
    theme: ['tooltipster-noir', 'tooltipster-noir-customized']
  });
}

function scan() {
  scanForSenator(i);

  if (i < senateData.length - 1) {
    i++;
    setTimeout(scan, 5);
  }
}

function track(data) {
  chrome.runtime.sendMessage(data, function(response) {
    // console.log('message received', response);
  });
}

$(document).ready(function() {
  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    mark = new Mark(document.body);
    scan();
  });
});
