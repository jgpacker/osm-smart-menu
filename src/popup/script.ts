import { browser } from 'webextension-polyfill-ts'
import { Sites } from '../sites-configuration'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';
import { getLoadingMessage, createOptionsList } from './html-content-creation';
import { detectSiteCandidates, pickWinningCandidate, getRelevantSites } from '../sites-manipulation-helper';

(async function () {
  document.addEventListener("click", function (event: Event): void {
    if (!event.target) return;
    const target = event.target as HTMLElement;
    if (target.nodeName === "A") {
      browser.tabs.create({ url: (target as HTMLAnchorElement).href });
      event.preventDefault();
    }
  });

  replaceBodyContent(getLoadingMessage(document));

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.url || !currentTab.id) {
    console.debug('ERROR: Could not find a tab or did not have permission to access it.')
    return;
  }
  
  const candidateSiteIds = detectSiteCandidates(currentTab.url, Sites);
  if (candidateSiteIds.length === 0) {
    // TODO: even if it is unknown, try to extract some information from site with some generic guesses
    console.debug("ERROR: Current site is not known");
    return;
  }

  const contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds);
  const currentSite = contentScriptResult && pickWinningCandidate(contentScriptResult, currentTab.url);
  if (!currentSite) {
    console.debug("ERROR: Could not find a match for current site candidates");
    return;
  }

  const sitesList = getRelevantSites(currentSite.siteId, currentSite.attributes);

  replaceBodyContent(createOptionsList(document, sitesList));
})();

function replaceBodyContent(element: HTMLElement): void {
  const body = document.body;
  while (body.firstChild) body.firstChild.remove();
  body.textContent = '';
  body.append(element);
}

async function getDataFromContentScript(tabId: number, candidateSiteIds: string[]): Promise<ContentScriptOutputMessage | undefined> {
  try {
    await browser.tabs.executeScript(tabId, { file: "/injectable-content-script.js" });

    const message: ContentScriptInputMessage = { candidateSiteIds };
    return (await browser.tabs.sendMessage(tabId, message)) as ContentScriptOutputMessage;
  } catch (e) {
    logUnexpectedError(e);
    return;
  }
}

function logUnexpectedError(e: any): void {
  const errorPrefix = 'OSM WebExtension ERROR';
  if(e instanceof Error) {
    console.debug(errorPrefix, e.message, e.stack);
  } else {
    console.debug(errorPrefix, JSON.stringify(e));
  }
}