import { browser } from "webextension-polyfill-ts";

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
