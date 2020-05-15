import { browser } from 'webextension-polyfill-ts'
import { Sites } from '../sites-configuration'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';
import { getLoadingMessage, createOptionsList, getErrorMessage, KnownError } from './html-content-creation';
import { detectSiteCandidates, pickWinningCandidate, getRelevantSites } from '../sites-manipulation-helper';

(async function () {
  document.addEventListener("click", openLink);

  replaceContent(document.body, getLoadingMessage(document));

  const optionsOrError = await tryToExtractAndCreateOptions(document);
  replaceContent(document.body, optionsOrError);
})();

function replaceContent(parent: HTMLElement, child: HTMLElement): void {
  while (parent.firstChild) parent.firstChild.remove();
  parent.textContent = '';
  parent.append(child);
}

async function tryToExtractAndCreateOptions(document: Document): Promise<HTMLElement> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.url || !currentTab.id) {
    return getErrorMessage(document, KnownError.NO_ACCESS);
  }
  
  const candidateSiteIds = detectSiteCandidates(currentTab.url, Sites);
  if (candidateSiteIds.length === 0) {
    // TODO: even if it is unknown, try to extract some information from site with some generic guesses
    return getErrorMessage(document, KnownError.UNKNOWN_WEBSITE);
  }

  const contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds);
  const currentSite = contentScriptResult && pickWinningCandidate(contentScriptResult, currentTab.url);
  if (!currentSite) {
    return getErrorMessage(document, KnownError.NO_INFORMATION_EXTRACTED);
  }

  const sitesList = getRelevantSites(currentSite.siteId, currentSite.attributes);

  return createOptionsList(document, sitesList);
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

function openLink(event: Event): void {
  if (!event.target) return;
  const target = event.target as HTMLElement;
  if (target.nodeName === "A") {
    browser.tabs.create({ url: (target as HTMLAnchorElement).href });
    event.preventDefault();
  }
} 

function logUnexpectedError(e: any): void {
  const errorPrefix = 'OSM WebExtension ERROR';
  if(e instanceof Error) {
    console.error(errorPrefix, e.message, e.stack);
  } else {
    console.error(errorPrefix, JSON.stringify(e));
  }
}