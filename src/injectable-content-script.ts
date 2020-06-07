import { browser } from 'webextension-polyfill-ts';
import { Sites, OsmAttribute } from './sites-configuration';

browser.runtime.onMessage.addListener(async (message: ContentScriptInputMessage): Promise<ContentScriptOutputMessage> =>
  message.candidateSiteIds.length > 0 ?
    message.candidateSiteIds.map(extractData):
    [ attemptExtractionFromUnknownWebsite() ]
);

export type ContentScriptOutputMessage = ExtractedData[]

export type ContentScriptInputMessage = {
  candidateSiteIds: string[];
}

type ExtractedData = {
  siteId?: string;
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

function attemptExtractionFromUnknownWebsite(): ExtractedData {
  // TODO: search for permalinks e.g. getPermalinkBySelector("a#permalink")
  const url = new URL(window.document.location.href);

  const matchArray =
    url.hash.match(/#[a-z=]*([0-9.]+)\/([0-9.-]+)\/([0-9.-]+)/) || // example https://www.opengeofiction.net/#map=4/-16.51/-46.93
    url.hash.match(/#zoom=([0-9.]+)&lat=([0-9.-]+)&lon=([0-9.-]+)/); // example https://www.osmhydrant.org/en/#zoom=16&lat=48.20424&lon=16.36813
  if (matchArray) {
    const [, zoom, lat, lon] = matchArray;
    if (typeof zoom === "string" && typeof lat === "string" && typeof lon === "string" && zoom && lat && lon) {
      return {
        additionalAttributes: { zoom, lat, lon }
      };
    }
  }

  const maybeZoom = url.searchParams.get('zoom')
  const maybeLat = url.searchParams.get('lat');
  const maybeLon = url.searchParams.get('lon') || url.searchParams.get('lng');
  if (typeof maybeZoom === "string" && typeof maybeLat === "string" && typeof maybeLon === "string" && maybeZoom && maybeLat && maybeLon) {
    // example https://apps.sentinel-hub.com/eo-browser/?lat=41.718&lng=12.014&zoom=8
    return { additionalAttributes: {
      zoom: maybeZoom,
      lat: maybeLat,
      lon: maybeLon,
    }};
  }

  return {};
}