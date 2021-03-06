import { findSiteCandidates, getRelevantSites, pickWinningCandidate } from "./sites-manipulation-helper";
import { SiteConfiguration } from "../storage/config-handler";
import { Sites, OsmAttribute } from "../sites-configuration";

const aDefaultSiteConfig: SiteConfiguration = {
  id: 'test1',
  isEnabled: true,
  defaultConfiguration: {
    link: 'example.com',
    paramOpts: [{ ordered: "/#map={zoom}/{lat}/{lon}" }],
  }
};

describe(findSiteCandidates.name, () => {
  test('empty input gives empty output', () => {
    expect(findSiteCandidates([aDefaultSiteConfig], '')).toEqual([]);
  });
  test('empty url finds nothing', () => {
    expect(findSiteCandidates([aDefaultSiteConfig], '')).toEqual([]);
  });
  test('chrome://home url finds nothing', () => {
    expect(findSiteCandidates([aDefaultSiteConfig], 'chrome://home/')).toEqual([]);
  });
  test('finds a site with same domain', () => {
    expect(findSiteCandidates([aDefaultSiteConfig], 'http://example.com/map?zoom=1&lat=2&lon=3')).toEqual([aDefaultSiteConfig.id]);
  });
  test('finds a site with domainRegexp', () => {
    const siteConfigWithAdjustment: SiteConfiguration = {
      ...aDefaultSiteConfig,
      defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, domainRegexp: /example\.com\.[a-z]{2}$/ },
    };
    expect(findSiteCandidates([siteConfigWithAdjustment], 'http://example.com.br/map?zoom=1&lat=2&lon=3')).toEqual([aDefaultSiteConfig.id]);
  });
  test('does not get a site that doesn\'t match domainRegexp', () => {
    const siteConfigWithAdjustment: SiteConfiguration = {
      ...aDefaultSiteConfig,
      defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, domainRegexp: /www\.example\.com$/ },
    };
    expect(findSiteCandidates([siteConfigWithAdjustment], 'http://example.com/map?zoom=1&lat=2&lon=3')).toEqual([]);
  });
  test('get user url template that that includes domain', () => {
    const configUrlPat: SiteConfiguration = {
      id: 'url-pat',
      isEnabled: true,
      customPattern: { tag: 'user-v1', url: 'https://www.example.com/map?zoom={zoom}&lat={latitude}&lon={longitude}' },
    };
    expect(findSiteCandidates([configUrlPat], 'http://example.com/map?zoom=1&lat=2&lon=3')).toEqual([configUrlPat.id]);
  });
  const knownGoogleDomains = [
    '.com', '.ad', '.ae', '.com.af', '.com.ag', '.com.ai', '.am', '.co.ao', '.com.ar', '.as', '.com.uy', '.com.na',
    '.at', '.com.au', '.az', '.ba', '.com.bd', '.com.my', '.co.mz', '.be', '.bf', '.bg', '.com.bh', '.bi', '.bj',
    '.com.bn', '.com.bo', '.com.br', '.bs', '.co.bw', '.by', '.com.bz', '.ca', '.cd', '.cf', '.cg', '.ch', '.com.ph',
    '.ci', '.co.ck', '.cl', '.cm', '.cn', '.com.co', '.co.cr', '.com.cu', '.cv', '.com.cy', '.cz', '.de', '.dj', '.dk',
    '.dm', '.com.do', '.dz', '.com.ec', '.ee', '.com.eg', '.es', '.com.et', '.fi', '.com.fj', '.fm', '.fr', '.ga',
    '.ge', '.gg', '.com.gh', '.com.gi', '.gl', '.gm', '.gp', '.gr', '.com.gt', '.gy', '.com.hk', '.hn', '.hr', '.ht',
    '.hu', '.co.id', '.ie', '.co.il', '.im', '.co.in', '.iq', '.is', '.it', '.je', '.com.jm', '.jo', '.co.jp', '.co.ke',
    '.com.kh', '.ki', '.kg', '.co.kr', '.com.kw', '.kz', '.la', '.com.lb', '.li', '.lk', '.co.ls', '.lt', '.lu', '.lv',
    '.com.ly', '.co.ma', '.md', '.me', '.mg', '.mk', '.ml', '.mn', '.ms', '.com.mt', '.mu', '.mv', '.mw', '.com.mx',
    '.com.nf', '.com.ng', '.com.ni', '.ne', '.nl', '.no', '.com.np', '.nr', '.nu', '.co.nz', '.com.om', '.com.pa', '.com.pe',
    '.com.pk', '.pl', '.pn', '.com.pr', '.ps', '.pt', '.com.py', '.com.qa', '.ro', '.ru', '.rw', '.com.sa', '.com.sb', '.sc',
    '.se', '.com.sg', '.sh', '.si', '.sk', '.com.sl', '.sn', '.so', '.sm', '.st', '.com.sv', '.td', '.tg', '.co.th',
    '.com.tj', '.tk', '.tl', '.tm', '.tn', '.to', '.com.tr', '.tt', '.com.tw', '.co.tz', '.com.ua', '.co.ug', '.co.uk',
    '.co.uz', '.com.vc', '.co.ve', '.vg', '.co.vi', '.com.vn', '.vu', '.ws', '.rs', '.co.za', '.co.zm', '.co.zw', '.cat', '.xxx',
  ];
  test('known google domains properly match current google configuration', () => {
    knownGoogleDomains.forEach(domain => {
      const inputUrl = `https://www.google${domain}/maps`;
      const googleConfiguration = { id: 'googlemaps', isEnabled: true, defaultConfiguration: Sites['googlemaps'] };
      expect(findSiteCandidates([googleConfiguration], inputUrl)).toEqual(['googlemaps']);
    });
  });
});

describe(pickWinningCandidate.name, () => {
  test('empty input gives empty output', () => {
    expect(pickWinningCandidate([], [], '')).toBeUndefined();
  });
  test('picks a site', () => {
    const inputAttributes = [{ siteId: aDefaultSiteConfig.id, additionalAttributes: { zoom: '1', lat: '2', lon: '3' } }];
    const expectedOutput = { siteId: aDefaultSiteConfig.id, attributes: inputAttributes[0].additionalAttributes };
    expect(pickWinningCandidate([aDefaultSiteConfig], inputAttributes, 'https://example.com/')).toEqual(expectedOutput);
  });
  const userUrlTemplateTests: { exampleUrl: string; urlTemplate: string; expectedAttrs: Partial<Record<OsmAttribute, string>>; }[] = [
    {
      exampleUrl: 'https://geohack.toolforge.org/geohack.php?params=23.00_N_24.43_E',
      urlTemplate: 'https://geohack.toolforge.org/geohack.php?params={latitude}_N_{longitude}_E',
      expectedAttrs: { lon: '24.43', lat: '23.00' },
    },
    {
      exampleUrl: 'https://hiking.waymarkedtrails.org/#route?id=2966504&map=3!23.0!24.1',
      urlTemplate: 'https://hiking.waymarkedtrails.org/#route?id={osm_relation_id}',
      expectedAttrs: { relationId: '2966504' },
    },
    {
      exampleUrl: 'https://hiking.waymarkedtrails.org/#route?id=10534456&map=14!58.4593!11.4308',
      urlTemplate: 'https://hiking.waymarkedtrails.org/#route?id={osm_relation_id}&map={zoom}!{latitude}!{longitude}',
      expectedAttrs: { relationId: '10534456', zoom: '14', lat: '58.4593', lon: '11.4308' },
    },
    {
      exampleUrl: 'https://disfactory.tw/#map=16.00/120.1/23.23400000000001',
      urlTemplate: 'https://disfactory.tw/#map={zoom}/{longitude}/{latitude}',
      expectedAttrs: { zoom: '16.00', lon: '120.1', lat: '23.23400000000001' },
    },
    {
      exampleUrl: 'https://taginfo.openstreetmap.org/keys/ref:isil',
      urlTemplate: 'https://taginfo.openstreetmap.org/keys/{osm_tag_key}',
      expectedAttrs: { key: 'ref:isil' },
    },
    {
      exampleUrl: 'https://taginfo.openstreetmap.org/tags/parking=surface',
      urlTemplate: 'https://taginfo.openstreetmap.org/tags/{osm_tag_key}={osm_tag_value}',
      expectedAttrs: { key: 'parking', value: 'surface' },
    },
    {
      exampleUrl: 'https://wiki.openstreetmap.org/wiki/Key:amenity',
      urlTemplate: 'https://wiki.openstreetmap.org/wiki/Key:{osm_tag_key}',
      expectedAttrs: { key: 'amenity' },
    },
    {
      exampleUrl: 'https://wiki.openstreetmap.org/wiki/Tag:amenity%3Ddrinking_water',
      urlTemplate: 'https://wiki.openstreetmap.org/wiki/Tag:{osm_tag_key}%3D{osm_tag_value}',
      expectedAttrs: { key: 'amenity', value: 'drinking_water' },
    },
  ];
  userUrlTemplateTests.forEach((testParams) => {
    test(`get parameters from url ${testParams.exampleUrl}`, () => {
      const inputConfig: SiteConfiguration = { id: 'user-pattern', isEnabled: true, customPattern: { tag: 'user-v1', url: testParams.urlTemplate} };
      const expectedOutput = { siteId: inputConfig.id, attributes: testParams.expectedAttrs };
      expect(pickWinningCandidate([inputConfig], [{ siteId: inputConfig.id }], testParams.exampleUrl)).toEqual(expectedOutput);
    });
  });
  test('get osmchangetiles from weird url', () => {
    const expectedSiteId = 'osmchangetiles';
    const inputConfig = { isEnabled: true, id: expectedSiteId, defaultConfiguration: Sites[expectedSiteId]}
    const inputUrl = 'https://resultmaps.neis-one.org/osm-change-tiles?quadkey=1202200110303320#16/48.7537/2.3536';
    const expectedOutput = { siteId: expectedSiteId, attributes:{ zoom: '16', lat: '48.7537', lon: '2.3536' } };
    expect(pickWinningCandidate([inputConfig], [{ siteId: expectedSiteId }], inputUrl)).toEqual(expectedOutput);
  });
  test('get google from weird url', () => {
    const expectedSiteId = 'googlemaps';
    const inputConfig = { isEnabled: true, id: expectedSiteId, defaultConfiguration: Sites[expectedSiteId]}
    const inputUrl = "https://www.google.com.tw/maps/place/24%C2%B010'54.1%22N+120%C2%B051'58.2%22E/@24.18169,120.86617,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d24.18169!4d120.86617";
    const expectedOutput = { siteId: expectedSiteId, attributes: { zoom: '17', lat: '24.18169', lon: '120.86617' } };
    expect(pickWinningCandidate([inputConfig], [{ siteId: expectedSiteId }], inputUrl)).toEqual(expectedOutput);
  });
  test(`get parameters from a url and not the permalink`, () => {
    const inputConfig: SiteConfiguration = { id: 'url-not-permalink', isEnabled: true, customPattern: { tag: 'user-v1', url: 'https://wiki.openstreetmap.org/wiki/Key:{osm_tag_key}' } };
    const pageInput = [{ siteId: inputConfig.id, permalink: 'https://wiki.openstreetmap.org/w/index.php?title=Key:name&oldid=2013483' }];
    const expectedOutput = { siteId: inputConfig.id, attributes: { key: 'name'} };
    expect(pickWinningCandidate([inputConfig], pageInput, 'https://wiki.openstreetmap.org/wiki/Key:name')).toEqual(expectedOutput);
  });
  test(`recognize parameters from 'osmose'`, () => {
    const id = 'osmose'
    const inputConfig: SiteConfiguration = { id, isEnabled: true, defaultConfiguration: Sites[id] };
    const expectedOutputAttributes = { zoom: '18', lat: '48.439383', lon: '-4.416006'};
    expect(pickWinningCandidate([inputConfig], [{}], 'http://osmose.openstreetmap.fr/en/map/#item=7130&zoom=18&lat=48.439383&lon=-4.416006&level=1%2C2%2C3&tags=&fixable=')!.attributes).toEqual(expectedOutputAttributes);
  });

  describe('zoom', () => {
    test('with zoomAdjustment=1', () => {
      const inputAttributes = [{ siteId: aDefaultSiteConfig.id, additionalAttributes: { zoom: '1', lat: '2', lon: '3' } }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, zoomAdjustment: 1 },
      };
      const expectedOutput = {
        siteId: aDefaultSiteConfig.id,
        attributes: { ...inputAttributes[0].additionalAttributes, zoom: '2' },
      };
      expect(pickWinningCandidate([siteConfigWithAdjustment], inputAttributes, 'https://example.com/')).toEqual(expectedOutput);
    });
    test('with zoomAdjustment=12', () => {
      const inputAttributes = [{ siteId: aDefaultSiteConfig.id, additionalAttributes: { zoom: '5', lat: '6', lon: '7' } }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, zoomAdjustment: 12 },
      };
      const expectedOutput = {
        siteId: aDefaultSiteConfig.id,
        attributes: { ...inputAttributes[0].additionalAttributes, zoom: '17' },
      };
      expect(pickWinningCandidate([siteConfigWithAdjustment], inputAttributes, 'https://example.com/')).toEqual(expectedOutput);
    });
  });
});

describe(getRelevantSites.name, () => {
  const zll567_attributes = { zoom: '5', lat: '6', lon: '7' };

  test('empty input gives empty output', () => {
    expect(getRelevantSites([], '', {})).toEqual([]);
  });
  test('applies zoom,lat,lon to a site', () => {
    const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=5/6/7' }];
    expect(getRelevantSites([aDefaultSiteConfig], '', zll567_attributes)).toEqual(expectedOutput);
  });
  test('applies changeset id to osm site', () => {
    const basicPattern: SiteConfiguration =
      {id: 'an-id', isEnabled: true, customName: 'a-name', defaultConfiguration: Sites.openstreetmap};
    const expectedOutput = [{ id: basicPattern.id, customName: basicPattern.customName, url: 'https://www.openstreetmap.org/changeset/83729'}];
    expect(getRelevantSites([basicPattern], '', { changesetId: '83729'})).toEqual(expectedOutput);
  });
  test('applies zoom,lat,lon to a user-v1 pattern', () => {
    const basicPattern: SiteConfiguration =
      {id: 'an-id', isEnabled: true, customName: 'a-name', customPattern:
        {tag: 'user-v1', url: 'https://www.openstreetmap.org/#map={zoom}/{latitude}/{longitude}'}};
    const expectedOutput = [{ id: basicPattern.id, customName: basicPattern.customName, url: 'https://www.openstreetmap.org/#map=5/6/7'}];
    expect(getRelevantSites([basicPattern], '', zll567_attributes)).toEqual(expectedOutput);
  });
  test('user-v1 pattern is case-sensitive', () => {
    const basicPattern: SiteConfiguration =
      {id: 'an-id', isEnabled: true, customName: 'a-name', customPattern:
        {tag: 'user-v1', url: 'https://www.waze.com/pt-BR/editor?env=row&lon={longitude}&lat={latitude}&zoom=7'}};
    const expectedOutput = [{ id: basicPattern.id, customName: basicPattern.customName, url: 'https://www.waze.com/pt-BR/editor?env=row&lon=7&lat=6&zoom=7'}];
    expect(getRelevantSites([basicPattern], '', zll567_attributes)).toEqual(expectedOutput);
  });

  describe('zoom', () => {
    test('with zoomAdjustment=1', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=4/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, zoomAdjustment: 1 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
    test('with zoomAdjustment=3', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=2/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, zoomAdjustment: 3 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
    test('with maxZoom smaller than zoom', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=3/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, maxZoom: 3 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
    test('with maxZoom greater than zoom', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=5/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, maxZoom: 6 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
    test('with maxZoom greater than a decimal zoom', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=9.2109/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, maxZoom: 10 },
      };
      const input = { ...zll567_attributes, zoom: '9.2109' };
      expect(getRelevantSites([siteConfigWithAdjustment], '', input)).toEqual(expectedOutput);
    });

    test('with maxZoom equal to zoom', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=5/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, maxZoom: 5 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
    test('with maxZoom greater than zoom AND zoomAdjustment', () => {
      const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=2/6/7' }];
      const siteConfigWithAdjustment: SiteConfiguration = {
        ...aDefaultSiteConfig,
        defaultConfiguration: { ...aDefaultSiteConfig.defaultConfiguration!, maxZoom: 3, zoomAdjustment: 3 },
      };
      expect(getRelevantSites([siteConfigWithAdjustment], '', zll567_attributes)).toEqual(expectedOutput);
    });
  });
});
