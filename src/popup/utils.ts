import { browser } from "webextension-polyfill-ts";
import { UrlPattern } from "./sites-manipulation-helper";

export type CustomUserOption = {
  defaultName: string;
  urlPattern: UrlPattern;
}

export enum KnownError {
  NO_ACCESS = 'noAccess',
  INCOMPATIBLE_WEBSITE = 'incompatibleWebsite',
  NO_INFORMATION_EXTRACTED = 'noInformationExtracted',
}

export function openLink(url: string): void {
  browser.tabs.create({ url });
}
