import { browser } from "webextension-polyfill-ts";
import { SelectedSite } from "../sites-manipulation-helper";

export function createOptionsList(document: Document, sitesList: SelectedSite[]): HTMLElement {
  const div = document.createElement('div');

  sitesList.forEach(function (site) {
    const anchor = document.createElement('a');
    anchor.id = site.id;
    anchor.href = site.url;
    anchor.textContent = browser.i18n.getMessage(`site_${site.id}`);
    const additionalClass = site.active? '': 'disabled';
    anchor.className = `site ${additionalClass}`;

    div.appendChild(anchor);
  });

  return div;
}

export function getLoadingMessage(document: Document): HTMLElement {
  const div = document.createElement('div');
  div.id = 'loading';

  div.append(browser.i18n.getMessage('loading_firstLine'));
  div.append(document.createElement('br'));

  const splitPoint = '__OPENSTREETMAP_LINK__';
  const secondLine = browser.i18n.getMessage('loading_secondLine', splitPoint);
  const [firstHalf, secondHalf] = secondLine.split(splitPoint);
  div.append(firstHalf);
  const anchor = document.createElement('a');
  anchor.href = 'http://www.openstreetmap.org/';
  anchor.textContent = anchor.href;
  div.append(anchor);
  div.append(secondHalf);

  return div;
}
