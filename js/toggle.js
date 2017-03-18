var active = true;
var processing = true;
var processingInterval;
var processingFrame = 0;


var icons = {
  active: {
    '19': 'img/icon-19.png',
    '38': 'img/icon-38.png'
  },
  processing: {
    '19': 'img/icon-processing-19.png',
    '38': 'img/icon-processing-38.png'
  },
  inactive: {
    '19': 'img/icon-inactive-19.png',
    '38': 'img/icon-inactive-38.png'
  }
}


// Listen for state request.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.eventName) {
    case 'get-active-state':
      sendResponse(active);
      break;
    case 'set-processing-state':
      setProcessing(request.processing);
      break;
  }
});


// Listen for new tab to be activated.
chrome.tabs.onActivated.addListener(function(activeInfo) {
  setProcessing(false);
});


// Toggle active state.
chrome.browserAction.onClicked.addListener(function (e) {
  active = !active;

  // Send message with active state to all tabs.
  chrome.tabs.query({}, function(tabs) {
    var data = {
      eventName: 'active-state',
      active: active
    };

    for (var i=0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, data);
    }
  });

  // Set icon.
  setActiveIcon();
});


/**
 * Sets the icon to active or inactive state.
 */
function setActiveIcon() {
  // Set icon to active or inactive state.
  var iconData = active ? icons.active : icons.inactive;
  setIcon(iconData);
}


/**
 * Sets the processing state and icon.
 * @param {boolean} isProcessing Whether or not the extension is processing.
 */
function setProcessing(isProcessing) {
  processing = isProcessing;

  if (processing && !processingInterval) {
    // If we're in a processing state, start animation the icon.
    processingInterval = setInterval(processAnimation, 100);
  } else if (!processing) {
    // Otherwise, clear the interval.
    clearProcessingInterval();

    // Set icon to active/inactive state.
    setActiveIcon();
  }
}


/**
 * Animates the icon by alternating between processing and active icons.
 */
function processAnimation() {
  // Only animate if extension is active.
  if (active) {
    // Get icon data.
    var iconData = processingFrame ? icons.processing : icons.active;

    // Set icon data.
    setIcon(iconData);

    // Reverse frame for next iteration.
    processingFrame = processingFrame ? 0 : 1;
  } else {
    // Otherwise, clear the interval.
    clearProcessingInterval();

    // And set the icon to inactive state.
    setActiveIcon();
  }
}


/**
 * Clears the processing animation interval.
 */
function clearProcessingInterval() {
  clearInterval(processingInterval);
  processingInterval = null;
}


/**
 * Sets the icon paths.
 * @param {Object} iconData An object containing icon sizes and paths.
 */
function setIcon(iconData) {
  chrome.browserAction.setIcon({ path: iconData });
}

