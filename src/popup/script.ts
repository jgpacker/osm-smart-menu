import { browser } from 'webextension-polyfill-ts'
import { Sites, SiteConfiguration, InfoRegExp, ParamOpt } from '../sites-configuration'
import { ContentScriptOutputMessage, ContentScriptInputMessage } from '../injectable-content-script';

(async function () {
  initializePopupWithLoadingMessage(document);

  //const defaultZoom = 12; TODO: it may complement cases where only lat and lon are given (e.g. markers)
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  if (!currentTab || !currentTab.url || !currentTab.id) {
    console.debug('ERROR: Could not find a tab or did not have permission to access it.')
    return;
  }
  
  const candidateSiteIds = detectSiteCandidates(currentTab.url, Sites);
  if (candidateSiteIds.length === 0) {
    // TODO: even if it is unknown, try to extract some information from site with some generic guesses
    console.debug("ERROR: Current site is not known");
    return;
  }

  let contentScriptResult = await getDataFromContentScript(currentTab.id, candidateSiteIds);

  const currentSite = contentScriptResult && pickWinningCandidate(contentScriptResult, currentTab.url);
  if (!currentSite) {
    console.debug("ERROR: Could not find a match for current site candidates");
    return;
  }

  const sitesList = getRelevantSites(currentSite.siteId, currentSite.attributes);

  replacePopupContent(document, sitesList);

  document.addEventListener("click", function (event: Event) {
    // @ts-ignore
    if (event.target.nodeName === "A") {
      const a = event.target as HTMLAnchorElement;
      browser.tabs.create({ url: a.href });
      event.preventDefault();
    }
  });
})();

function pickWinningCandidate(results: ContentScriptOutputMessage, currentTabUrl: string)
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

function replacePopupContent(document: Document, sitesList: SelectedSite[]) {
  const div = document.createElement('div');

  sitesList.forEach(function (site) {
    const anchor = document.createElement('a');
    anchor.id = site.id;
    anchor.href = site.url;
    anchor.textContent = browser.i18n.getMessage(`site_${site.id}`);
    const additionalClass = site.active? '': 'disabled'; //TODO: behavior could be configurable by user
    anchor.className = `site ${additionalClass}`;

    div.appendChild(anchor);
  });

  const body = document.body;
  while (body.firstChild) body.firstChild.remove();
  body.textContent = '';
  body.append(div);
}

function initializePopupWithLoadingMessage(document: Document) {
  const div = document.createElement('div');
  div.id = 'loading';

  div.append(browser.i18n.getMessage('loading_firstLine'));
  div.append(document.createElement('br'));

  const splitPoint = '__OPENSTREETMAP_LINK__';
  const secondLine = browser.i18n.getMessage('loading_secondLine', splitPoint);
  const [firstHalf, secondHalf] = secondLine.split(splitPoint);
  div.append(firstHalf);
  const anchor = document.createElement('a');
  anchor.href = 'http://www.openstreetmap.org/';
  anchor.textContent = anchor.href;
  div.append(anchor);
  div.append(secondHalf);

  document.body.append(div);
}

type SelectedSite = {
  id: string;
  active: boolean;
  url: string;
}

function detectSiteCandidates(url: string, sitesList: Record<string, SiteConfiguration>): string[] {
  const hostname = (new URL(url).hostname).replace("www.", "") // maybe add www in config
  return Object.keys(sitesList).filter(id => sitesList[id].link.includes(hostname));
}

function getRelevantSites(currentSiteId: string, retrievedAttributes: Record<string, string>): SelectedSite[] {
  return Object.entries(Sites).map(function ([siteId, site]) {
    const chosenOption = site.paramOpts.find(function (paramOpt) {
      const [orderedParameters, unorderedParameters] = extractParametersFromParamOpt(paramOpt);
      const necessaryParameters = orderedParameters.concat(unorderedParameters);
      return necessaryParameters.every(param => retrievedAttributes[param] !== undefined);
    });

    let url = "/";
    if (chosenOption) {
      url = applyParametersToUrl(chosenOption, retrievedAttributes)
    }

    const protocol = site.httpOnly ? 'http': 'https';

    return {
      id: siteId,
      active: Boolean(chosenOption),
      url: `${protocol}://${Sites[siteId].link}${url}`,
    };
  }).filter(s => s.id !== currentSiteId);
}

function extractAttributesFromUrl(url: string, siteConfig: SiteConfiguration) {
  for (let i = 0; i < siteConfig.paramOpts.length; i++) {
    let extractedAttributes: Record<string, string> = {};
    let [orderedParameters] = extractParametersFromParamOpt(siteConfig.paramOpts[i]);

    let partialUrl = siteConfig.paramOpts[i].ordered;
    partialUrl = partialUrl.replace(/([.?^$])/g, '\\$1'); // escape regex special characters TODO: add more and review location in code
    orderedParameters.forEach(function (parameter) {
      partialUrl = partialUrl.replace(`{${parameter}}`, `(${InfoRegExp[parameter]})`);
    });
    let orderedPartRegExp = new RegExp(partialUrl);
    console.debug("ordered part  " + orderedPartRegExp.toString());

    const orderedMatch = orderedPartRegExp.exec(url);
    if (orderedMatch) {
      console.debug("orderedMatch: " + orderedMatch);
      const unorderedParametersMap = siteConfig.paramOpts[i].unordered || {};
      const matchesUnordered = Object.entries(unorderedParametersMap).every(function ([key, value]: [string, string?]) {
        let unorderedPartXRegExp = new RegExp(
          `${value}=(${InfoRegExp[key]})`
        )
        let unorderedMatch = unorderedPartXRegExp.exec(url)
        if (!unorderedMatch) {
          console.debug("bad match for " + unorderedPartXRegExp.toString() + " (parameter " + key + ")");
          return false;
        } else {
          console.debug("extracted values " + JSON.stringify(unorderedMatch) + " to unordered parameter " + key);
          extractedAttributes[key] = unorderedMatch[1];
          return true;
        }
      })
      if (matchesUnordered) {
        orderedParameters.forEach(function (orderedParameter, index) {
          console.debug("ordered parameter " + orderedParameter + " got value " + orderedMatch[index + 1]);
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
  let necessaryParameters = [];
  const fieldGetterRegExp = /\{([^\}]+)\}/g;
  let orderedParameters = []
  let match;
  while (match = fieldGetterRegExp.exec(paramOpt.ordered)) {
    let attributeNameWithoutBraces = match[1];
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

function logUnexpectedError(e: any): void {
  const errorPrefix = 'OSM WebExtension ERROR';
  if(e instanceof Error) {
    console.debug(errorPrefix, e.message, e.stack);
  } else {
    console.debug(errorPrefix, JSON.stringify(e));
  }
}