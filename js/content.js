$(document).ready(function() {
  var senateData;

  $.when(
    $.get(chrome.extension.getURL("js/senate.json"), function(data) {
      senateData = data;
    })
  ).then(function() {

  })
});
