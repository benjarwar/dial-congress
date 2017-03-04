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

  // Set the taskbar icon.
  var iconData = active ? icons.active : icons.inactive;
  chrome.browserAction.setIcon({ path: iconData });
});
