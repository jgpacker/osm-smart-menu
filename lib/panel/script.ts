import { browser } from 'webextension-polyfill-ts'
import { Sites, SiteConfiguration, InfoRegExp, ParamOpt } from '../sites-configuration'
import { ExtractedData } from '../injectable-content-script';

initializePopupWithLoadingMessage(document);

(async function () {
  //const defaultZoom = 12; TODO: it may complement cases where only lat and lon are given (e.g. markers)
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  const currentSiteId = detectSite(currentTab.url!, Sites);
  if (currentSiteId != null) {
    console.debug("Current site detected to be " + currentSiteId);
  } else {
    // TODO: even if it is unknown, try to extract some information from site with some generic guesses
    console.debug("Current site is not known");
  }

  await browser.tabs.executeScript(currentTab.id, {
    file: "/injectable-content-script.js"
  });

  const result = ((await browser.tabs.sendMessage(currentTab.id!, { id: currentSiteId })) || {}) as ExtractedData;
  console.debug("result from injected content script: " + JSON.stringify(result));

  const currentUrl = result.permalink || currentTab.url;
  const retrievedValues = Object.assign(
    extractValuesFromUrl(currentUrl!, Sites[currentSiteId!]),
    result.additionalValues || {}
  );
  console.debug("retrievedValues are " + JSON.stringify(retrievedValues));

  // TODO: pre-process whatever you can
  const sitesList = getRelevantSites(currentSiteId!, retrievedValues);

  replacePopupContent(document, sitesList);
})();

document.addEventListener("click", function (event: Event) {
  // @ts-ignore
  if (event.target.nodeName == "A") {
    const a = event.target as HTMLAnchorElement;
    browser.tabs.create({ url: a.href });
    event.preventDefault();
  }
});

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

function detectSite(url: string, sitesList: Record<string, SiteConfiguration>) {
  const hostname = (new URL(url).hostname).replace("www.", "") // maybe add www in config
  return Object.keys(sitesList).find(id => sitesList[id].link.includes(hostname));
}

function getRelevantSites(currentSiteId: string, retrievedValues: Record<string, string>): SelectedSite[] {
  return Object.keys(Sites).map(function (siteId) {
    const chosenOption = Sites[siteId].paramOpts.find(function (paramOpt) {
      const [orderedParameters, unorderedParameters] = extractParametersFromParamOpt(paramOpt);
      const necessaryParameters = orderedParameters.concat(unorderedParameters);
      return necessaryParameters.every(param => retrievedValues[param] != null);
    });

    let url = "/";
    if (chosenOption != null) {
      url = applyParametersToUrl(chosenOption, retrievedValues)
    }

    const protocol = Sites[siteId].httpOnly ? 'http': 'https';

    return {
      id: siteId,
      active: chosenOption != null,
      url: `${protocol}://${Sites[siteId].link}${url}`,
    };
  }).filter(s => s.id != currentSiteId);
}

function extractValuesFromUrl(url: string, siteConfig: SiteConfiguration) {
  for (let i = 0; i < siteConfig.paramOpts.length; i++) {
    let extractedValues: Record<string, string> = {};
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
          extractedValues[key] = unorderedMatch[1];
          return true;
        }
      })
      if (matchesUnordered) {
        orderedParameters.forEach(function (orderedParameter, index) {
          console.debug("ordered parameter " + orderedParameter + " got value " + orderedMatch[index + 1]);
          extractedValues[orderedParameter] = orderedMatch[index + 1];
        });
        return extractedValues;
      } else {
        extractedValues = {};
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
function applyParametersToUrl(option: ParamOpt, retrievedValues: Record<string, string>): string {
  let url = option.ordered;
  const encodedValues: Record<string, string> = {};
  
  Object.keys(retrievedValues).forEach(function (key) {
    encodedValues[key] = encodeURIComponent(retrievedValues[key]);
    url = url.replace('{' + key + '}', encodedValues[key]);
  });

  if (option.unordered) {
    const urlQueryParameters =
      Object.entries(option.unordered).map(function ([key, value]) {
        return value + '=' + encodedValues[key];
      });
    url += '?' + urlQueryParameters.join('&'); // TODO: be mindful of whether there is an '?' or '#' already
  }

  return url;
}
