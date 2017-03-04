var active = true;

var icons = {
  active: {
    '19': 'img/icon-19.png',
    '38': 'img/icon-38.png'
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
  }
});

// Toggle active state.
chrome.browserAction.onClicked.addListener(function (e) {
  active = !active;

  // Set the taskbar icon.
  var iconData = active ? icons.active : icons.inactive;
  chrome.browserAction.setIcon({ path: iconData });
});
