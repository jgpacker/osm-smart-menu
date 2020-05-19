import { browser } from "webextension-polyfill-ts";
import { SelectedSite } from "../sites-manipulation-helper";

export function createOptionsList(d: Document, sitesList: SelectedSite[]): HTMLElement {
  const div = d.createElement('div');

  sitesList
    .filter((site) => site.active)
    .forEach(function (site) {
      const anchor = d.createElement('a');
      anchor.id = site.id;
      anchor.href = site.url;
      anchor.textContent = browser.i18n.getMessage(`site_${site.id}`);
      anchor.className = 'site';

      div.appendChild(anchor);
    });

  return div;
}

export function getLoadingMessage(d: Document): HTMLElement {
  const div = d.createElement('div');
  div.id = 'loading';
  const strong = d.createElement('strong');
  strong.append(browser.i18n.getMessage('loading_firstLine'));
  div.append(strong);
  div.append(d.createElement('br'));
  div.append(browser.i18n.getMessage('loading_secondLine'));
  return div;
}

export enum KnownError {
  NO_ACCESS = 'noAccess',
  UNKNOWN_WEBSITE = 'unknownWebsite',
  NO_INFORMATION_EXTRACTED = 'noInformationExtracted',
}

export function getErrorMessage(d: Document, error: KnownError): HTMLElement {
  const div = d.createElement('div');
  div.id = 'error';
  const linkPlaceholder = '__LINK__';
  const text = browser.i18n.getMessage(`error_${error}`, linkPlaceholder);
  const linkText = 'github.com/jgpacker/osm-smart-menu/';
  insertLinkInsideText(d, text, linkPlaceholder, `https://${linkText}blob/master/README.md`, linkText).forEach(
    (x) => div.append(x)
  )
  return div;
}

function insertLinkInsideText(d: Document, text: string, linkPlaceholder: string, link: string, linkText: string): (string | HTMLElement)[] {
  const [firstHalf, secondHalf] = text.split(linkPlaceholder);
  const anchor = d.createElement('a');
  anchor.href = link;
  anchor.textContent = linkText;
  return [firstHalf, anchor, secondHalf];
}