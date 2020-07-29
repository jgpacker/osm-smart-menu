import { browser } from 'webextension-polyfill-ts'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';
import { KnownError, CustomUserOption } from './utils';
import { findSiteCandidates, pickWinningCandidate, getRelevantSites, SiteLink } from './sites-manipulation-helper';
import { getSitesConfiguration } from '../storage/config-handler';
// @ts-expect-error
import App from './App.svelte';

export type EventualSitesOrError = Promise<{
  sitesList: SiteLink[];
  customUserOption?: CustomUserOption;
} | KnownError>;

const eventualSitesOrError: EventualSitesOrError = getSitesOrError();
new App({
	target: document.body,
	props: { eventualSitesOrError },
});

async function getSitesOrError(): EventualSitesOrError {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.url || !currentTab.id) {
    return KnownError.NO_ACCESS;
  }

  const config = await getSitesConfiguration();
  const candidateSiteIds = findSiteCandidates(config, currentTab.url);
  const contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds) ;
  const currentSite = contentScriptResult && pickWinningCandidate(config, contentScriptResult, currentTab.url);
  if (!currentSite) {
    if (candidateSiteIds.length === 0) {
      return KnownError.INCOMPATIBLE_WEBSITE;
    } else {
      return KnownError.NO_INFORMATION_EXTRACTED;
    }
  }

  let customUserOption: CustomUserOption | undefined;
  if (currentSite.detectedPattern) {
    customUserOption = {
      urlPattern: currentSite.detectedPattern,
      defaultName: currentTab.title || '???',
    };
  }

  const sitesList = getRelevantSites(config, currentSite.siteId, currentSite.attributes);
  return {
    sitesList,
    customUserOption,
  };
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
