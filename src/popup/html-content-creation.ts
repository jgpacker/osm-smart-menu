import { browser } from "webextension-polyfill-ts";
import { SelectedSite } from "../sites-manipulation-helper";

export function createOptionsList(d: Document, sitesList: SelectedSite[]): HTMLElement {
  const div = d.createElement('div');

  sitesList.forEach(function (site) {
    const anchor = d.createElement('a');
    anchor.id = site.id;
    anchor.href = site.url;
    anchor.textContent = browser.i18n.getMessage(`site_${site.id}`);
    const additionalClass = site.active? '': 'disabled';
    anchor.className = `site ${additionalClass}`;

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
  if (error === KnownError.UNKNOWN_WEBSITE || error === KnownError.NO_INFORMATION_EXTRACTED) {
    const linkPlaceholder = '__LINK__';
    const text = browser.i18n.getMessage(`error_${error}`, linkPlaceholder);
    insertLinkInsideText(d, text, linkPlaceholder, 'https://github.com/jgpacker/osm-smart-menu/').forEach(
      (x) => div.append(x)
    )
  } else {
    div.append(browser.i18n.getMessage(`error_${error}`,));
  }
  return div;
}

function insertLinkInsideText(d: Document, text: string, linkPlaceholder: string, link: string): (string | HTMLElement)[] {
  const [firstHalf, secondHalf] = text.split(linkPlaceholder);
  const anchor = d.createElement('a');
  anchor.href = link;
  anchor.textContent = anchor.href;
  return [firstHalf, anchor, secondHalf];
}