var mark;
var senateData;
var perfStart = performance.now();

function getRegExpString(senator) {
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

  return regExpString;
}

function scan() {
  var allSenatorsRegExpString = '';

  for (var i = 0; i < senateData.length; i++) {
    var divider = i < (senateData.length - 1) ? '|' : '';
    var senatorRegEx = getRegExpString(senateData[i]);
    allSenatorsRegExpString += '(' + senatorRegEx + ')' + divider;
  }

  var allSenatorsRegExp = new RegExp(allSenatorsRegExpString, 'ig');

  mark.markRegExp(allSenatorsRegExp, {
    element: 'span',
    className: 'dial-congress',
    done: function(x) {
      var perfEnd = performance.now();
      var perfTime = Math.round(perfEnd - perfStart) / 1000;
      console.log('Dial Congress scan of complete: ' + perfTime + ' seconds');
      console.log('Congress critters found: ' + x);
    }
  });

  bindHoverEvents();
}

function bindHoverEvents() {
  $marks = $('.dial-congress');
  $marks.on('mouseenter', matchSenatorToMark);
}

function matchSenatorToMark(e) {
  var $el = $(e.target);
  var text = $el.text();

  for(var i = 0; i < senateData.length; i++) {
    var regExp = new RegExp(getRegExpString(senateData[i]), 'ig');

    if (text.match(regExp)) {
      buildTooltip($el, senateData[i]);
      $el.off('mouseenter', matchSenatorToMark);
      break;
    }
  }
}

function buildTooltip($el, senator) {
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

  $el.tooltipster('open');
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
