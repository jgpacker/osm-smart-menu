import { browser } from 'webextension-polyfill-ts';
import { Sites, OsmAttribute } from './sites-configuration';

browser.runtime.onMessage.addListener(async (message: ContentScriptInputMessage): Promise<ContentScriptOutputMessage> =>
  message.candidateSiteIds
    .map(extractData)
    .concat(
      // try to get parameters from (1) unknown websites or (2) unknown pages of known websites
      // known issue: in the second case, the "known website" will appear as a target option, even though it might be redundant.
      //              if a user reports this, implement recognition for the unknown page
      [ attemptExtractionFromUnknownWebsite() ],
    )
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
  let permalink: Element | null | undefined =
    document.querySelector('[id*=permalink i]') ||
    document.querySelector('[class*=permalink i]');
  if (permalink && !(permalink instanceof HTMLAnchorElement)) {
    permalink = permalink.querySelector('a');
  }
  if (!permalink) {
    permalink = [...document.querySelectorAll('a')]
      .find(a => /permalink/i.test(a.textContent || ''));
  }

  let url: URL;
  if (permalink && permalink instanceof HTMLAnchorElement) {
    url = new URL(permalink.href);
  } else {
    url = new URL(window.document.location.href);
  }

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

  const maybeZoom = url.searchParams.get('zoom') || url.searchParams.get('z');
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