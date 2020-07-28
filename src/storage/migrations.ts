import { browser, Runtime } from "webextension-polyfill-ts";

export async function idempotentMigrations(_details: Runtime.OnInstalledDetailsType): Promise<void> {
  await migrateLocalStorageToSyncStorage();
}

async function migrateLocalStorageToSyncStorage() {
  if (!browser.storage.sync) return; // a safeguard for browsers that do not support storage.sync

  const localData = await browser.storage.local.get();
  if (localData && Object.keys(localData).length > 0) {
    await browser.storage.sync.set(localData);
    await browser.storage.local.clear();
    console.log('Data migrated from local storage to sync storage:', JSON.stringify(localData));
  }
}
