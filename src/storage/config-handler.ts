import { browser, Storage } from "webextension-polyfill-ts";
import { Sites, DefaultSiteConfiguration } from "../sites-configuration";
import { UrlPattern } from "../popup/sites-manipulation-helper";

export type StoredConfiguration = {
  isEnabled: boolean;
  customName?: string;
  customPattern?: UrlPattern;
}

// needs fallback https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync#Browser_compatibility
const storage: Storage.StorageArea = browser.storage.sync || browser.storage.local;

const getConfigKey = (siteId: string) => `site_${siteId}`;

function getDefaultEnabledAttribute(siteId: string) {
  if (Sites[siteId] && Sites[siteId].disabledByDefault) {
    return false;
  } else {
    return true;
  }
}

async function getStoredConfig(siteId: string): Promise<StoredConfiguration> {
  const key = getConfigKey(siteId);
  const storedObject = await storage.get(key);
  if (typeof storedObject === "object" && storedObject &&
    typeof storedObject[key] === "object" && storedObject[key]
  ) {
    const s = storedObject[key];
    const siteConfig: StoredConfiguration = {
      isEnabled: typeof s.isEnabled !== "undefined"? s.isEnabled: getDefaultEnabledAttribute(siteId),
      customName: s.customName,
      customPattern: s.customPattern,
    };
    return siteConfig
  } else {
    return {
      isEnabled: getDefaultEnabledAttribute(siteId),
    };
  }
}

export async function updateStoredConfig(siteId: string, config: Partial<StoredConfiguration>): Promise<void> {
  const oldConfig = await getStoredConfig(siteId);
  await setStoredConfig(siteId, {
    ...oldConfig,
    ...config
  });
}

export async function setStoredConfig(siteId: string, config: StoredConfiguration): Promise<void> {
  const newConfig = {
    [getConfigKey(siteId)]: config,
  };
  await storage.set(newConfig);
}

export async function addNewUrlPattern(name: string, urlPattern: UrlPattern, isEnabled: boolean = true): Promise<void> {
  const timestamp = Date.now();
  const siteId = encodeURIComponent(`${timestamp}_${urlPattern.url}`);

  await setStoredConfig(siteId, {
    isEnabled,
    customName: name,
    customPattern: urlPattern,
  });

  await setOrderedSiteIds(
    [siteId].concat(await getOrderedSiteIds())
  );
};

export async function deleteUrlPattern(siteId: string): Promise<void> {
  await setOrderedSiteIds(
    (await getOrderedSiteIds()).filter(id => id !== siteId)
  );
  await storage.remove(getConfigKey(siteId));
}

const siteIdsOrderKey = 'sites-order';
const defaultSiteIdsOrder = Object.keys(Sites);
export async function getOrderedSiteIds(): Promise<string[]> {
  const storedObject = await storage.get(siteIdsOrderKey);
  if (typeof storedObject === 'object' && storedObject && storedObject[siteIdsOrderKey] instanceof Array) {
    const storedSitesIdOrder: string[] = storedObject[siteIdsOrderKey];
    const newSites = defaultSiteIdsOrder.filter((s) => !storedSitesIdOrder.includes(s))
    if (newSites.length > 0) {
      const newOrder = storedSitesIdOrder.concat(newSites);
      await setOrderedSiteIds(newOrder);
      return newOrder;
    } else {
      return storedSitesIdOrder;
    }
  } else {
    await setOrderedSiteIds(defaultSiteIdsOrder);
    return defaultSiteIdsOrder;
  }
}
export async function setOrderedSiteIds(orderedSiteIds: string[]): Promise<void> {
  await storage.set({
    [siteIdsOrderKey]: orderedSiteIds,
  });
}

export type SiteConfiguration = StoredConfiguration & {
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
  const storedConfig = await getStoredConfig(siteId);
  return {
    id: siteId,
    ...storedConfig,
    defaultConfiguration: Sites[siteId],
  };
}
