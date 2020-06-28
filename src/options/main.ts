import { browser } from 'webextension-polyfill-ts'
import { getLocalConfig, getOrderedSiteIds, setOrderedSiteIds, updateLocalConfig } from '../config-handler';
import dragula from 'dragula';
import { Sites } from '../sites-configuration';

const dragHandleClass = 'drag-handle';
(async function () {
  const div = document.createElement('div');

  const orderedSiteIds = await getOrderedSiteIds();
  await orderedSiteIds.forEach(async (siteId) => {
    const localConfig = await getLocalConfig(siteId);
    if (!Sites[siteId] && !localConfig.customPattern) return; // should not be possible

    const label = document.createElement('label');
    
    const img = document.createElement('img');
    img.className = dragHandleClass;
    img.src = '/icons/drag_indicator-black.svg'; // from https://fonts.gstatic.com/s/i/materialicons/drag_indicator/v5/24px.svg?download=true
    img.setAttribute('style', 'height: 100%; touch-action: none;');
    label.append(img);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = siteId;
    input.setAttribute('style', 'margin-left: 0;');
    input.checked = localConfig.isEnabled;
    label.appendChild(input);

    label.append(localConfig.customName || browser.i18n.getMessage(`site_${siteId}`));
    label.setAttribute('style', 'display: flex; padding: 1px 0 1px; align-items: center;');

    label.addEventListener('click', labelClick);

    div.appendChild(label);
  });

  document.body.append(div);

  const dragAndDropHandler = dragula([div], {
    moves: (_el, _container, handle) => Boolean(handle && handle.classList.contains(dragHandleClass))
  });
  dragAndDropHandler.on('drop', (_el, _target, _source, _sibling) => {
    const orderedSitesWithId = [
      ...document.querySelectorAll('div input[type=checkbox]'),
    ].map((input: Element) => (input as HTMLInputElement).name)
    setOrderedSiteIds(orderedSitesWithId);
  });
})();


async function labelClick(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const input = event.target;
    updateLocalConfig(input.name, {
      isEnabled: input.checked,
    });
  }
}
