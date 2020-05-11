import { browser } from 'webextension-polyfill-ts';
import { Sites, OsmAttribute } from './sites-configuration';

browser.runtime.onMessage.addListener(async (message: ContentScriptInputMessage): Promise<ContentScriptOutputMessage> =>
  message.candidateSiteIds.map(extractData)
);

export type ContentScriptOutputMessage = ExtractedData[]

export type ContentScriptInputMessage = {
  candidateSiteIds: string[];
}

type ExtractedData = {
  siteId: string;
  permalink?: string;
  additionalAttributes?: Partial<Record<OsmAttribute, string>>;
}

function extractData(siteId: string): ExtractedData {
  const extr = Sites[siteId] && Sites[siteId].extractors;
  if (extr) {
    const permalink = extr.getPermalink && extr.getPermalink(document);
    const additionalAttributes = extr.getAttributesFromPage && extr.getAttributesFromPage(window);
    return { siteId, permalink, additionalAttributes };
  } else {
    return { siteId };
  }
}
