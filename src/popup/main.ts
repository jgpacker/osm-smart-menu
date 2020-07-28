import { browser } from 'webextension-polyfill-ts'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';
import { getLoadingMessage, createOptionsList, getErrorMessage, KnownError, createBasicOptionCreationButton, CustomUserOption, createConfigurationLink, createShowAllSitesButton } from './html-content-creation';
import { findSiteCandidates, pickWinningCandidate, getRelevantSites } from './sites-manipulation-helper';
import { getSitesConfiguration, addNewUrlPattern } from '../storage/config-handler';

(function () {
  const configLink = createConfigurationLink(document);
  replaceContent(document.body, [configLink, getLoadingMessage(document)]);

  tryToExtractAndCreateOptions(document).then(optionsOrError =>
    replaceContent(document.body, [configLink].concat(optionsOrError))
  );
})();

function replaceContent(parent: HTMLElement, children: HTMLElement[]): void {
  while (parent.firstChild) parent.firstChild.remove();
  parent.textContent = '';
  parent.append(...children);
}

async function tryToExtractAndCreateOptions(document: Document): Promise<HTMLElement[]> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.url || !currentTab.id) {
    return [getErrorMessage(document, KnownError.NO_ACCESS)];
  }

  const config = await getSitesConfiguration();
  
  const candidateSiteIds = findSiteCandidates(config, currentTab.url);

  const contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds) ;
  const currentSite = contentScriptResult && pickWinningCandidate(config, contentScriptResult, currentTab.url);
  if (!currentSite) {
    const button = createShowAllSitesButton(document, config)
    if (candidateSiteIds.length === 0) {
      return [getErrorMessage(document, KnownError.INCOMPATIBLE_WEBSITE), button];
    } else {
      return [getErrorMessage(document, KnownError.NO_INFORMATION_EXTRACTED), button];
    }
  }

  const sitesList = getRelevantSites(config, currentSite.siteId, currentSite.attributes);
  const htmlSitesList = createOptionsList(document, sitesList)

  if (currentSite.detectedPattern) {
    const customUserOption: CustomUserOption = {
      urlPattern: currentSite.detectedPattern,
      defaultName: currentTab.title || '???',
    };
    const createNewOption = async ({ defaultName, urlPattern }: CustomUserOption) =>
      await addNewUrlPattern(defaultName, urlPattern);
    return [
      createBasicOptionCreationButton(document, customUserOption, createNewOption),
      htmlSitesList,
    ];
  } else {
    return [htmlSitesList];
  }
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
