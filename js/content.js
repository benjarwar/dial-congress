var debug = false;
var isActive;
var senateData;
var houseData;
var congressData;
var lastNameChunkSize = 20;
var foundLastNamesQueue = [];
var innerTextMin = 0;
var pollInterval = 250;
var pollCount = -1;
var pollStart = null;
var debouncedProcessingStop;

var observer;
var observerConfig = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
};


/**
 * Builds a regex string that matches for various permutations of a
 * congressperson's name and potential titles.
 * @param {Object} critter - Contains data on a congressperson.
 * @return {string} A regex to match the congressperson's name permutations.
 */
function getRegExpString(critter) {
  var title = getTitle(critter);
  var quotedNicknames = getQuotedNicknames(critter);
  var firstNames = _.union([prepName(critter.firstName)], quotedNicknames);
  var middleNames = _.map(critter.middleNames, function(middleName) {
    return prepName(middleName);
  });
  var middleInitials = _.map(middleNames, function(middleName) {
    return middleName.charAt(0) + '\\.?';
  });

  var combinedMiddleNames = _.union(middleNames, middleInitials, quotedNicknames);

  var namePermutations = '(' + title + '\\s+)?';
  namePermutations += '(' + firstNames.join('|') + ')\\s+';

  if (combinedMiddleNames && combinedMiddleNames.length) {
    var middleNameCombos = '((' + combinedMiddleNames.join('|') + ')\\s+)?';
    namePermutations += middleNameCombos;
  }

  var lastName = prepName(critter.lastName);
  namePermutations += lastName;

  var titleLast = title + '\\s+' + lastName;

  var optionalJr = critter.junior ? ',?\\s+Jr\\.?' : '';
  var lastFirst = lastName + optionalJr + ',\\s+(' + firstNames.join('|') + ')';

  return '\\b(' + namePermutations + ')\\b|\\b(' + titleLast + ')\\b|\\b(' + lastFirst + ')\\b';
}


/**
 * Returns the title according which house the critter belongs to.
 * @param {Object} critter - Contains data on a congressperson.
 * @return {string} A regex string containing different titles.
 */
function getTitle(critter) {
  var title = '(Senator|Sen\\.|Congressman|Congresswoman)';

  if (critter.house === 'house') {
    title = '(Representative|Rep\\.|Congressman|Congresswoman)';
  }

  return title;
}


/**
 * Returns a regex string of nicknames wrapped in optional quotes.
 * @param {Object} critter - Contains data on a congressperson.
 * @return {string} A regex string of possibly quoted nicknames.
 */
function getQuotedNicknames(critter) {
  var quotedNicknames = [];
  var optOpenQuote = '[\'"‘“]?';
  var optCloseQuote = '[\'"’”]?';

  if (critter.nicknames) {
    quotedNicknames = _.map(critter.nicknames, function(nickname) {
      return optOpenQuote + prepName(nickname) + optCloseQuote;
    });
  }

  return quotedNicknames;
}


/**
 * Performs substitutions on various characters in a name string.
 * @param {string} name A name.
 * @return {string} The name with substitutions performed.
 */
function prepName(name) {
  name = name.replace('.', '\\.');
  name = name.replace(' ', '\\s+');
  name = name.replace('á', '[áa]');
  name = name.replace('é', '[ée]');
  name = name.replace('í', '[íi]');
  name = name.replace('ó', '[óo]');
  name = name.replace('ú', '[úu]');
  return name;
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

  // Only scan nodes with inner text longer than the minimum, and if they're not
  // Dial Congress related.
  if (!!node.innerText && node.innerText.length >= innerTextMin && !nodeIsDialCongressRelated) {
    var perfStart = performance.now();

    // Set processing state.
    setProcessingState(true);

    // Mark node as having been scanned.
    node.classList.add('dial-congress-scanned');

    // Check for last names in the node.
    var lastNamesRegExp = getLastNamesRegExp();
    var lastNames = node.innerText.match(lastNamesRegExp);

    // If last names are found, chunk/queue them for further MarkJS processing.
    if (lastNames) {
      chunk(_.uniq(lastNames), node);
    }

    // Disable processing state.
    debouncedProcessingStop();

    var perfEnd = performance.now();
    var perfTime = Math.round(perfEnd - perfStart) / 1000;
    logger('Dial Congress last names scan of ' + node + ': ' + perfTime + ' seconds');
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
  // Remove queued nodes that have since been removed from the DOM.
  cleanQueue();

  if (!!foundLastNamesQueue.length) {
    // Mark all permutations in the oldest node, according to last names found.
    markPermutations(foundLastNamesQueue[0].lastNames, foundLastNamesQueue[0].node);

    // Remove oldest from queue.
    foundLastNamesQueue.shift();
  }
}


/**
 * Removes any queued nodes that are no longer found in the DOM.
 */
function cleanQueue() {
  _.remove(foundLastNamesQueue, function (queuedItem) {
    // Returns true for removal if node is no longer in the body.
    return !document.body.contains(queuedItem.node);
  });
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

  setProcessingState(true);

  // For each found last name, build a full RegExp to find all permutations.
  for (var i = 0; i < congressData.length; i++) {
    if (lastNames.indexOf(congressData[i].lastName) > -1) {
      var senatorRegEx = '(' + getRegExpString(congressData[i]) + ')';
      lastNamesRegExpArr.push(senatorRegEx);
    }
  }

  debouncedProcessingStop();

  if (lastNamesRegExpArr.length) {
    setProcessingState(true);

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
        logger('Dial Congress marked chunk in: ' + perfTime + ' seconds');
        logger('Congress critters found: ' + x);
      }
    });

    // Set hover events for future tooltipping.
    bindHoverEvents();

    debouncedProcessingStop();
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

  // Tooltipster will not instantiate without a title attribute. Set the value
  // to the critter data.
  $el.attr('title', JSON.stringify(critter));

  // Instantiate the tooltip.
  $el.tooltipster({
    functionFormat: function(instance, helper, content) {
      // Get and parse the critter data.
      var critter = JSON.parse(instance.content());
      return getTooltipContent(critter);
    },
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
 * Builds the tooltipster content from critter data.
 * @param {Object} critter - Contains data on a congressperson.
 * @return {Object} A jQuery element instance containing the tooltip content.
 */
function getTooltipContent(critter) {
  var partyClass = 'dial-congress-tooltipster-party-ind';

  switch (critter.party) {
    case 'D':
      partyClass = 'dial-congress-tooltipster-party-dem';
      break;
    case 'R':
      partyClass = 'dial-congress-tooltipster-party-rep';
      break;
  }

  var contentString = '<div class="dial-congress-tooltipster-content">';
  contentString += '<div class="dial-congress-tooltipster-head">';
  contentString += '<span class="dial-congress-tooltipster-affiliation">';
  contentString += '<span class="' + partyClass + '">' + critter.party;
  contentString += '</span><span class="dial-congress-tooltipster-divider">';
  contentString += ' / </span>' + critter.state + '</span>';
  contentString += '<span class="dial-congress-tooltipster-house">';
  contentString += critter.house + '</span></div>';
  contentString += '<div class="dial-congress-tooltipster-body">';
  contentString += critter.phone + '</div></div>';

  return $(contentString);
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
 * Handles observed mutations to the DOM.
 * @param {Array<Object>} mutations The mutations registered by the observer.
 */
function handleDOMMutations(mutations) {
  setProcessingState(true);

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

  debouncedProcessingStop();
}


/**
 * Determine the shortest length of matchable text from different permutations
 * of the congress data.
 */
function setInnerTextMin() {
  congressData.forEach(function(critter) {
    // First and last name plus one space.
    var firstLastLength = critter.firstName.length + critter.lastName.length + 1;

    // Shortest title ("Sen." or "Rep.") plus last name plus one space.
    var titleLastLength = critter.lastName.length + 4;
    var nicknameLengths = [];

    if (critter.nicknames) {
      critter.nicknames.forEach(function(nickname) {
        // Nickname plus last name plus one space.
        nicknameLengths.push(nickname.length + critter.lastName.length + 1);
      });
    }

    // Combine the lengths candidates.
    var lengths = _.union([firstLastLength], [titleLastLength], nicknameLengths);

    // Determine shortest length for this critter.
    var min = Math.min.apply(null, lengths);

    // If shorter than current innerTextMin, set it.
    if (!innerTextMin || innerTextMin > min) {
      innerTextMin = min;
    }
  });
}


/**
 * Throttles requestAnimationFrame for periodic checking of the lastNamesQueue.
 * @param {number} timestamp Timestamp for the animation frame.
 */
function poll(timestamp) {
  if (pollStart === null) {
    pollStart = timestamp;
  }

  // Set the segment, the number of times that the pollInterval has been
  // exceeded since the start of polling.
  var segment = Math.floor((timestamp - pollStart) / pollInterval);

  if (segment > pollCount) {
    // We've hit a new segment.
    pollCount = segment;

    // If extension is active, process any queued last names.
    if (isActive) {
      checkLastNamesQueue();
    }
  }

  // Recursively poll.
  requestAnimationFrame(poll);
}


/**
 * Adds a conditional logic hook to only log if debug is true.
 * @param {string} message The message to log.
 */
function logger(message) {
  if (debug) {
    console.log(message);
  }
}


/**
 * Sends tracking data through the Chrome runtime, consumed in analytics.js.
 * @param {Object} data - Analytics data.
 */
function track(data) {
  chrome.runtime.sendMessage(data, function(response) {
    // logger('message received', response);
  });
}


/**
 * Sets the local active state for this tab/instance of the extension. Overall
 * state is managed in the background script toggle.js.
 * @param {boolean} active Whether or not the extension is active.
 */
function setActiveState(active) {
  if (active) {
    // If state has changed to active, set internal active state to true.
    isActive = true;

    // Remove previously set scanned class from the body, to ensure that
    // any DOM elements added while extension was inactive are scanned.
    document.body.classList.remove('dial-congress-scanned');

    // Scan the DOM.
    scan(document.body);

    // Watch for DOM changes.
    observer.observe(document.body, observerConfig);
  } else {
    // If state has changed to inactive, set internal active state to false.
    isActive = false;

    // Stop watching for DOM changes.
    observer.disconnect();

    // Remove all previously set Marks. Tooltipsters are bound to Marks, so
    // this also removes mouseenter listeners.
    var bodyContext = new Mark(document.body);
    bodyContext.unmark();

    // Clear the queue
    foundLastNamesQueue = [];
  }
}


/**
 * Gets the extension active state from the toggle.js background script.
 */
function getActiveState() {
  chrome.runtime.sendMessage({ eventName: 'get-active-state' }, function(response) {
    setActiveState(response);
  });
}


/**
 * Sets the processing state of the extension.
 * @param {Boolean} isProcessing Whether or not the extension is processing.
 */
function setProcessingState(isProcessing) {
  chrome.runtime.sendMessage({
    eventName: 'set-processing-state',
    processing: isProcessing
  });
}


/**
 * Initialize chrome runtime listeners.
 */
function initListeners() {
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.eventName) {
      case 'active-state':
        setActiveState(request.active);
        break;
    }
  });
}


/**
 * Gets the Senate and House JSON data.
 */
function getData() {
  $.when(
    // Gather and parse Senate data.
    $.get(chrome.extension.getURL('js/senate.json'), function(data) {
      senateData = JSON.parse(data);
      senateData.forEach(function(senator) {
        senator.house = 'senate';
      });
    }),

    // Gather and parse House of Representatives data.
    $.get(chrome.extension.getURL('js/house.json'), function(data) {
      houseData = JSON.parse(data);
      houseData.forEach(function(rep) {
        rep.house = 'house';
      });
    })
  ).then(init);
}


/**
 * Initialize Dial Congress.
 */
function init() {
  // Combine Senate and House data.
  congressData = _.union(senateData, houseData);

  // Set the minimum text threshold for scanning a node.
  setInnerTextMin();

  // Create a debouncer for turning off the processing state.
  debouncedProcessingStop = _.debounce(function() {
    setProcessingState(false);
  }, 500);

  // Initialize an observer to keep an eye out for changes to the DOM.
  observer = new MutationObserver(handleDOMMutations);

  // Initialize chrome runtime listeners.
  initListeners();

  // Get initial extension active state.
  getActiveState();

  // Use a throttled requestAnimationFrame to check the last names queue and
  // the active state of the extension.
  requestAnimationFrame(poll);
}


/**
 * On DOM ready.
 */
$(document).ready(getData);
