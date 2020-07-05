import { browser } from 'webextension-polyfill-ts'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';
import { getLoadingMessage, createOptionsList, getErrorMessage, KnownError, createBasicOptionCreationButton, CustomUserOption } from './html-content-creation';
import { findSiteCandidates, pickWinningCandidate, getRelevantSites } from './sites-manipulation-helper';
import { getOrderedSiteIds, setOrderedSiteIds, setLocalConfig, getSitesConfiguration } from '../config-handler';

(async function () {
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

  const config = await getSitesConfiguration();
  
  const candidateSiteIds = findSiteCandidates(config, currentTab.url);

  const contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds);
  const currentSite = contentScriptResult && pickWinningCandidate(config, contentScriptResult, currentTab.url);
  if (!currentSite) {
    if (candidateSiteIds.length === 0) {
      return getErrorMessage(document, KnownError.INCOMPATIBLE_WEBSITE);
    } else {
      return getErrorMessage(document, KnownError.NO_INFORMATION_EXTRACTED);
    }
  }

  const sitesList = getRelevantSites(config, currentSite.siteId, currentSite.attributes);
  const htmlSitesList = createOptionsList(document, sitesList)

  if (currentSite.detectedPattern) {
    const customUserOption: CustomUserOption = {
      urlPattern: currentSite.detectedPattern,
      defaultName: currentTab.title || '???',
    };
    htmlSitesList.insertBefore(
      createBasicOptionCreationButton(document, customUserOption, createNewOption),
      htmlSitesList.firstElementChild
    );
  }

  return htmlSitesList;
}

async function createNewOption(customUserOption: CustomUserOption): Promise<void> {
  const siteId = encodeURIComponent(customUserOption.urlPattern.url);

  await setLocalConfig(siteId, {
    isEnabled: true,
    customName: customUserOption.defaultName,
    customPattern: customUserOption.urlPattern,
  })

  await setOrderedSiteIds(
    [siteId].concat(await getOrderedSiteIds())
  );
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
    console.error(errorPrefix, e.message, e.stack);
  } else {
    console.error(errorPrefix, JSON.stringify(e));
  }
}