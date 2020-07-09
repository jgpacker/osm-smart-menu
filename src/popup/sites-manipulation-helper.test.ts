import { findSiteCandidates, getRelevantSites, pickWinningCandidate } from "./sites-manipulation-helper";
import { SiteConfiguration } from "../config-handler";

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
});

describe(pickWinningCandidate.name, () => {
  test('empty input gives empty output', () => {
    expect(pickWinningCandidate([], [], '')).toBeUndefined();
  });
  test('picks a site', () => {
    const inputAttributes = [{siteId:aDefaultSiteConfig.id, additionalAttributes: { zoom: '1', lat: '2', lon: '3'}}];
    const expectedOutput = { siteId: aDefaultSiteConfig.id, attributes: inputAttributes[0].additionalAttributes };
    expect(pickWinningCandidate([aDefaultSiteConfig], inputAttributes, 'https://example.com/')).toEqual(expectedOutput);
  });
  describe('zoom', () => {
    test('with zoomAdjustment=1', () => {
      const inputAttributes = [{siteId:aDefaultSiteConfig.id, additionalAttributes: { zoom: '1', lat: '2', lon: '3'}}];
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
      const inputAttributes = [{siteId:aDefaultSiteConfig.id, additionalAttributes: { zoom: '5', lat: '6', lon: '7'}}];
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
  const zll567_attributes = { zoom: '5', lat: '6', lon: '7'};

  test('empty input gives empty output', () => {
    expect(getRelevantSites([], '', {})).toEqual([]);
  });
  test('applies zoom,lat,lon to a site', () => {
    const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=5/6/7' }];
    expect(getRelevantSites([aDefaultSiteConfig], '', zll567_attributes)).toEqual(expectedOutput);
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
