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
});

describe(getRelevantSites.name, () => {
  test('empty input gives empty output', () => {
    expect(getRelevantSites([], '', {})).toEqual([]);
  });
  test('applies zoom,lat,lon to a site', () => {
    const expectedOutput = [{ id: aDefaultSiteConfig.id, url: 'https://example.com/#map=1/2/3' }];
    expect(getRelevantSites([aDefaultSiteConfig], '', { zoom: '1', lat: '2', lon: '3'})).toEqual(expectedOutput);
  });
});
