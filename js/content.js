var senateData;
var houseData;
var congressData;
var lastNameChunkSize = 20;
var foundLastNamesQueue = [];
var pollInterval;


/**
 * Builds a regex string that matches for various permutations of a
 * congressperson's name and potential titles.
 * @param {Object} critter - Contains data on a congressperson.
 * @return {string} A regex to match the congressperson's name permutations.
 */
function getRegExpString(critter) {
  var title = '(Senator|Sen\\.|Congressman|Congresswoman)';

  if (critter.house === 'house') {
    title = '(Representative|Rep\\.|Congressman|Congresswoman)';
  }

  var optionalQuote = '(\'|")?';
  var wildCardMiddle = optionalQuote + '(\\w*)(\\.)?' + optionalQuote;
  var upToTwoWildCardMiddles = '\\s*' + wildCardMiddle + '\\s*' + wildCardMiddle + '\\s*';
  var firstLast = '\\b' + critter.firstName + '\\b' + upToTwoWildCardMiddles + '\\b' + critter.lastName + '\\b';
  var lastFirst = '\\b' + critter.lastName + ',\\s*' + critter.firstName + '\\b';
  var titleLast = '\\b' + title + '\\s*' + critter.lastName + '\\b';
  var nicknames = '';
  var regExpString = '';

  function getNicknameString (nickname, lastName) {
    return '|\\b' + nickname + '\\b' + upToTwoWildCardMiddles + '\\b' + lastName + '\\b|\\b' + lastName + ',\\s*' + nickname + '\\b';
  }

  if (critter.nicknames) {
    if (Array.isArray(critter.nicknames)) {
      for (var i = 0; i < critter.nicknames.length; i++) {
        nicknames += getNicknameString(critter.nicknames[i], critter.lastName);
      }
    } else if (typeof critter.nicknames === 'string') {
      nicknames += getNicknameString(critter.nicknames[i], critter.lastName);
    }
  }

  regExpString += title + '?' + '(' + firstLast + nicknames + ')|' + titleLast + '|' + lastFirst;

  return regExpString;
}

/**
 * Builds a regex of all congressperson's last names, to provide an initial
 * searching mechanism that is less processor intensive than searching for all
 * name permutations of each congressperson.
 * @return {RegExp} A RegExp object containing "or" conditionalized last names.
 */
function getLastNamesRegExp() {
  var lastNamesRegExpArr = [];

  for (var i = 0; i < congressData.length; i++) {
    lastNamesRegExpArr.push(congressData[i].lastName);
  }

  // Sort by longer names first, to catch the "Blunt" issue. The last name
  // "Blunt Rochester" was not properly matched, because there's also a last
  // name of "Blunt" that appeared earlier in the array.
  lastNamesRegExpArr.sort(function(a, b) {
    return b.length - a.length;
  });

  return new RegExp(lastNamesRegExpArr.join('|'), 'ig');
}


/**
 * Performs an inital scan of a DOM node for all congresspersons' last names.
 * @param {HTMLElement} node - A DOM node to be scanned.
 */
function scan(node) {
  var nodeIsDialCongressRelated = checkIfDialCongress(node) || checkIfTooltipster(node);

  if (!!node.innerText && !nodeIsDialCongressRelated) {
    var perfStart = performance.now();

    node.classList.add('dial-congress-scanned');

    var lastNamesRegExp = getLastNamesRegExp();
    var lastNames = node.innerText.match(lastNamesRegExp);

    if (lastNames) {
      chunk(_.uniq(lastNames), node);
    }

    var perfEnd = performance.now();
    var perfTime = Math.round(perfEnd - perfStart) / 1000;
    console.log('Dial Congress last names scan of ' + node + ': ' + perfTime + ' seconds');
  }
}


/**
 * Chunks a list of last names found in a DOM node for future batch processing.
 * @param {Array<string>} lastNames - An array of found last names.
 * @param {HTMLElement} ndoe - The node in which the last names were found.
 */
function chunk(lastNames, node) {
  var chunkedLastNames = _.chunk(lastNames, lastNameChunkSize);

  chunkedLastNames.forEach(function(chunk) {
    foundLastNamesQueue.push({
      node: node,
      lastNames: chunk
    });
  });
}


/**
 * Checks to see if there's anything in the foundLastNamesQueue; if so, sends
 * the oldest to be fully marked according to all name permutations.
 */
function checkLastNamesQueue() {
  if (!!foundLastNamesQueue.length) {
    markPermutations(foundLastNamesQueue[0].lastNames, foundLastNamesQueue[0].node);
    foundLastNamesQueue.shift();
  }
}


/**
 * Marks all permutations of found congresspersons in a given node.
 * @param {Array<string>} lastNames - An array of found last names.
 * @param {HTMLElement} ndoe - The node in which the last names were found.
 */
function markPermutations(lastNames, node) {
  var lastNamesRegExpArr = [];
  var lastNamesRegExp;
  var markContext;
  var perfStart = performance.now();

  // For each found last name, build a full RegExp to find all permutations.
  for (var i = 0; i < congressData.length; i++) {
    if (lastNames.indexOf(congressData[i].lastName) > -1) {
      var senatorRegEx = '(' + getRegExpString(congressData[i]) + ')';
      lastNamesRegExpArr.push(senatorRegEx);
    }
  }

  if (lastNamesRegExpArr.length) {
    // Create a single, massive RegExp for all found last names in the node.
    lastNamesRegExp = new RegExp(lastNamesRegExpArr.join('|'), 'ig');

    // Create a context for MarkJS.
    markContext = new Mark(node);

    // Wrap matches with a span tag.
    markContext.markRegExp(lastNamesRegExp, {
      element: 'span',
      className: 'dial-congress',
      done: function(x) {
        var perfEnd = performance.now();
        var perfTime = Math.round(perfEnd - perfStart) / 1000;
        console.log('Dial Congress marked chunk in: ' + perfTime + ' seconds');
        console.log('Congress critters found: ' + x);
      }
    });

    // Set hover events for future tooltipping.
    bindHoverEvents();
  }
}


/**
 * Sets a mousenter event on any dial congress marks without mouseenter binds.
 */
function bindHoverEvents() {
  $marks = $('.dial-congress').not(function() {
    return $(this).hasClass('dial-congress-mouseenter');
  });

  $marks.each(function(i, mark) {
    var $mark = $(mark);

    $mark.addClass('dial-congress-mouseenter');
    $mark.on('mouseenter', matchSenatorToMark);
  });
}


/**
 * Callback for marks' mouseenter event. Because we're searching an a node with
 * a full RegExp containing all permutations of all found last names, we don't
 * yet know *which* congressperson has been marked. Doing the final check on
 * mousenter was more performant than building all tooltips before they're
 * needed.
 * @param {Event} e - A mouseenter event.
 */
function matchSenatorToMark(e) {
  var $el = $(e.target);
  var text = $el.text();

  // Iterate through all congresspersons until a match is found.
  for(var i = 0; i < congressData.length; i++) {
    var regExp = new RegExp(getRegExpString(congressData[i]), 'ig');

    if (text.match(regExp)) {
      // Build the tooltipster.
      buildTooltip($el, congressData[i]);

      // Remove the mouseenter event.
      $el.off('mouseenter', matchSenatorToMark);
      break;
    }
  }
}


/**
 * Build a jQuery Tooltipster containing the congressperson's data.
 * @param {Object} $el - A jQuery object for the element receiving the tooltip.
 * @param {Object} critter - Data for the matched congressperson.
 */
function buildTooltip($el, critter) {
  track({
    eventName: 'tooltip-built',
    congressman: critter.firstName + ' ' + critter.lastName,
    text: $el.text()
  });

  $el.attr('title', critter.party + '/' + critter.state + ': ' + critter.phone);

  $el.tooltipster({
    functionReady: function() {
      track({
        eventName: 'tooltip-hover',
        congressman: critter.firstName + ' ' + critter.lastName,
        text: $el.text()
      });
    },
    interactive: true,
    theme: ['tooltipster-noir', 'tooltipster-noir-customized']
  });

  $el.tooltipster('open');
}


/**
 * Utility to ensure a node has a classList. Occasionally, the
 * MutationObserver in watchForDOMChanges sends null objects or empty strings.
 * @param {?HTMLElement} node - A DOM node.
 * @return {boolean} Whether or not the node has value and classList attribute.
 */
function checkIfNode(node) {
  return !!node && !!node.classList;
}


/**
 * Utililty to check if the node is a tooltipster element.
 * @param {HTMLElement} node - A DOM node.
 * @return {boolean} Whether or not the node is a tooltipster element.
 */
function checkIfTooltipster(node) {
  if (!checkIfNode(node)) {
    return false;
  }

  return node.classList.contains('tooltipster-base') ||
         node.classList.contains('tooltipster-ruler') ||
         node.classList.contains('tooltipstered');
}


/**
 * Utililty to check if the node is a Dial Congress element.
 * @param {HTMLElement} node - A DOM node.
 * @return {boolean} Whether or not the node is a Dial Congress element.
 */
function checkIfDialCongress(node) {
  if (!checkIfNode(node)) {
    return false;
  }

  return node.classList.contains('dial-congress') ||
         node.classList.contains('dial-congress-scanned');
}


/**
 * Watches DOM for changes. Sends mutated nodes for scanning when applicable.
 */
function watchForDOMChanges() {
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        // Check nodes that have been added to the DOM.
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType == 1) {
            // Node is an Element. Scan it.
            scan(node);
          } else if (node.nodeType == 3
                  && node.parentNode
                  && !checkIfDialCongress(node.previousElementSibling)) {
            // Node is Text. If not already wrapped by a Dial Congress span,
            // scan its parentNode.
            scan(node.parentNode);
          }
        })
      } else if (mutation.target && !!mutation.target.innerText) {
        if ($(mutation.target).is(':visible')) {
          // Check nodes that had their attributes or characterData changed.
          var tooltipsterRemoved = false;

          // Check if a tooltipster was been removed. We don't want to scan if
          // the mutation was triggered by us.
          for(var i = 0; i < mutation.removedNodes.length; i++) {
            if (checkIfTooltipster(mutation.removedNodes[i])) {
              tooltipsterRemoved = true;
              break;
            }
          }

          if (!tooltipsterRemoved) {
            scan(mutation.target);
          }
        }
      }
    });
  });

  var observerConfig = {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true
  };

  var targetNode = document.body;
  observer.observe(targetNode, observerConfig);
}


/**
 * Sends tracking data through the Chrome runtime, consumed in analytics.js.
 * @param {Object} data - Analytics data.
 */
function track(data) {
  chrome.runtime.sendMessage(data, function(response) {
    // console.log('message received', response);
  });
}


/**
 * On DOM ready.
 */
$(document).ready(function() {
  $.when(
    // Gather Senate data.
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
      senateData.forEach(function(senator) {
        senator.house = 'senate';
      });
    }),

    // Gather House of Representatives data.
    $.get(chrome.extension.getURL('js/house.json'), function(data) {
      houseData = JSON.parse(data);
      houseData.forEach(function(rep) {
        rep.house = 'house';
      });
    })
  ).then(function() {
    // Combine Senate and House data.
    congressData = _.union(senateData, houseData);

    // Kick off initial scan of the entire DOM.
    scan(document.body);

    // Keep an eye out for changes to the DOM.
    watchForDOMChanges();

    // Poll the queue of found last names for marking.
    pollInterval = setInterval(checkLastNamesQueue, 500);
  });
});
