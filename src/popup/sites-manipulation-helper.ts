import { Sites, SiteConfiguration, ParamOpt } from "../sites-configuration";
import { ContentScriptOutputMessage } from "../injectable-content-script";
import { getLocalConfig } from "../config-handler";

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
  key: "[^#?\/=]+",
  value: "[^#?\/]+",
};
//TODO: should I add support for route information? (start, intermediary and end points, and maybe transport mode)


export function detectSiteCandidates(url: string, sitesList: Record<string, SiteConfiguration>): string[] {
  const hostname = (new URL(url).hostname).replace("www.", "") // maybe add www in config
  if (!hostname) return [];
  return Object.keys(sitesList).filter(id => sitesList[id].link.includes(hostname));
}

export function pickWinningCandidate(results: ContentScriptOutputMessage, currentTabUrl: string)
: { siteId: string, attributes: Record<string, string> } | undefined {
  if (results.length === 0) {
    return undefined;
  }
  const [head, ...tail] = results;
  const url = head.permalink || currentTabUrl;
  const extractedAttributes = extractAttributesFromUrl(url, Sites[head.siteId]);
  const allExtractedAttributes = Object.assign(extractedAttributes, head.additionalAttributes);

  if (Object.values(allExtractedAttributes).length === 0) {
    return pickWinningCandidate(tail, currentTabUrl);
  } else {
    return {
      siteId: head.siteId,
      attributes: allExtractedAttributes,
    };
  }
}

export type SelectedSite = {
  id: string;
  url: string;
}

export async function getRelevantSites(currentSiteId: string, retrievedAttributes: Record<string, string>): Promise<SelectedSite[]> {
  return (await Promise.all(Object.entries(Sites).map(async function ([siteId, site]) {
    if (siteId == currentSiteId) return undefined;

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
      const localConfig = await getLocalConfig(siteId);
      if (!localConfig.isEnabled) return undefined;

      const path = applyParametersToUrl(chosenOption, attributes);
      const protocol = site.httpOnly ? 'http': 'https';
      return {
        id: siteId,
        url: `${protocol}://${site.link}${path}`,
      };
    }
  }))).filter((s): s is SelectedSite => Boolean(s));
}

function extractAttributesFromUrl(url: string, siteConfig: SiteConfiguration) {
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
