import { browser } from 'webextension-polyfill-ts'
import { SelectedSite } from '../background/main-script';

const port = browser.runtime.connect();

port.onMessage.addListener(function (response: SelectedSite[]) {
  console.debug("popup script received message through port: " + JSON.stringify(response));

  replacePanelContent(response);
});


document.addEventListener("click", function (event: Event) {
  //we have to ask the background script to open links because links in the panel don't open in tabs :-(
  // @ts-ignore
  if (event.target.nodeName == "A") {
    const a = event.target as HTMLAnchorElement;
    const message = {
      "url": a.href,
      "id": a.id //currently this is unnecessary
    };
    port.postMessage(message);

    event.stopPropagation();
    event.preventDefault();
  }
});

function replacePanelContent(sitesList: SelectedSite[]) {
  const panel = document.querySelector(".panel");

  sitesList.forEach(function (site) {
    let additionalClass = '';
    if (!site.active) additionalClass += 'disabled' //TODO: behavior could be configurable by user

    const anchor = document.createElement('a');
    anchor.id = site.id;
    anchor.href = site.url;
    anchor.textContent = browser.i18n.getMessage(`site_${site.id}`);

    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.appendChild(anchor);

    const listItem = document.createElement('div');
    listItem.className = `panel-list-item ${additionalClass}`;
    listItem.appendChild(textDiv);

    panel!.appendChild(listItem);
  });
}
