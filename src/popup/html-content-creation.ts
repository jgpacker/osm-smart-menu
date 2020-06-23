import { browser } from "webextension-polyfill-ts";
import { SiteLink, UrlPattern } from "./sites-manipulation-helper";

export type CustomUserOption = {
  defaultName: string;
  urlPattern: UrlPattern;
}

export function createOptionsList(d: Document, sitesList: SiteLink[]): HTMLElement {
  const div = d.createElement('div');

  sitesList.forEach(function (site) {
      const anchor = d.createElement('a');
      anchor.id = site.id;
      anchor.href = site.url;
      anchor.textContent = site.customName || browser.i18n.getMessage(`site_${site.id}`);
      anchor.className = 'site';

      div.appendChild(anchor);
    });

  return div;
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

const OpenStreetMap = 'OpenStreetMap';
export function getErrorMessage(d: Document, error: KnownError): HTMLElement {
  const div = d.createElement('div');
  div.id = 'info';
  const linkPlaceholder = '__LINK__';
  const text = browser.i18n.getMessage(`error_${error}`, linkPlaceholder);
  const linkText = 'github.com/jgpacker/osm-smart-menu/';
  insertLinkInsideText(d, text, linkPlaceholder, `https://${linkText}blob/master/README.md`, linkText).forEach((node) => {
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
  button.setAttribute('data-configuration', JSON.stringify(newConfig));
  button.setAttribute('style', 'display: block; margin: 4px auto;');
  button.addEventListener('click', buttonClick(createNewOption));
  div.append(button);

  return div;
}

function buttonClick(createNewOption: (option: CustomUserOption) => Promise<void>) {
  return async function(this: HTMLButtonElement, _ev: MouseEvent) {
    const customUserOption: CustomUserOption = JSON.parse(this.getAttribute('data-configuration') || '');
    await createNewOption(customUserOption);

    const div = this.parentElement!;
    div.textContent = browser.i18n.getMessage('newOptionDetected_added');
    this.remove();
  };
}
