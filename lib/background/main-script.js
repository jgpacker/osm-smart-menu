"use strict";

chrome.runtime.onConnect.addListener(function(port) {
  console.assert(port.name == "get-pages");

  console.debug("background script connected to a port: " + JSON.stringify(port));


  //const defaultZoom = 12; TODO: get from configuration

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];

    const currentSiteId = detectSite(currentTab.url, Sites);
    if (currentSiteId != null) {
      console.debug("Current site detected to be "+currentSiteId);
    } else {
      // TODO: even if it is unknown, try to extract some information from site with some generic guesses
      console.debug("Current site is not known"); // TODO: tell this to panel popup
    }

    chrome.tabs.executeScript(currentTab.id, {
      file: "/lib/background/injectable-content-script.js"
    }, function(_){

      chrome.tabs.sendMessage(currentTab.id, {id: currentSiteId}, function(result){
        result = result || {};
        console.debug("result from injected content script: " + JSON.stringify(result));

        //Note: all retrieved values must be URL-encoded strings
        const currentUrl = result.permalink || currentTab.url;
        const retrievedValues = Object.assign(
          extractValuesFromUrl(currentUrl, Sites[currentSiteId]),
          result.additionalValues || {}
        );
        console.debug("retrievedValues are "+JSON.stringify(retrievedValues));

        // TODO: pre-process whatever you can
        const sitesList = getRelevantSites(currentSiteId, retrievedValues);

        port.onMessage.addListener(function(message){
          console.debug("background script received message through a port: " + JSON.stringify(message));

          chrome.tabs.create({ url: message.url});
        });

        port.postMessage(sitesList);
      });
    });
  });
});

function detectSite(url, sitesList) {
  const hostname = (new URL(url).hostname).replace("www.", "") // maybe add www in config
  return Object.keys(sitesList).find(id => sitesList[id].link.includes(hostname));
}

function getRelevantSites(currentSiteId, retrievedValues) {
  return Object.keys(Sites).map(function(siteId) {
    const chosenOption = Sites[siteId].paramOpts.find(function(paramOpt){
      const [orderedParameters, unorderedParameters] = extractParametersFromParamOpt(paramOpt);
      const necessaryParameters = orderedParameters.concat(unorderedParameters);
      return necessaryParameters.every(param => retrievedValues[param] != null);
    });

    let url = "/";
    if(chosenOption != null){
      url = applyParametersToUrl(chosenOption, retrievedValues)
    }

    return {
      id: siteId,
      active: chosenOption != null,
      url: "http://" + Sites[siteId].link + url
    };
  }).filter(s => s.id != currentSiteId);
}

function extractValuesFromUrl(url, siteConfig) {
  for(let i=0; i< siteConfig.paramOpts.length; i++) {
    let extractedValues = {};
    let [orderedParameters, _] = extractParametersFromParamOpt(siteConfig.paramOpts[i]);

    let partialUrl = siteConfig.paramOpts[i].ordered;
    partialUrl = partialUrl.replace(/([.?^$])/g, '\\$1'); // escape regex special characters TODO: add more and review location in code
    orderedParameters.forEach(function(parameter){
      partialUrl = partialUrl.replace('{'+parameter+'}', "("+InfoRegExp[parameter]+")");
    });
    let orderedPartRegExp = new RegExp(partialUrl);
    console.debug("ordered part  "+orderedPartRegExp.toString());

    const orderedMatch = orderedPartRegExp.exec(url);
    if(orderedMatch) {
      console.debug("orderedMatch: "+ orderedMatch);
      const unorderedParametersMap = siteConfig.paramOpts[i].unordered || {};
      const matchesUnordered = Object.keys(unorderedParametersMap).every(function(unorderedParameter){
        let unorderedPartXRegExp = new RegExp(
          unorderedParametersMap[unorderedParameter]+"=("+InfoRegExp[unorderedParameter]+")"
        )
        let unorderedMatch = unorderedPartXRegExp.exec(url)
        if(!unorderedMatch){
          console.debug("bad match for "+unorderedPartXRegExp.toString()+" (parameter "+unorderedParameter+")");
          return false;
        } else {
          console.debug("extracted values "+JSON.stringify(unorderedMatch)+" to unordered parameter "+unorderedParameter);
          extractedValues[unorderedParameter] = unorderedMatch[1];
          return true;
        }
      })
      if(matchesUnordered){
        orderedParameters.forEach(function(orderedParameter, index){
          console.debug("ordered parameter "+orderedParameter+" got value "+ orderedMatch[index+1]);
          extractedValues[orderedParameter] = orderedMatch[index+1];
        });
        return extractedValues;
      } else {
        extractedValues = {};
      }
    }
  }
  return {};
}


function extractParametersFromParamOpt(paramOpt) {
   let necessaryParameters = [];
   const fieldGetterRegExp = /\{([^\}]+)\}/g;
   let orderedParameters = []
   let match;
   while(match = fieldGetterRegExp.exec(paramOpt.ordered)){ // TODO: what was the alternative to `exec`?
     let attributeNameWithoutBraces = match[1];
     orderedParameters.push(attributeNameWithoutBraces);
   }
   necessaryParameters.push(orderedParameters);

   if(paramOpt.unordered){
     necessaryParameters.push(Object.keys(paramOpt.unordered));
   } else {
     necessaryParameters.push([]);
   }

   return necessaryParameters;
}

/* gets an "interpolable" string and applies the parameters from an object into it, returning a new string; if that's not possible, null is returned */
function applyParametersToUrl(option, retrievedValues) { //: ParamOpt -> Map[String, String] -> String
  let url = option.ordered || "";

  Object.keys(retrievedValues).forEach(function(key){
    url = url.replace('{'+key+'}', retrievedValues[key]);
  });

  if(option.unordered){
    const urlQueryParameters =
      Object.keys(option.unordered).map(function(key){
        return option.unordered[key] + '=' +
               retrievedValues[key];
      });
    url += '?' + urlQueryParameters.join('&'); // TODO: be mindful of whether there is an '?' or '#' already
  }

  return url;
}
