import { browser } from 'webextension-polyfill-ts';
import { Sites } from '../sites-configuration';

export type ExtractedData = {
  permalink?: string;
  additionalValues?: Record<string, string>;
}

function extractData(siteId: string): ExtractedData {
  const currentSiteExtractors = Sites[siteId] && Sites[siteId].extractors;
  if (currentSiteExtractors) {
    const permalink = currentSiteExtractors.getPermalink && currentSiteExtractors.getPermalink(document);
    const additionalValues = currentSiteExtractors.getValues && currentSiteExtractors.getValues();
    return { permalink, additionalValues };
  } else {
    return {};
  }
}

(function () {
  browser.runtime.onMessage.addListener(async function (message: { id: string }, _sender) {
    console.debug("injected content script received request: " + JSON.stringify(message));

    const siteId = message.id;
    return extractData(siteId);
  });
})();
