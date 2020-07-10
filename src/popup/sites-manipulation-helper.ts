import { DefaultSiteConfiguration, ParamOpt } from "../sites-configuration";
import { ContentScriptOutputMessage } from "../injectable-content-script";
import { SiteConfiguration } from "../config-handler";

const naturalNumberRegExp = "[0-9]+";
const decimalNumberRegExp = "[0-9.-]+";
const positiveDecimalNumberRegExp = "[0-9.]+";

const InfoRegExp: Record<string, string> = {
  nodeId: naturalNumberRegExp,
  wayId: naturalNumberRegExp,
  relationId: naturalNumberRegExp,
  tracesId: naturalNumberRegExp,
  userName: "[^#?\/]+", // any character except URL separator characters
  changesetId: naturalNumberRegExp,
  zoom: positiveDecimalNumberRegExp, //believe it or not, some websites accept a decimal zoom. TODO: verify if any site has a problem having a decimal zoom as a parameter
  lat: decimalNumberRegExp,
  lon: decimalNumberRegExp,
};
//TODO: should I add support for route information? (start, intermediary and end points, and maybe transport mode)

export function findSiteCandidates(sitesConfiguration: SiteConfiguration[], url: string): string[] {
  if (!url) return [];
  const hostname = (new URL(url).hostname);
  if (!hostname) return [];

  return sitesConfiguration
    .filter((site) => {
      if (site.customPattern && site.customPattern.url) {
        return site.customPattern.url.includes(hostname);
      }
      else if (site.defaultConfiguration) {
        if (site.defaultConfiguration.domainRegexp) {
          return site.defaultConfiguration.domainRegexp.test(hostname);
        } else {
          return site.defaultConfiguration.link.includes(hostname);
        }
      }
      else return false;
    })
    .map(site => site.id);
}

export function pickWinningCandidate(
  sitesConfiguration: SiteConfiguration[],
  results: ContentScriptOutputMessage,
  currentTabUrl: string,
): { siteId?: string, attributes: Record<string, string>, detectedPattern?: UrlPattern } | undefined {
  if (results.length === 0) {
    return undefined;
  }
  const [head, ...tail] = results;
  const url = head.permalink || currentTabUrl;

  let extractedAttributes: Record<string, string>;
  let detectedPattern: UrlPattern | undefined;
  let site: SiteConfiguration | undefined;
  if (head.siteId) {
    site = sitesConfiguration.find((site) => head.siteId === site.id);
  } else site = undefined;

  if (site) {
    if (site.defaultConfiguration) {
      extractedAttributes = extractAttributesFromUrl(url, site.defaultConfiguration);
    } else if (site.customPattern) {
      extractedAttributes = extractAttributesFromUrlPattern(new URL(url), site.customPattern);
    } else {
      extractedAttributes = {};
    }
  } else {
    [detectedPattern, extractedAttributes] = detectAndExtractAttributesFromUrl(url);
  }
  const allExtractedAttributes = Object.assign(extractedAttributes, head.additionalAttributes);

  if (Object.values(allExtractedAttributes).length === 0) {
    return pickWinningCandidate(sitesConfiguration, tail, currentTabUrl);
  } else {
    return {
      siteId: head.siteId,
      attributes: adjustZoom(site, allExtractedAttributes),
      detectedPattern,
    };
  }
}

function adjustZoom(config: SiteConfiguration | undefined, extractedAttributes: Record<string, string>): Record<string, string> {
  if (extractedAttributes.zoom && config && config.defaultConfiguration && config.defaultConfiguration.zoomAdjustment) {
    const nZoom = Number(extractedAttributes.zoom);
    return {
      ...extractedAttributes,
      zoom: (nZoom + config.defaultConfiguration.zoomAdjustment).toString(),
    }
  } else {
    return extractedAttributes;
  }
}

export type SiteLink = {
  id: string;
  url: string;
  customName: string | undefined;
}

export function getRelevantSites(
  sitesConfiguration: SiteConfiguration[],
  currentSiteId: string | undefined,
  retrievedAttributes: Record<string, string>,
): SiteLink[] {
  return sitesConfiguration.map(function (site): SiteLink | undefined {
    if (site.id == currentSiteId || !site.isEnabled) return undefined;

    const { id, customName } = site;
    if (site.defaultConfiguration) {
      const chosenOption = site.defaultConfiguration.paramOpts.find(function (paramOpt) {
        const [orderedParameters, unorderedParameters] = extractParametersFromParamOpt(paramOpt);
        const necessaryParameters = orderedParameters.concat(unorderedParameters);
        return necessaryParameters.every(param => retrievedAttributes[param] !== undefined);
      });

      let attributes = retrievedAttributes;
      if (retrievedAttributes.zoom) {
        attributes = { ...retrievedAttributes, zoom: reviewZoom(site.defaultConfiguration, retrievedAttributes.zoom) }
      }

      if (chosenOption) {
        const path = applyParametersToUrl(chosenOption, attributes);
        const protocol = site.defaultConfiguration.httpOnly ? 'http' : 'https';
        return {
          id,
          customName,
          url: `${protocol}://${site.defaultConfiguration.link}${path}`,
        };
      }
    } else {
      if (site.customPattern && retrievedAttributes.zoom && retrievedAttributes.lat && retrievedAttributes.lon) {
        const { zoom, lat, lon } = retrievedAttributes;
        const url = applyParametersToUrlPattern(site.customPattern, { zoom, lat, lon });
        if (url) {
          return { id, customName, url };
        }
      }
    }
    return undefined;
  }).filter((s): s is SiteLink => Boolean(s));
}

function applyParametersToUrlPattern(urlPattern: UrlPattern, retrievedAttributes: Record<string, string>): string | undefined {
  const urlObj = new URL(urlPattern.url);
  if (urlPattern.tag === 'hash-2') {
    const matchArray = urlObj.hash.match(/(#[a-z=]*)([0-9.]+)(\/)([0-9.-]+)(\/)([0-9.-]+)(.*)/);
    if (!matchArray) return undefined;
    const [, prefix, /*zoom*/, separator1, /*lat*/, separator2, /*lon*/, suffix] = matchArray;
    urlObj.hash = `${prefix}${retrievedAttributes.zoom}${separator1}${retrievedAttributes.lat}${separator2}${retrievedAttributes.lon}${suffix}`;
    return urlObj.toString();
  }
  else if (urlPattern.tag === 'qs') {
    Object.entries(urlPattern.querystringSubst).forEach(([osmAttribute, querystringParameter]): void => {
      urlObj.searchParams.set(querystringParameter, retrievedAttributes[osmAttribute]);
    })
    return urlObj.toString();
  }
  else if (urlPattern.tag === 'hash-1') {
    const auxUrl = new URL(urlObj.toString());
    auxUrl.search = '?' + auxUrl.hash.substring(1);

    Object.entries(urlPattern.hashParametersSubst).forEach(([osmAttribute, hashParameter]): void => {
      auxUrl.searchParams.set(hashParameter, retrievedAttributes[osmAttribute]);
    })
    urlObj.hash = '#' + auxUrl.search.substring(1);
    return urlObj.toString();
  }
  const _exhaustivenessCheck: never = urlPattern;
  return _exhaustivenessCheck;
}

export type UrlPattern = SimpleQuerystringPattern | HashWithNamedParametersPattern | OsmLikePattern;

type SimpleQuerystringPattern = { // example https://apps.sentinel-hub.com/eo-browser/?lat=41.718&lng=12.014&zoom=8
  tag: 'qs',
  querystringSubst: NamedMapParameters;
  url: string;
};

type HashWithNamedParametersPattern = { // example https://www.osmhydrant.org/en/#zoom=14&lat=48.20168&lon=16.48777
  tag: 'hash-1',
  hashParametersSubst: NamedMapParameters;
  url: string;
};

type NamedMapParameters = {
  zoom: 'zoom' | 'z';
  lat: 'lat' | 'y';
  lon: 'lon' | 'lng' | 'x';
};

type OsmLikePattern = { // example https://www.opengeofiction.net/#map=4/-16.51/-46.93
  tag: 'hash-2',
  url: string;
};

function detectAndExtractAttributesFromUrl(url: string): [UrlPattern | undefined, Record<string, string>] {
  const urlObj = new URL(url);
  const osmLikePatternExtraction = extractOsmPatternExtraction(urlObj);
  if (osmLikePatternExtraction) {
    const osmLikePattern: OsmLikePattern = {
      tag: 'hash-2',
      url: url,
    }
    return [osmLikePattern, osmLikePatternExtraction];
  }

  let { zoom, lat, lon }: Partial<NamedMapParameters> = {};
  const sp = urlObj.searchParams;
  if (
    (sp.has(zoom = 'zoom') || sp.has(zoom = 'z')) &&
    (sp.has(lat = 'lat') || sp.has(lat = 'y')) &&
    (sp.has(lon = 'lon') || sp.has(lon = 'lng') || sp.has(lon = 'x'))
  ) {
    const qsPattern: SimpleQuerystringPattern = {
      tag: 'qs',
      querystringSubst: { zoom, lat, lon },
      url,
    };
    return [qsPattern, extractAttributesFromUrlPattern(urlObj, qsPattern)];
  }

  const auxUrl = new URL(urlObj.toString());
  auxUrl.search = '?' + auxUrl.hash.substring(1);
  const auxSp = auxUrl.searchParams;
  if (
    (auxSp.has(zoom = 'zoom') || auxSp.has(zoom = 'z')) &&
    (auxSp.has(lat = 'lat') || auxSp.has(lat = 'y')) &&
    (auxSp.has(lon = 'lon') || auxSp.has(lon = 'lng') || auxSp.has(lon = 'x'))
  ) {
    const hashPattern: HashWithNamedParametersPattern = {
      tag: 'hash-1',
      hashParametersSubst: { zoom, lat, lon },
      url,
    };
    return [hashPattern, extractAttributesFromUrlPattern(urlObj, hashPattern)];
  }

  return [, {}];
}

function extractAttributesFromUrlPattern(url: URL, urlPattern: UrlPattern): Record<string, string> {
  if (urlPattern.tag === 'hash-2') {
    const attributes = extractOsmPatternExtraction(url);
    if (attributes) return attributes
  }
  else if (urlPattern.tag === 'qs') {
    const zoom = url.searchParams.get(urlPattern.querystringSubst.zoom);
    const lat = url.searchParams.get(urlPattern.querystringSubst.lat);
    const lon = url.searchParams.get(urlPattern.querystringSubst.lon);
    if (zoom && lat && lon) {
      return { zoom, lat, lon };
    }
  }
  else if (urlPattern.tag === 'hash-1') {
    const auxUrl = new URL(url.toString());
    auxUrl.search = '?' + auxUrl.hash.substring(1);
    const zoom = auxUrl.searchParams.get(urlPattern.hashParametersSubst.zoom);
    const lat = auxUrl.searchParams.get(urlPattern.hashParametersSubst.lat);
    const lon = auxUrl.searchParams.get(urlPattern.hashParametersSubst.lon);
    if (zoom && lat && lon) {
      return { zoom, lat, lon };
    }
  }

  return {};
}

function extractAttributesFromUrl(url: string, siteConfig: DefaultSiteConfiguration): Record<string, string> {
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

function extractOsmPatternExtraction(url: URL): Record<string, string> | undefined {
  const matchArray = url.hash.match(/#[a-z=]*([0-9.]+)\/([0-9.-]+)\/([0-9.-]+)/);
  if (matchArray) {
    const [, zoom, lat, lon] = matchArray;
    if (zoom && lat && lon) {
      return { zoom, lat, lon };
    }
  }
  return undefined;
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

function reviewZoom(site: DefaultSiteConfiguration, zoom: string): string {
  if (site) {
    const { maxZoom, zoomAdjustment } = site;
    let nZoom = Number(zoom);
    if (zoomAdjustment) {
      nZoom = nZoom - zoomAdjustment;
    }
    if (maxZoom) {
      nZoom = Math.min(nZoom, maxZoom);
    }
    return nZoom.toString();
  } else {
    return zoom;
  }
}
