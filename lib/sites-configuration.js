"use strict";

const InfoRegExp = {
  //link       : {regExp: ".+"},
  nodeId     : "[0-9]+",
  wayId      : "[0-9]+",
  relationId : "[0-9]+",
  tracesId   : "[0-9]+",
  userId     : "[0-9]+", // id bigint NOT NULL,
  userName   : "[^#?\/]+", // display_name character varying DEFAULT ''::character varying NOT NULL, https://github.com/openstreetmap/openstreetmap-website/blob/master/app/models/user.rb#L37-L46
  changesetId: "[0-9]+",
  zoom       : "[0-9.]+", //believe it or not, some websites accept a decimal zoom. TODO: verify if any site has a problem having a decimal zoom as a parameter
  lat        : "[0-9-.]+",
  lon        : "[0-9-.]+",
  key        : "[^#?\/=]+",
  value      : "[^#?\/]+"
};
//TODO: should I add support for route information? (start, intermediary and end points, and maybe transport mode)

const urlPattern1 = {ordered:"/", unordered: {zoom:"zoom", lat:"lat", lon: "lon"}};

//TODO:
// * document it in a schema
// * allow customization by the user
// * become language-aware (knowing which languages are supported by these sites)
// for now, verifying an https alternative is out of scope
const Sites = {
  openstreetmap: {
    link: "openstreetmap.org",
    //icon: "www.openstreetmap.org/favicon.ico", // TODO: I will need to pre-download this because otherwise I need additional security permissions in the CSP
    paramOpts: [ // TODO: should I add {domain} at the start? it may be useful for sites that add something in a subdomain
      {ordered:"/node/{nodeId}#map={zoom}/{lat}/{lon}"},
      {ordered:"/node/{nodeId}"},
      {ordered:"/way/{wayId}#map={zoom}/{lat}/{lon}"},
      {ordered:"/way/{wayId}"},
      {ordered:"/relation/{relationId}#map={zoom}/{lat}/{lon}"}, //TODO: should I create a space to allow the existence of other parameters? For example to recognize http://www.openstreetmap.org/way/263290462?locale=pt#map=17/-26.30144/-48.84531
      {ordered:"/relation/{relationId}"},
      {ordered:"/changeset/{changesetId}#map={zoom}/{lat}/{lon}"},
      {ordered:"/changeset/{changesetId}"},
      {ordered:"/user/{userName}/traces/{tracesId}"},
      {ordered:"/user/someone/traces/{tracesId}"}, //when there is no {userName} data, but there is {tracesId}, because the userName doesn't really matter here when going to this page
      {ordered:"/user/{userName}"},
      {ordered:"/#map={zoom}/{lat}/{lon}"},
      {ordered:"/", unordered: {lat:"mlat", lon:"mlon"}}
    ]
  },

  bingmaps: {
    link: "www.bing.com",
    paramOpts: [
      {ordered: "/mapspreview?cp={lat}~{lon}&lvl={zoom}"} // this CenterPoint syntax can be tricky...
    ]
  },

  googlemaps: { // there is also maps.google.fr and so on
    link: "www.google.com/maps", //redirected from maps.google.com
    // TODO: otherDomainsRegExp: /.*.google.*/, // not sure whether that's the best way to go about it, but whatever
    paramOpts: [
      {ordered: "/@{lat},{lon},{zoom}z"}
    ]
  },

  openmapsurfer: {
    link: "korona.geog.uni-heidelberg.de",
    paramOpts: [ urlPattern1 ]
  },

  opencyclemap: {
    link: "www.opencyclemap.org",
    paramOpts: [ urlPattern1 ]
  },

  openseamap: {
    link: "map.openseamap.org",
    paramOpts: [ urlPattern1 ]
  },

  opensnowmap: {
    link: "www.opensnowmap.org",
    paramOpts: [ urlPattern1 ]
  },

  historicmap: {
    link: "gk.historic.place/historische_objekte",
    paramOpts: [ urlPattern1 ]
  },

  openwhatevermap: {
    link: "www.openwhatevermap.org",
    paramOpts: [ urlPattern1 ]
  },

  openptmap: {
    link: "www.openptmap.org",
    paramOpts: [ urlPattern1 ]
  },

  opnvkarte: {
    link: "www.öpnvkarte.de",
    paramOpts: [ urlPattern1 ]
  },

  stamen: { // Note: no permalink, so if an user enters into the site by a link without parameters and doesn't move around at least once, then we don't have access to current coordinates
    link: "maps.stamen.com",
    paramOpts: [
      {ordered:"/#terrain/{zoom}/{lat}/{lon}"}, // wasn't able to find a generic URL, so this one was arbitrarily chosen as the first
      {ordered:"/#watercolor/{zoom}/{lat}/{lon}"},
      {ordered:"/#toner/{zoom}/{lat}/{lon}"},
    ]
  },

  f4map: {
    link: "demo.f4map.com",
    paramOpts: [
      {ordered:"/#lat={lat}&lon={lon}&zoom={zoom}"} //there are other attributes that can be added if another website with 3D rendering shows up: &camera.theta=57.319&camera.phi=-2.005
    ]
  },

  opensciencemap: {
    link: "opensciencemap.org/map",
    paramOpts: [
      {ordered:"/#&scale={zoom}&lat={lat}&lon={lon}"}, //go-to option
      {ordered:"/#", unordered: {zoom:"scale", lat:"lat", lon: "lon"}} //maximum recognizability option
    ]
    //TODO: has other attributes e.g. rot and tilt
    // example: http://opensciencemap.org/map/#&scale=17&rot=0&tilt=0&lat=-26.253&lon=-48.854
  },

  hotmap: {
    link: "map.hotosm.org",
    paramOpts: [
      {ordered:"/#{zoom}/{lat}/{lon}"}
    ]
  },

  mapillary: {
    link: "mapillary.com",
    paramOpts: [ // Note: has a decimal zoom and numbers with high precision (15 digits)
      {ordered:"/app", unordered: {zoom:"z", lat:"lat", lon: "lng"}}
    ]
  },

  idlatest: {
    link: "openstreetmap.us/iD/release",
    paramOpts: [ // Note: has a decimal zoom and has an unusual order for latitude and longitude
      {ordered:"#map={zoom}/{lon}/{lat}"}, //go-to option
      {ordered:"map={zoom}/{lon}/{lat}"} //maximum recognizability option
    ]
  },

  level0: {
    link: "level0.osmz.ru",
    paramOpts: [
      {ordered:"/?url=n{nodeId}"},
      {ordered:"/?url=w{wayId}!"},
      {ordered:"/?url=r{relationId}"},
      //In the future, there might be a permalink for the mini-map: https://github.com/Zverik/Level0/issues/16
    ]
  },

  rawedit: {
    link: "rawedit.openstreetmap.fr",
    paramOpts: [
      {ordered:"/edit/node/{nodeId}"},
      {ordered:"/edit/way/{wayId}"},
      {ordered:"/edit/relation/{relationId}"}
    ]
  },

  umap: {
    link: "umap.openstreetmap.fr",
    paramOpts: [
      {ordered:"/#{zoom}/{lat}/{lon}"} // add {anything} and {lang} flags
      //add http://umap.openstreetmap.fr/pt/map/testpk_1#13/48.2057/-4.0259
    ]
  },

  osmdeephistory: {
    link: "osmlab.github.io/osm-deep-history",
    paramOpts: [
      {ordered:"/#/node/{nodeId}"},
      {ordered:"/#/way/{wayId}"},
      {ordered:"/#/relation/{relationId}"}
    ]
  },

  deepdiff: {
    link: "osm.mapki.com",
    paramOpts: [
      {ordered:"/history/node.php", unordered: {nodeId: "id"}},
      {ordered:"/history/way.php", unordered: {wayId: "id"}},
      {ordered:"/history/relation.php", unordered: {relationId: "id"}}
    ]
  },

  osmhistoryviewer: {
    link: "osmhv.openstreetmap.de",
    paramOpts: [
      {ordered: "/changeset.jsp", unordered: {changesetId: "id"}},
      {ordered: "/blame.jsp", unordered: {relationId: "id"}}
    ]
  },

  whodidit: {
    link: "zverik.osm.rambler.ru/whodidit",
    paramOpts: [ urlPattern1 ]
  },

  overpassapi: {
    link: "overpass-api.de/achavi",
    paramOpts: [
      {ordered: "/", unordered: {changesetId: "changeset", zoom: "zoom", lat: "lat", lon: "lon"}},
      {ordered: "/", unordered: {changesetId: "changeset"}}
    ]
  },

  osmrelationanalyzer: {
    link: "ra.osmsurround.org",
    paramOpts: [
      {ordered: "/analyzeRelation", unordered: {relationId: "relationId"}}
    ]
  },

  osmroutemanager: {
    link: "osmrm.openstreetmap.de",
    paramOpts: [
      {ordered: "/relation.jsp", unordered: {relationId: "id"}}
    ]
  },

  osmose: { // Note: has support for languages
    link: "osmose.openstreetmap.fr/map",
    paramOpts: [
      {ordered: "/#zoom={zoom}&lat={lat}&lon={lon}"},
    ]
  },

  osminspector: {
    link: "tools.geofabrik.de/osmi",
    paramOpts: [ urlPattern1 ]
  },

  mapcompare: {
    link: "tools.geofabrik.de/mc",
    paramOpts: [
      {ordered:"/#{zoom}/{lat}/{lon}"}
    ]
  },

/*
  keepright: {
    link: "keepright.at",
    paramOpts: [
      {ordered: "/report_map.php"}, //TODO: parameters...
    ]
  },
*/

  howdidyoucontribute: {
    link: "hdyc.neis-one.org",
    paramOpts: [
      {ordered: "/?{userName}" }
    ]
  },

  osmwiki: {
    link: "wiki.openstreetmap.org",
    paramOpts: [
      {ordered: "/Tag:{key}={value}"},
      {ordered: "/Key:{key}"}
    ]
  },

  taginfo: {
    link: "taginfo.openstreetmap.org",
    paramOpts: [
      {ordered: "/tags/{key}={value}"},
      {ordered: "/keys/{key}"}
    ]
  }
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
