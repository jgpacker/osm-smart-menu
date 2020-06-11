import { browser } from 'webextension-polyfill-ts'
import { Sites } from '../sites-configuration'
import { getLocalConfig, setLocalConfig, getOrderedSiteIds, setOrderedSiteIds } from '../config-handler';
import dragula from 'dragula';

const dragHandleClass = 'drag-handle';
(async function () {
  document.addEventListener("click", handleClick);

  const div = document.createElement('div');

  const orderedSiteIds = await getOrderedSiteIds();
  await orderedSiteIds.forEach(async (siteId) => {
    if (!Sites[siteId]) return;
    const localConfig = await getLocalConfig(siteId);

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

    label.append(browser.i18n.getMessage(`site_${siteId}`));
    label.setAttribute('style', 'display: flex; padding: 1px 0 1px; align-items: center;');

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


async function handleClick(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const input = event.target;
    setLocalConfig(input.name, {
      isEnabled: input.checked,
    });
  }
}
