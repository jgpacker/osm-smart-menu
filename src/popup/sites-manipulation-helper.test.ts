import { findSiteCandidates, getRelevantSites, pickWinningCandidate } from "./sites-manipulation-helper";
import { SiteConfiguration } from "../config-handler";
import { Sites } from "../sites-configuration";

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
  test('chrome//:home url finds nothing', () => {
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
  test('applies zoom,lat,lon to a user-v1 pattern', () => {
    const basicPattern: SiteConfiguration =
      {id: 'an-id', isEnabled: true, customName: 'a-name', customPattern:
        {tag: 'user-v1', url: 'https://www.openstreetmap.org/#map={zoom}/{latitude}/{longitude}'}};
    const expectedOutput = [{ id: basicPattern.id, customName: basicPattern.customName, url: 'https://www.openstreetmap.org/#map=5/6/7'}];
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
