export type SiteConfiguration = {
  link: string;
  paramOpts: ParamOpt[];
  extractors?: Extractors;
  httpOnly?: boolean;
  // it's only necessary to specify `maxZoom` if the website
  // doesn't handle gracefully a `zoom` parameter above their range
  maxZoom?: number;
}

export type ParamOpt = {
  ordered: string;
  unordered?: Partial<Record<OsmAttribute, string>>;
}

export type Extractors = {
  getPermalink?: (document: Document) => string | undefined;
  getAttributesFromPage?: (window: Window) => Partial<Record<OsmAttribute, string>>;
};

export type OsmAttribute =
  | "nodeId" | "wayId" | "relationId"
  | "userId" | "userName" | "changesetId"
  | "zoom" | "lat" | "lon" | "tracesId"
  ;

const urlPattern1: ParamOpt = { ordered: "/", unordered: { zoom: "zoom", lat: "lat", lon: "lon" } };

export const Sites: Record<string, SiteConfiguration> = {
  openstreetmap: {
    link: "www.openstreetmap.org",
    //icon: "www.openstreetmap.org/favicon.ico", // TODO: I will need to pre-download this because otherwise I need additional security permissions in the CSP
    paramOpts: [ // TODO: should I add {domain} at the start? it may be useful for sites that add something in a subdomain
      { ordered: "/node/{nodeId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/node/{nodeId}" },
      { ordered: "/way/{wayId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/way/{wayId}" },
      { ordered: "/relation/{relationId}#map={zoom}/{lat}/{lon}" }, //TODO: should I create a space to allow the existence of other parameters? For example to recognize http://www.openstreetmap.org/way/263290462?locale=pt#map=17/-26.30144/-48.84531
      { ordered: "/relation/{relationId}" },
      { ordered: "/changeset/{changesetId}#map={zoom}/{lat}/{lon}" },
      { ordered: "/changeset/{changesetId}" },
      { ordered: "/user/{userName}/traces/{tracesId}" },
      { ordered: "/user/someone/traces/{tracesId}" }, //when there is no {userName} data, but there is {tracesId}, because the userName doesn't really matter here when going to this page
      { ordered: "/user/{userName}" },
      { ordered: "/#map={zoom}/{lat}/{lon}" },
      { ordered: "/", unordered: { lat: "mlat", lon: "mlon" } }
    ],
    extractors: {
      getAttributesFromPage: (window: Window): Partial<Record<OsmAttribute, string>> => {
        // e.g. https://www.openstreetmap.org/edit?editor=id#map=18/-7.57646/110.94519 or http://www.openstreetmap.org/way/263290462?locale=pt#map=17/-26.30144/-48.84531
        const matches = window.location.hash.match(/#map=([0-9.]+)\/([0-9.-]+)\/([0-9.-]+)/);
        if (matches) {
          const [, zoom, lat, lon ] = matches;
          if (zoom && lat && lon) {
            return { zoom, lat, lon };
          }
        }
        return {};
      }
    }
  },

  /* TODO: change to https://maps.openrouteservice.org/directions?n1=49.9445&n2=8.692953&n3=13&b=0&k1=en-US&k2=km
    openmapsurfer: {
      link: "korona.geog.uni-heidelberg.de",
      paramOpts: [urlPattern1],
      extractors: {
        getPermalink: openLayers_getPermalink()
      }
    },
  */

  opencyclemap: {
    link: "www.opencyclemap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  hotmap: {
    link: "map.hotosm.org",
    httpOnly: true,
    paramOpts: [
      { ordered: "/#{zoom}/{lat}/{lon}" }
    ]
  },

  openseamap: {
    link: "map.openseamap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },

  opensnowmap: {
    link: "www.opensnowmap.org",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  sentinelhub: {
    link: "apps.sentinel-hub.com",
    paramOpts: [
      { ordered: "/sentinel-playground/", unordered: { "lat": "lat", "lon": "lng", "zoom": "zoom" }},
      { ordered: "/eo-browser/", unordered: { "lat": "lat", "lon": "lng", "zoom": "zoom" }},
    ],
  },

  mapcompare: {
    link: "mc.bbbike.org",
    paramOpts: [
      { ordered: "/mc/", unordered: urlPattern1.unordered },
    ],
    extractors: {
      getPermalink: getPermalinkBySelector('[id*=permalink i] a'),
    },
  },

  openstreetbrowser: {
    link: "openstreetbrowser.org",
    maxZoom: 20,
    paramOpts: [
      { ordered: "/#map={zoom}/{lat}/{lon}" },
    ],
  },


  osmcha: {
    link: 'osmcha.org',
    paramOpts: [
      { ordered: "/changesets/{changesetId}" },
      { ordered: "/?filters=%7B%22users%22:[%7B%22label%22:%22%22,%22value%22:%22{userName}%22%7D]%7D" },
    ],
  },

  osmdeephistory: {
    link: "osmlab.github.io/osm-deep-history",
    paramOpts: [
      { ordered: "/#/node/{nodeId}" },
      { ordered: "/#/way/{wayId}" },
      { ordered: "/#/relation/{relationId}" }
    ]
  },

  deepdiff: {
    link: "osm.mapki.com",
    httpOnly: true,
    paramOpts: [
      { ordered: "/history/node.php", unordered: { nodeId: "id" } },
      { ordered: "/history/way.php", unordered: { wayId: "id" } },
      { ordered: "/history/relation.php", unordered: { relationId: "id" } }
    ]
  },

  osmhistoryviewer: {
    link: "osmhv.openstreetmap.de",
    paramOpts: [
      { ordered: "/changeset.jsp", unordered: { changesetId: "id" } },
      { ordered: "/blame.jsp", unordered: { relationId: "id" } }
    ],
    extractors: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  overpassapi: {
    link: "overpass-api.de/achavi",
    paramOpts: [
      { ordered: "/", unordered: { changesetId: "changeset", zoom: "zoom", lat: "lat", lon: "lon" } },
      { ordered: "/", unordered: { changesetId: "changeset" } }
    ],
    extractors: {
      getPermalink: openLayers_getPermalink(),
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  howdidyoucontribute: {
    link: "hdyc.neis-one.org",
    paramOpts: [
      { ordered: "/?{userName}" }
    ],
    extractors: {
      getPermalink: getPermalinkBySelector('a[href*="//hdyc.neis-one.org/?"]'),
    },
  },

  osmchangeviz: {
    link: "resultmaps.neis-one.org",
    paramOpts: [
      { ordered: "/osm-change-viz?c={changesetId}" },
      { ordered: "/osm-change-viz.php?c={changesetId}" },
    ]
  },

  openptmap: {
    link: "www.openptmap.org",
    httpOnly: true,
    paramOpts: [urlPattern1],
    maxZoom: 17,
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },

  opnvkarte: {
    link: "xn--pnvkarte-m4a.de",
    paramOpts: [
      { ordered: "/#{lon};{lat};{zoom}" },
      urlPattern1,
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("a#editLink"),
    },
  },

  stamen: { // Note: no permalink, so if an user enters into the site by a link without parameters and doesn't move around at least once, then we don't have access to current coordinates
    link: "maps.stamen.com",
    httpOnly: true,
    paramOpts: [
      { ordered: "/#toner/{zoom}/{lat}/{lon}" }, // Did not find a generic URL (without choosing theme). This theme was chosen because it seems to have the highest zoom capacity
      { ordered: "/#terrain/{zoom}/{lat}/{lon}" },
      { ordered: "/#watercolor/{zoom}/{lat}/{lon}" },
    ]
  },

  f4map: {
    link: "demo.f4map.com",
    paramOpts: [
      { ordered: "/#lat={lat}&lon={lon}&zoom={zoom}" } //there are other attributes that can be added if another website with 3D rendering shows up: &camera.theta=57.319&camera.phi=-2.005
    ]
  },

  osmbuildings: {
    link: "osmbuildings.org",
    paramOpts: [
      urlPattern1, //TODO: &tilt=45&rotation=168
    ]
  },

  openlevelup: {
    link: "openlevelup.net",
    paramOpts: [
      { ordered: "/#{zoom}/{lat}/{lon}" },
      { ordered: "/?l=0#{zoom}/{lat}/{lon}" },
      { ordered: "/?l=1#{zoom}/{lat}/{lon}" },
      { ordered: "/?l=-1#{zoom}/{lat}/{lon}" }, // TODO: use getAttributesFromPage to ignore `?l=X` and get zoom/lat/lon
      { ordered: "/old/", unordered: { "zoom": "z", "lat": "lat", "lon": "lon" } },
    ],
  },
    
  indoorequal: {
    link: "indoorequal.org",
    paramOpts: [
      urlPattern1,
    ]
  },

  umap: {
    link: "umap.openstreetmap.fr",
    paramOpts: [
      { ordered: "/map/new/#{zoom}/{lat}/{lon}" },
    ],
    extractors: {
      getAttributesFromPage: (window: Window) => {
        const url = new URL(window.document.location.href);
        if (url){
          const matchArray = url.hash.match(/#([0-9.]+)\/([0-9.-]+)\/([0-9.-]+)/);
          if (matchArray) {
            const [, zoom, lat, lon] = matchArray;
            if (typeof zoom === "string" && typeof lat === "string" && typeof lon === "string") {
              return { zoom, lat, lon };
            }
          }
        }
        return {};
      },
    },
  },

  openstreetcam: {
    link: 'openstreetcam.org',
    paramOpts: [
      { ordered: '/map/@{lat},{lon},{zoom}z' },
    ],
  },

  mapillary: {
    link: "www.mapillary.com",
    paramOpts: [ // Note: has a decimal zoom and numbers with high precision (15 digits)
      { ordered: "/app", unordered: { zoom: "z", lat: "lat", lon: "lng" } }
    ]
  },

  opentopomap: {
    link: "www.opentopomap.org",
    paramOpts: [
      { ordered: "/#map={zoom}/{lat}/{lon}" },
      { ordered: "/#marker={zoom}/{lat}/{lon}" },
    ],
  },

  historicmap: {
    link: "gk.historic.place/historische_objekte",
    paramOpts: [urlPattern1],
    maxZoom: 19,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  bingmaps: {
    link: "www.bing.com",
    paramOpts: [
      { ordered: "/maps?cp={lat}~{lon}&lvl={zoom}" }
    ],
    extractors: {
      getAttributesFromPage: (window: Window) => {
        // Known bug:
        // If the user enters into bing.com/maps (i.e. without parameters) and doesn't move the
        //    map around at least once, this script won't be able to extract any information.
        if (window.history && window.history.state && window.history.state) {
          // wrappedJSObject is a security feature from Firefox
          const whs = window.history.state.wrappedJSObject || window.history.state;
          if (whs && whs.state && whs.state.MapModeStateHistory) {
            const m = whs.state.MapModeStateHistory;
            if (m.level && typeof m.level === "number" && m.centerPoint && m.centerPoint.latitude && m.centerPoint.longitude
              && typeof m.centerPoint.latitude === "number" && typeof m.centerPoint.longitude === "number") {
              return {
                lat: m.centerPoint.latitude.toString(),
                lon: m.centerPoint.longitude.toString(),
                zoom: m.level.toString(),
              };
            }
          }
        }
        return {};
      }
    },
  },

  googlemaps: { // there is also maps.google.fr and so on
    link: "www.google.com/maps", //redirected from maps.google.com
    // TODO: otherDomainsRegExp: /.*.google.*/, // not sure whether that's the best way to go about it, but whatever
    paramOpts: [
      { ordered: "/@{lat},{lon},{zoom}z" }
    ]
  },

  waze: {
    link: "www.waze.com",
    paramOpts: [
      { ordered: "/livemap/directions?latlng={lat}%2C{lon}" },
      { ordered: "/en/livemap/directions?latlng={lat}%2C{lon}" },
      { ordered: "/editor", unordered: { lat: "lat", lon: "lon", /* zoom: "zoom", not compatible with OSM zoom levels */ } },
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink"),
      getAttributesFromPage: (window: Window): Partial<Record<OsmAttribute, string>> => {
        const latLngElement = window.document.querySelector('.wm-attribution-control__latlng');
        if (latLngElement) {
          // works in "livemap" page i.e. https://www.waze.com/livemap/directions?latlng=52.514%2C13.429
          const latLngText = latLngElement.textContent;
          if (latLngText) {
            const [lat, lon] = latLngText.split(" | ");
            if (lat && lon) return {
              lat,
              lon,
              zoom: '15', // zoom level when reloading page (approximately)
            };
          }
        };
        const permalink = window.document.querySelector('a.permalink') as HTMLAnchorElement | null;
        if (permalink) {
          // works in "editor" page i.e. https://www.waze.com/editor?env=row&lon=-49.24037&lat=-16.68915&s=70749461&zoom=
          const url = new URL(permalink.href);
          if (url) {
            const wazeZoom: number = parseInt(url.searchParams.get('zoom') || '0');
            const osmZoom = wazeZoom + 12;
            return { zoom: osmZoom.toString() };
          }
        }
        return {};
      },
    },
  },

  level0: {
    link: "level0.osmz.ru",
    httpOnly: true,
    paramOpts: [
      { ordered: "/?url=n{nodeId}" },
      { ordered: "/?url=w{wayId}!" },
      { ordered: "/?url=r{relationId}" },
      //In the future, there might be a permalink for the mini-map: https://github.com/Zverik/Level0/issues/16
    ]
  },

  osmrelationanalyzer: {
    link: "ra.osmsurround.org",
    httpOnly: true,
    paramOpts: [
      { ordered: "/analyzeRelation", unordered: { relationId: "relationId" } }
    ],
    extractors: {
      //TODO: getValues - we can get userName if it's a changeset analysis and maybe map coordinates on both cases
    },
  },

  osmroutemanager: {
    link: "osmrm.openstreetmap.de",
    paramOpts: [
      { ordered: "/relation.jsp", unordered: { relationId: "id" } }
    ],
    extractors: {
      //TODO: getValues - get user that change this relation for the last time
    },
  },

  osmose: { // Note: has support for languages
    link: "osmose.openstreetmap.fr/map",
    paramOpts: [
      { ordered: "/#zoom={zoom}&lat={lat}&lon={lon}" },
    ],
    extractors: {
      getPermalink: getPermalinkBySelector("[class*=permalink] a"),
      //TODO: getValues - get parameters from URL because there is a language prefix between /map and /#zoom
    },
  },

  osminspector: {
    link: "tools.geofabrik.de/osmi",
    paramOpts: [urlPattern1],
    maxZoom: 18,
    extractors: {
      getPermalink: getPermalinkBySelector("a#permalink")
    },
  },

  osmchangetiles: {
    link: "resultmaps.neis-one.org",
    paramOpts: [
      { ordered: "/osm-change-tiles#{zoom}/{lat}/{lon}" },
      { ordered: "/osm-change-tiles.php#{zoom}/{lat}/{lon}" }
    ]
  },

  missingmaps: {
    link: "www.missingmaps.org",
    paramOpts: [
      { ordered: "/users/#/{userName}" },
      { ordered: "/users/#/{userName}/badges" },
    ],
  },

  osmlanevisualizer: {
    link: "osm.mueschelsoft.de/lanes",
    paramOpts: [
      { ordered: "/", unordered: { "relationId": "relid" } },
      { ordered: "/", unordered: { "wayId": "wayid" } },
    ],
    httpOnly: true, // mini-map won't load in HTTPS
  },
};
//http://brouter.de/brouter-web/#zoom=6&lat=50.99&lon=9.86&layer=OpenStreetMap
//Overpass Turbo Wizard: http://overpass-turbo.eu/?w=%22area%22%3D%22y%22+global
//http://maproulette.org/
//http://ris.dev.openstreetmap.org/tsbp-proto/{tracesId}/6/1/  from http://wiki.openstreetmap.org/wiki/That_Shouldnt_Be_Possible

/*
  josm: {
    link: "localhost:8111",
    paramOpts: [
      {ordered:"/load_and_zoom", unordered: {minLon:"left", minLat:"bottom", maxLon:"right", maxLat:"top"}} //TODO: that's not supported yet...
    ]
  },

*/
/* TODO: change to https://simon04.dev.openstreetmap.org/whodidit/
whodidit: {
  link: "zverik.osm.rambler.ru/whodidit",
  paramOpts: [urlPattern1],
  extractors: {
    //TODO: getValues - we may get an username or changeset info
    getPermalink: openLayers_getPermalink()
  },
},
*/
/*
  keepright: {
    link: "keepright.at",
    paramOpts: [
      { ordered: "/report_map.php" }, //TODO: parameters...
    ],
    extractors: {
      getPermalink: openLayers_getPermalink()
    },
  },
*/

function getPermalinkBySelector(selector: string) {
  return function (document: Document) {
    const permalink = document.querySelector(selector) as HTMLAnchorElement;
    return permalink && permalink.href;
  }
}


function openLayers_getPermalink() {
  return getPermalinkBySelector("[id*=Permalink] a");
}

// function getPermalinkByValue(){
//   return function(document: Document){
//     const permalinkAnchor = [...(document.querySelectorAll('a'))]
//                             .find(a => a.textContent && /permalink/i.test(a.textContent));
//     return permalinkAnchor && permalinkAnchor.href;
//   }
// }
