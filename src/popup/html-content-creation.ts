import { browser } from "webextension-polyfill-ts";
import { SiteLink, UrlPattern, getRelevantSites } from "./sites-manipulation-helper";
import { SiteConfiguration } from "../config-handler";

export type CustomUserOption = {
  defaultName: string;
  urlPattern: UrlPattern;
}

export function createConfigurationLink(d: Document): HTMLElement {
  const configLink = d.createElement('span');
  configLink.textContent = browser.i18n.getMessage('configurationLink');
  configLink.setAttribute('style',
    `text-transform: lowercase; display: block; text-align: ${browser.i18n.getMessage('@@bidi_end_edge')}; cursor: pointer; font-size: smaller; background-color: #f0f0f0`);
  configLink.setAttribute('role', 'link');
  configLink.addEventListener('click', () => browser.runtime.openOptionsPage());

  return configLink;
}

export function createOptionsList(d: Document, sitesList: SiteLink[]): HTMLElement {
  const div = d.createElement('div');

  sitesList.forEach(function (site) {
    const anchor = d.createElement('a');
    anchor.id = site.id;
    anchor.href = site.url;
    anchor.textContent = site.customName || browser.i18n.getMessage(`site_${site.id}`) || '???';
    anchor.className = 'site';
    anchor.addEventListener('click', openLink);

    div.appendChild(anchor);
  });

  return div;
}

export function createShowAllSitesButton(document: Document, sites: SiteConfiguration[]): HTMLElement {
  const button = document.createElement('button');
  button.setAttribute('style', 'margin: 5px; text-align: center; display: block;');
  button.textContent = browser.i18n.getMessage('button_showEnabledLinks');
  button.addEventListener('click', () => {
    const basicData: Record<string, string> = {
      zoom: '3',
      lat: '23.00',
      lon: '24.43',
    };
    button.replaceWith(createOptionsList(document, getRelevantSites(sites, undefined, basicData)));
  });
  return button;
}

export function getLoadingMessage(d: Document): HTMLElement {
  const div = d.createElement('div');
  div.id = 'loading';
  div.append(browser.i18n.getMessage('loading'));
  return div;
}

export enum KnownError {
  NO_ACCESS = 'noAccess',
  INCOMPATIBLE_WEBSITE = 'incompatibleWebsite',
  NO_INFORMATION_EXTRACTED = 'noInformationExtracted',
}

const OpenStreetMap = browser.i18n.getMessage('site_openstreetmap');
export function getErrorMessage(d: Document, error: KnownError): HTMLElement {
  const div = d.createElement('div');
  div.id = 'info';
  const linkPlaceholder = '__LINK__';
  const text = browser.i18n.getMessage(`error_${error}`, linkPlaceholder);
  const linkText = 'jgpacker/osm-smart-menu';
  insertLinkInsideText(d, text, linkPlaceholder, `https://github.com/${linkText}/blob/master/README.md#osm-smart-menu`, linkText).forEach((node) => {
    if (typeof node === 'string' && node.includes(OpenStreetMap)) {
      insertLinkInsideText(d, node, OpenStreetMap, 'https://openstreetmap.org', OpenStreetMap).forEach((node) => div.append(node))
    } else {
      div.append(node);
    }
  });
  return div;
}

function insertLinkInsideText(d: Document, text: string, linkPlaceholder: string, link: string, linkText: string): (string | HTMLElement)[] {
  const [firstHalf, secondHalf] = text.split(linkPlaceholder);
  const anchor = d.createElement('a');
  anchor.href = link;
  anchor.textContent = linkText;
  anchor.addEventListener('click', openLink);
  return [firstHalf, anchor, secondHalf];
}

export function createBasicOptionCreationButton(
  d: Document,
  newConfig: CustomUserOption,
  createNewOption: (option: CustomUserOption) => Promise<void>
): HTMLElement {
  const div = d.createElement('div');
  div.id = 'info';
  div.append(browser.i18n.getMessage('newOptionDetected_notice'));

  const button = d.createElement('button');
  button.textContent = browser.i18n.getMessage('newOptionDetected_buttonText');
  button.setAttribute('style', 'display: block; margin: 4px auto;');
  button.addEventListener('click', buttonClick(newConfig, createNewOption));
  div.append(button);

  return div;
}

function openLink(event: Event): void {
  if (event.target instanceof HTMLAnchorElement) {
    browser.tabs.create({ url: event.target.href });
    event.preventDefault();
  }
}

function buttonClick(newConfig: CustomUserOption, createNewOption: (option: CustomUserOption) => Promise<void>) {
  return async function(this: HTMLButtonElement, _ev: MouseEvent) {
    await createNewOption(newConfig);

    const div = this.parentElement!;
    div.textContent = browser.i18n.getMessage('newOptionDetected_added');
    this.remove();
  };
}
