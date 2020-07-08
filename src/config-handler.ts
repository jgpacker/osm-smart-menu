import { browser } from "webextension-polyfill-ts";
import { Sites, DefaultSiteConfiguration } from "./sites-configuration";
import { UrlPattern } from "./popup/sites-manipulation-helper";

export type LocalSiteConfiguration = {
  isEnabled: boolean;
  customName?: string;
  customPattern?: UrlPattern;
}

async function getLocalConfig(siteId: string): Promise<LocalSiteConfiguration> {
  const defaultSiteConfig: LocalSiteConfiguration = {
    isEnabled: true,
  }
  const key = `site_${siteId}`;
  const storedObject = await browser.storage.local.get(key);
  if (typeof storedObject === "object" && storedObject &&
    typeof storedObject[key] === "object" && storedObject[key]
  ) {
    const s = storedObject[key];
    const localSiteConfig: LocalSiteConfiguration = {
      isEnabled: typeof s.isEnabled !== "undefined"? s.isEnabled: defaultSiteConfig.isEnabled,
      customName: s.customName,
      customPattern: s.customPattern,
    };
    return localSiteConfig
  } else {
    return defaultSiteConfig;
  }
}

export async function updateLocalConfig(siteId: string, config: Partial<LocalSiteConfiguration>): Promise<void> {
  const oldConfig = await getLocalConfig(siteId);
  await setLocalConfig(siteId, {
    ...oldConfig,
    ...config
  });
}

export async function setLocalConfig(siteId: string, config: LocalSiteConfiguration): Promise<void> {
  const newConfig = {
    [`site_${siteId}`]: config,
  };
  await browser.storage.local.set(newConfig);
}

const siteIdsOrderKey = 'sites-order';
const defaultSiteIdsOrder = Object.keys(Sites);
export async function getOrderedSiteIds(): Promise<string[]> {
  const storedObject = await browser.storage.local.get(siteIdsOrderKey);
  if (typeof storedObject === 'object' && storedObject && storedObject[siteIdsOrderKey] instanceof Array) {
    const storedSitesIdOrder: string[] = storedObject[siteIdsOrderKey];
    const newSites = defaultSiteIdsOrder.filter((s) => !storedSitesIdOrder.includes(s))
    if (newSites.length > 0) {
      const newOrder = storedSitesIdOrder.concat(newSites);
      setOrderedSiteIds(newOrder);
      return newOrder;
    } else {
      return storedSitesIdOrder;
    }
  } else {
    setOrderedSiteIds(defaultSiteIdsOrder);
    return defaultSiteIdsOrder;
  }
}
export async function setOrderedSiteIds(orderedSiteIds: string[]): Promise<void> {
  await browser.storage.local.set({
    [siteIdsOrderKey]: orderedSiteIds,
  });
}

export type SiteConfiguration = LocalSiteConfiguration & {
  id: string;
  defaultConfiguration?: DefaultSiteConfiguration;
}

export async function getSitesConfiguration(): Promise<SiteConfiguration[]> {
  const orderedSiteIds = await getOrderedSiteIds();
  return await Promise.all(orderedSiteIds.map(async (siteId): Promise<SiteConfiguration> =>
    getSiteConfiguration(siteId)
  ));
}

export async function getSiteConfiguration(siteId: string): Promise<SiteConfiguration> {
  const localConfig = await getLocalConfig(siteId);
  return {
    id: siteId,
    ...localConfig,
    defaultConfiguration: Sites[siteId],
  };
}
