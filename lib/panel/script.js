"use strict";

const port = chrome.runtime.connect({"name": "get-pages"});

port.onMessage.addListener(function(response){
  console.debug("popup script received message through port: " + JSON.stringify(response));

  const panel = document.querySelector(".panel");
  panel.innerHTML = createPanelContent(response);
});


document.addEventListener("click", function(event) {
  //we have to ask the background script to open links because links in the panel don't open in tabs :-(
  if (event.target.nodeName == "A") {
    const a = event.target;
    const message = {
      "url": a.href,
      "id": a.id //currently this is unnecessary
    };
    port.postMessage(message);

    event.stopPropagation();
    event.preventDefault();
  }
});

function createPanelContent(sitesList) { //TODO: consider using the DOM node creation API instead
  return sitesList.reduce(function(html, site){
      let additionalClass = '';
      if(!site.active) additionalClass+='disabled' //TODO: behavior could be configurable
      return html +
        '<div class="panel-list-item '+additionalClass+'">' +
          //'<div class="icon"></div>' + //will be used in the future
          '<div class="text">' +
            '<a id="'+ site.id +'" href="'+ site.url +'">'+
              chrome.i18n.getMessage('site_'+ site.id) +
            '</a>'+
          '</div>'+
        '</div>'
  }, '');
}
