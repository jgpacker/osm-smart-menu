import { browser } from "webextension-polyfill-ts";
import { Sites } from "./sites-configuration";

export type LocalSiteConfiguration = {
  isEnabled: boolean;
}
export async function getLocalConfig(siteId: string): Promise<LocalSiteConfiguration> {
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
    }
    return localSiteConfig
  } else {
    return defaultSiteConfig;
  }
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
