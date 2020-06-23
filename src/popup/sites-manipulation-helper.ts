import { Sites, SiteConfiguration, ParamOpt } from "../sites-configuration";
import { ContentScriptOutputMessage } from "../injectable-content-script";
import { getLocalConfig, getOrderedSiteIds } from "../config-handler";

const naturalNumberRegExp = "[0-9]+";
const decimalNumberRegExp = "[0-9.-]+";
const positiveDecimalNumberRegExp = "[0-9.]+";

const InfoRegExp: Record<string, string> = {
  nodeId: naturalNumberRegExp,
  wayId: naturalNumberRegExp,
  relationId: naturalNumberRegExp,
  tracesId: naturalNumberRegExp,
  userId: naturalNumberRegExp,
  userName: "[^#?\/]+", // any character except URL separator characters
  changesetId: naturalNumberRegExp,
  zoom: positiveDecimalNumberRegExp, //believe it or not, some websites accept a decimal zoom. TODO: verify if any site has a problem having a decimal zoom as a parameter
  lat: decimalNumberRegExp,
  lon: decimalNumberRegExp,
};
//TODO: should I add support for route information? (start, intermediary and end points, and maybe transport mode)


export async function findSiteCandidates(url: string): Promise<string[]> {
  const hostname = (new URL(url).hostname).replace("www.", "") // maybe add www in config
  if (!hostname) return [];

  const orderedSiteIds = await getOrderedSiteIds();
  const siteUrls = await Promise.all(orderedSiteIds.map(async (siteId): Promise<{ id: string, url: string } | undefined> => {
    if (Sites[siteId]) {
      return { id: siteId, url: Sites[siteId].link };
    } else {
      const localConfig = await getLocalConfig(siteId);
      if (localConfig.customPattern) { // check if it's a custom user option
        return { id: siteId, url: localConfig.customPattern.url};
      } else {
        return;
      }
    }
  }));

  return siteUrls
    .filter((site) => site && site.url.includes(hostname))
    .map(site => site!.id);
}

export async function pickWinningCandidate(results: ContentScriptOutputMessage, currentTabUrl: string)
: Promise<{ siteId?: string, attributes: Record<string, string>, detectedPattern?: UrlPattern } | undefined> {
  if (results.length === 0) {
    return undefined;
  }
  const [head, ...tail] = results;
  const url = head.permalink || currentTabUrl;

  let extractedAttributes: Record<string, string>;
  let detectedPattern: UrlPattern | undefined;
  if (head.siteId) {
    if (Sites[head.siteId]) {
      extractedAttributes = extractAttributesFromUrl(url, Sites[head.siteId]);
    } else {
      const localSiteConfig = await getLocalConfig(head.siteId);
      if (localSiteConfig.customPattern) {
        extractedAttributes = extractAttributesFromUrlPattern(new URL(url), localSiteConfig.customPattern);
      } else {
        extractedAttributes = {};
      }
    }
  } else {
    [detectedPattern, extractedAttributes] = detectAndExtractAttributesFromUrl(url);
  }
  const allExtractedAttributes = Object.assign(extractedAttributes, head.additionalAttributes);

  if (Object.values(allExtractedAttributes).length === 0) {
    return pickWinningCandidate(tail, currentTabUrl);
  } else {
    return {
      siteId: head.siteId,
      attributes: allExtractedAttributes,
      detectedPattern,
    };
  }
}

export type SiteLink = {
  id: string;
  url: string;
  customName?: string;
}

export async function getRelevantSites(currentSiteId: string|undefined, retrievedAttributes: Record<string, string>): Promise<SiteLink[]> {
  const orderedSiteIds = await getOrderedSiteIds();
  return (await Promise.all(orderedSiteIds.map(async function (siteId) {
    if (siteId == currentSiteId) return undefined;

    const localConfig = await getLocalConfig(siteId);
    if (!localConfig.isEnabled) return undefined;

    if (Sites[siteId]) {
      const site = Sites[siteId];

      const chosenOption = site.paramOpts.find(function (paramOpt) {
        const [orderedParameters, unorderedParameters] = extractParametersFromParamOpt(paramOpt);
        const necessaryParameters = orderedParameters.concat(unorderedParameters);
        return necessaryParameters.every(param => retrievedAttributes[param] !== undefined);
      });

      let attributes = retrievedAttributes;
      if (retrievedAttributes.zoom) {
        attributes = {...retrievedAttributes, zoom: reviewZoom(site, retrievedAttributes.zoom)}
      }

      if (!chosenOption) {
        return undefined;
      } else {
        const path = applyParametersToUrl(chosenOption, attributes);
        const protocol = site.httpOnly ? 'http': 'https';
        return {
          id: siteId,
          url: `${protocol}://${site.link}${path}`,
        };
      }
    } else {
      if (localConfig.customPattern && retrievedAttributes.zoom && retrievedAttributes.lat && retrievedAttributes.lon) {
        const urlObj = new URL(localConfig.customPattern.url)
        Object.entries(localConfig.customPattern.querystringSubst).forEach(([osmAttribute, querystringParameter]): void => {
          urlObj.searchParams.set(querystringParameter, retrievedAttributes[osmAttribute]);
        })
        const siteLink: SiteLink = {
          id: siteId,
          url: urlObj.toString(),
          customName: localConfig.customName,
        };
        return siteLink;
      } else {
        return undefined;
      }
    }
  }))).filter((s): s is SiteLink => Boolean(s));
}

export type UrlPattern = SimpleQuerystringPattern;

type SimpleQuerystringPattern = { // example https://apps.sentinel-hub.com/eo-browser/?lat=41.718&lng=12.014&zoom=8
  tag: 'qs',
  querystringSubst: {
    zoom: 'zoom' | 'z';
    lon: 'lon' | 'lng';
    lat: 'lat';
  };
  url: string;
};

function detectAndExtractAttributesFromUrl(url: string): [UrlPattern | undefined, Record<string, string>] {
  const urlObj = new URL(url);
  const matchArray =
    urlObj.hash.match(/#[a-z=]*([0-9.]+)\/([0-9.-]+)\/([0-9.-]+)/) || // example https://www.opengeofiction.net/#map=4/-16.51/-46.93
    urlObj.hash.match(/#zoom=([0-9.]+)&lat=([0-9.-]+)&lon=([0-9.-]+)/); // example https://www.osmhydrant.org/en/#zoom=16&lat=48.20424&lon=16.36813
  if (matchArray) {
    const [, zoom, lat, lon] = matchArray;
    if (zoom && lat && lon) {
      return [, { zoom, lat, lon }];
    }
  }

  const sp = urlObj.searchParams;
  if (sp.has('lat') &&
    (sp.has('zoom') || sp.has('z')) &&
    (sp.has('lon') || sp.has('lng'))
  ) {
    const qsPattern: SimpleQuerystringPattern = {
      tag: 'qs',
      querystringSubst: {
        lat: 'lat',
        zoom: sp.has('zoom') ? 'zoom': 'z',
        lon: sp.has('lon') ? 'lon': 'lng',
      },
      url,
    };
    return [qsPattern, extractAttributesFromUrlPattern(urlObj, qsPattern)];
  }
  return [, {}];
}

function extractAttributesFromUrlPattern(url: URL, urlPattern: UrlPattern): Record<string, string> {
  if (urlPattern.tag === 'qs') {
    const zoom = url.searchParams.get(urlPattern.querystringSubst.zoom);
    const lat = url.searchParams.get(urlPattern.querystringSubst.lat);
    const lon = url.searchParams.get(urlPattern.querystringSubst.lon);
    if (zoom && lat && lon) {
      return { zoom, lat, lon };
    }
  }

  return {};
}

function extractAttributesFromUrl(url: string, siteConfig: SiteConfiguration): Record<string, string> {
  for (let i = 0; i < siteConfig.paramOpts.length; i++) {
    let extractedAttributes: Record<string, string> = {};
    const [orderedParameters] = extractParametersFromParamOpt(siteConfig.paramOpts[i]);

    let partialUrl = siteConfig.paramOpts[i].ordered;
    partialUrl = partialUrl.replace(/([.?^$])/g, '\\$1'); // escape regex special characters TODO: add more and review location in code
    orderedParameters.forEach(function (parameter) {
      partialUrl = partialUrl.replace(`{${parameter}}`, `(${InfoRegExp[parameter]})`);
    });
    const orderedPartRegExp = new RegExp(partialUrl);

    const orderedMatch = orderedPartRegExp.exec(url);
    if (orderedMatch) {
      const unorderedParametersMap = siteConfig.paramOpts[i].unordered || {};
      const matchesUnordered = Object.entries(unorderedParametersMap).every(function ([key, value]: [string, string?]) {
        const unorderedPartXRegExp = new RegExp(
          `${value}=(${InfoRegExp[key]})`
        )
        const unorderedMatch = unorderedPartXRegExp.exec(url)
        if (!unorderedMatch) {
          return false;
        } else {
          extractedAttributes[key] = unorderedMatch[1];
          return true;
        }
      })
      if (matchesUnordered) {
        orderedParameters.forEach(function (orderedParameter, index) {
          extractedAttributes[orderedParameter] = orderedMatch[index + 1];
        });
        return extractedAttributes;
      } else {
        extractedAttributes = {};
      }
    }
  }
  return {};
}

function extractParametersFromParamOpt(paramOpt: ParamOpt) {
  const necessaryParameters = [];
  const fieldGetterRegExp = /\{([^\}]+)\}/g;
  const orderedParameters = []
  let match;
  while (match = fieldGetterRegExp.exec(paramOpt.ordered)) {
    const attributeNameWithoutBraces = match[1];
    orderedParameters.push(attributeNameWithoutBraces);
  }
  necessaryParameters.push(orderedParameters);

  if (paramOpt.unordered) {
    necessaryParameters.push(Object.keys(paramOpt.unordered));
  } else {
    necessaryParameters.push([]);
  }

  return necessaryParameters;
}

/* gets an "interpolable" string and applies the parameters from an object into it, returning a new string */
function applyParametersToUrl(option: ParamOpt, retrievedAttributes: Record<string, string>): string {
  let url = option.ordered;
  const encodedAttributes: Record<string, string> = {};
  
  Object.keys(retrievedAttributes).forEach(function (key) {
    encodedAttributes[key] = encodeURIComponent(retrievedAttributes[key]);
    url = url.replace('{' + key + '}', encodedAttributes[key]);
  });

  if (option.unordered) {
    const urlQueryParameters =
      Object.entries(option.unordered).map(function ([key, value]) {
        return value + '=' + encodedAttributes[key];
      });
    url += '?' + urlQueryParameters.join('&'); // TODO: be mindful of whether there is an '?' or '#' already
  }

  return url;
}

function reviewZoom(site: SiteConfiguration, zoom: string): string {
  const maxZoom = site && site.maxZoom;
  if (maxZoom) {
    return Math.min(Number(zoom), maxZoom).toString()
  } else {
    return zoom;
  }
}
