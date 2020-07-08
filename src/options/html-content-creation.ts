import { SiteConfiguration, updateLocalConfig, setOrderedSiteIds, getSiteConfiguration } from "../config-handler";
import { browser } from "webextension-polyfill-ts";
import dragula from 'dragula';

const dragHandleClass = 'drag-handle';

export function createConfigurableSitesList(d: Document, sitesConfig: SiteConfiguration[]): HTMLElement {
  const div = d.createElement('div');

  sitesConfig.forEach((siteConfig) => {
    if (!siteConfig.customPattern && !siteConfig.defaultConfiguration) return; // should not be possible

    const line = createConfigurableLine(d, siteConfig);
    line && div.appendChild(line);
  });

  d.body.append(div);

  const dragAndDropHandler = dragula([div], {
    moves: (_el, _container, handle) => Boolean(handle && handle.classList.contains(dragHandleClass))
  });
  dragAndDropHandler.on('drop', (_el, _target, _source, _sibling) => {
    const orderedSitesWithId = [
      ...d.querySelectorAll('div input[type=checkbox]'),
    ].map((input: Element) => (input as HTMLInputElement).name)
    setOrderedSiteIds(orderedSitesWithId);
  });

  return div;
}

function createConfigurableLine(d: Document, siteConfig: SiteConfiguration, editable: boolean = false): HTMLElement {
  const label = d.createElement('label');
  label.setAttribute('style', 'display: flex; padding: 1px 0 1px; align-items: center;');

  const img = d.createElement('img');
  img.className = dragHandleClass;
  img.src = '/icons/drag_indicator-black.svg'; // from https://fonts.gstatic.com/s/i/materialicons/drag_indicator/v5/24px.svg?download=true
  img.setAttribute('style', 'height: 100%; touch-action: none;');
  label.append(img);

  const input = d.createElement('input');
  input.type = 'checkbox';
  input.name = siteConfig.id;
  input.setAttribute('style', 'margin-left: 0;');
  input.checked = siteConfig.isEnabled;
  label.appendChild(input);

  const siteTitle = siteConfig.customName || browser.i18n.getMessage(`site_${siteConfig.id}`) || '???';

  if (editable) {
    const titleInput = d.createElement('input');
    titleInput.type = 'text';
    titleInput.setAttribute('style', 'width: 100%; margin-right: 2px;');
    titleInput.value = siteTitle;

    const saveButton = d.createElement('button');
    saveButton.setAttribute('style', 'margin-left: auto;');
    saveButton.textContent = browser.i18n.getMessage('config_saveButton');
    saveButton.addEventListener('click', async () => {
      const newConfig = await saveNewTitle(siteConfig.id, titleInput.value);
      label.replaceWith(createConfigurableLine(d, newConfig, !editable));
    });

    label.append(titleInput)
    label.append(saveButton);
  } else {
    label.append(siteTitle);

    const editButton = d.createElement('button');
    editButton.textContent = browser.i18n.getMessage('config_editButton');
    editButton.setAttribute('style', 'margin-left: auto;');
    editButton.addEventListener('click', () => 
      label.replaceWith(createConfigurableLine(d, siteConfig, !editable))
    );
  
    label.append(editButton);
  }

  label.addEventListener('click', labelClick);

  return label;
}

async function labelClick(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const input = event.target;
    updateLocalConfig(input.name, {
      isEnabled: input.checked,
    });
  }
}

async function saveNewTitle(siteId: string, newTitle: string): Promise<SiteConfiguration> {
  await updateLocalConfig(siteId, {
    customName: newTitle,
  });
  return getSiteConfiguration(siteId);
}
