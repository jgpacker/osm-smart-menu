import { browser } from 'webextension-polyfill-ts'
import { Sites } from '../sites-configuration'
import { getLocalConfig, setLocalConfig, getOrderedSiteIds, setOrderedSiteIds } from '../config-handler';
import dragula from 'dragula';

const dragAndDropHandleClass = 'drag-and-drop-handle';
(async function () {
  document.addEventListener("click", handleClick);

  const div = document.createElement('div');

  const orderedSiteIds = await getOrderedSiteIds();
  await orderedSiteIds.forEach(async (siteId) => {
    if (!Sites[siteId]) return;
    const localConfig = await getLocalConfig(siteId);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = siteId;
    input.checked = localConfig.isEnabled;

    const label = document.createElement('label');
    label.appendChild(input);
    
    const icon = document.createElement('span');
    icon.className = dragAndDropHandleClass;
    icon.append('↕'); // https://unicode-table.com/en/2195/
    icon.setAttribute('style', 'display: inline-block; padding-left: 1px; padding-right: 3px;')
    label.append(icon);

    label.append(browser.i18n.getMessage(`site_${siteId}`));
    label.setAttribute('style', 'display: flex; padding: 1px 0 1px; align-items: center;');

    div.appendChild(label);
  });

  document.body.append(div);

  const dragAndDropHandler = dragula([div], {
    moves: (_el, _container, handle) => Boolean(handle && handle.classList.contains(dragAndDropHandleClass))
  });
  dragAndDropHandler.on('drop', (_el, _target, _source, _sibling) => {
    const orderedSitesWithId = [...div.children]
      .map((label) => label.firstElementChild instanceof HTMLInputElement? label.firstElementChild.name: undefined)
      .filter((x): x is string => Boolean(x))
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
