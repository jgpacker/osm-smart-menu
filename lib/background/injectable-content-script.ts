import { browser } from 'webextension-polyfill-ts';

type ExtractorType = {
  getPermalink?: (document: Document) => string | undefined;
  getValues?: () => Record<string, string> | undefined;
}

export type ExtractedData = {
  permalink?: string;
  additionalValues?: Record<string, string>;
}

// note that the response given to the main thread should contain URL-encoded values (only strings)
const Extractors: Record<string, ExtractorType> = {
  howdidyoucontribute: {
    getPermalink: getPermalinkBySelector('a[href*="//hdyc.neis-one.org/?"]')
  },
  bingmaps: {
    getValues: function(){
      // Known bug:
      // The URL doesn't change automatically. If the user enters into //www.bing.com/maps (without parameters) and
      //   doesn't move the map around at least once, then this script won't be able to extract any information.
      if (window.history && window.history.state && window.history.state.MapModeStateHistory && window.history.state.MapModeStateHistory.centerPoint) {
        const mapState = window.history.state.MapModeStateHistory;
        return {
          lat: mapState.centerPoint.latitude,
          lon: mapState.centerPoint.longitude,
          zoom: mapState.level
        };
      }
      return;
    }
  },
  overpassapi: {
    getPermalink: openLayers_getPermalink(),
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
  },
  whodidit: {
      //TODO: getValues - we may get an username or changeset info
    getPermalink: openLayers_getPermalink()
  },
  osmrelationanalyzer: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
  },
  osmroutemanager: {
      //TODO: getValues - get user that change this relation for the last time
  },
  osmose: {
    getPermalink: getPermalinkBySelector("[class*=permalink] a"),
      //TODO: getValues - get parameters from URL because there is a language prefix between /map and /#zoom
  },
  osmhistoryviewer: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
  },
  osminspector: {
    getPermalink: getPermalinkBySelector("a#permalink")
  },
  keepright: {
    getPermalink: openLayers_getPermalink()
  },
  opencyclemap: {
    getPermalink: getPermalinkBySelector("a#permalink")
  },
  openseamap: {
    getPermalink: openLayers_getPermalink()
  },
  opensnowmap: {
    getPermalink: getPermalinkBySelector("a#permalink")
  },
  historicmap: {
    getPermalink: getPermalinkBySelector("a#permalink")
  },
  openwhatevermap: {
    getPermalink: openLayers_getPermalink()
  },
  openptmap: {
    getPermalink: openLayers_getPermalink()
  },
  opnvkarte: {
    getPermalink: openLayers_getPermalink()
  },
  openmapsurfer: {
    getPermalink: openLayers_getPermalink()
  }
}


function getPermalinkBySelector(selector: string){
  return function(document: Document){
      const permalink = document.querySelector(selector) as HTMLAnchorElement;
      return permalink && permalink.href;
  }
}

function openLayers_getPermalink(){
  return getPermalinkBySelector("[id*=Permalink] a");
}

// function getPermalinkByValue(){
//   return function(document: Document){
//     const permalinkAnchor = [...(document.querySelectorAll('a'))]
//                             .find(a => a.textContent && /permalink/i.test(a.textContent));
//     return permalinkAnchor && permalinkAnchor.href;
//   }
// }

function extraData(siteId: string): ExtractedData {
  let permalink;
  let additionalValues;
  const currentSite = Extractors[siteId];

  if (currentSite) {
    if (currentSite.getPermalink) {
      permalink = currentSite.getPermalink(document);
    }
    if (currentSite.getValues) {
      additionalValues = currentSite.getValues();
    }
  }

  return {
    permalink: permalink,
    additionalValues: additionalValues
  };
}


(function(){
  browser.runtime.onMessage.addListener(async function(message: { id: string }, _sender) {
    console.debug("injected content script received request: " + JSON.stringify(message));
  
    const siteId = message.id;
    return extraData(siteId);
  });
})();
