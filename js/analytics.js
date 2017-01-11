var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-50555359-3']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.eventName) {
    case 'tooltip-built':
      _gaq.push(['_trackEvent', 'Tooltip Built', request.congressman, request.text])
      break;
    case 'tooltip-hover':
      _gaq.push(['_trackEvent', 'Tooltip Hover', request.congressman, request.text])
      break;
  }

  // sendResponse(request);
});
