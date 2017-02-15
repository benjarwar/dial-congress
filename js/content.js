var mark;
var senateData;
var perfStart;

function getRegExpString(senator) {
  var title = '(Senator|Sen\\.|Congressman|Congresswoman)';
  var optionalQuote = '(\'|")?';
  var wildCardMiddle = optionalQuote + '(\\w*)(\\.)?' + optionalQuote;
  var upToTwoWildCardMiddles = '\\s*' + wildCardMiddle + '\\s*' + wildCardMiddle + '\\s*';
  var firstLast = '\\b' + senator.firstName + '\\b' + upToTwoWildCardMiddles + '\\b' + senator.lastName + '\\b';
  var lastFirst = '\\b' + senator.lastName + ',\\b' + senator.firstName + '\\b';
  var titleLast = '\\b' + title + '\\s*' + senator.lastName + '\\b';
  var nicknames = '';
  var regExpString = '';

  function getNicknameString (nickname, lastName) {
    return '|\\b' + nickname + '\\b' + upToTwoWildCardMiddles + '\\b' + lastName + '\\b|\\b' + lastName + '\\b,\\b' + nickname + '\\b';
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

  regExpString += title + '?' + '(' + firstLast + nicknames + ')|' + titleLast + '|' + lastFirst;

  return regExpString;
}

function getLastNamesRegExp() {
  var lastNamesRegExpArr = [];

  for (var i = 0; i < senateData.length; i++) {
    lastNamesRegExpArr.push('\\b' + senateData[i].lastName + '\\b');
  }

  return new RegExp(lastNamesRegExpArr.join('|'), 'ig');
}

function scan() {
  var lastNamesRegExp = getLastNamesRegExp();
  var foundLastNames = dedupeArray(document.body.innerText.match(lastNamesRegExp));
  var foundLastNamesRegExpArr = [];
  var foundLastNamesRegExp;

  for (var i = 0; i < senateData.length; i++) {
    if (foundLastNames.indexOf(senateData[i].lastName) > -1) {
      var senatorRegEx = '(' + getRegExpString(senateData[i]) + ')';
      foundLastNamesRegExpArr.push(senatorRegEx);
    }
  }

  if (foundLastNamesRegExpArr.length) {
    foundLastNamesRegExp = new RegExp(foundLastNamesRegExpArr.join('|'), 'ig');

    mark.markRegExp(foundLastNamesRegExp, {
      element: 'span',
      className: 'dial-congress',
      done: function(x) {
        var perfEnd = performance.now();
        var perfTime = Math.round(perfEnd - perfStart) / 1000;
        console.log('Dial Congress scan of DOM complete: ' + perfTime + ' seconds');
        console.log('Congress critters found: ' + x);
      }
    });

    bindHoverEvents();
  }
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


// https://davidwalsh.name/mutationobserver-api
(function(){

var observer = new MutationObserver(function(mutations) {
	// For the sake of...observation...let's output the mutation to console to see how this all works
	mutations.forEach(function(mutation) {
		console.log(mutation.type);
	});
});

// Notify me of everything!
var observerConfig = {
	attributes: true,
	childList: true,
	characterData: true
};

// Node, config
// In this case we'll listen to all changes to body and child nodes
var targetNode = document.body;
observer.observe(targetNode, observerConfig);

})();

function track(data) {
  chrome.runtime.sendMessage(data, function(response) {
    // console.log('message received', response);
  });
}

function dedupeArray(a) {
  var seen = {};
  var out = [];
  var len = a.length;
  var j = 0;
  for(var i = 0; i < len; i++) {
    var item = a[i];
    if(seen[item] !== 1) {
      seen[item] = 1;
      out[j++] = item;
    }
  }
  return out;
}

$(document).ready(function() {
  $.when(
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
    })
  ).then(function() {
    perfStart = performance.now();
    mark = new Mark(document.body);
    scan();
  });
});
