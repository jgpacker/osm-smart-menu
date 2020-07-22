import { SiteConfiguration, updateStoredConfig, setOrderedSiteIds, getSiteConfiguration, addNewUrlPattern, deleteUrlPattern } from "../config-handler";
import { browser } from "webextension-polyfill-ts";
import dragula from 'dragula';
import { UrlPattern } from "../popup/sites-manipulation-helper";

const dragHandleClass = 'drag-handle';

export function createConfigurableSitesList(d: Document, sitesConfig: SiteConfiguration[]): HTMLElement {
  const div = d.createElement('div');

  sitesConfig.forEach((siteConfig) => {
    if (!siteConfig.customPattern && !siteConfig.defaultConfiguration) return; // should not be possible

    const line = createConfigurableLine(d, siteConfig);
    line && div.appendChild(line);
  });

  d.body.append(div);

  const updateSiteIdsOrder = async () => {
    const orderedSitesWithId = [
      ...d.querySelectorAll('div input[type=checkbox]'),
    ].map((input: Element) => (input as HTMLInputElement).name)
    await setOrderedSiteIds(orderedSitesWithId);
  };
  const dragAndDropHandler = dragula([div], {
    moves: (_el, _container, handle) => Boolean(handle && handle.classList.contains(dragHandleClass))
  });
  dragAndDropHandler.on('drop', updateSiteIdsOrder);

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
    label.append(titleInput)

    const saveButton = d.createElement('button');
    saveButton.setAttribute('style', 'margin-left: auto;');
    saveButton.textContent = browser.i18n.getMessage('config_saveButton');
    saveButton.addEventListener('click', async () => {
      const newConfig = await saveNewTitle(siteConfig.id, titleInput.value);
      label.replaceWith(createConfigurableLine(d, newConfig, !editable));
    });
    label.append(saveButton);

    if (siteConfig.customPattern) {
      const deleteButton = d.createElement('button');
      deleteButton.setAttribute('style', 'margin-left: 2px;');
      deleteButton.textContent = browser.i18n.getMessage('config_deleteButton');
      deleteButton.addEventListener('click', async () => {
        await deleteUrlPattern(siteConfig.id);
        const deletedMessage = d.createElement('div');
        deletedMessage.textContent = browser.i18n.getMessage('config_linkDeleted', siteTitle);
        deletedMessage.setAttribute('style',
          'text-align: center; background-color: #f0f0f0; border-radius: 2px; cursor: pointer; padding: 3px; margin: 1px 0;'
        );
        deletedMessage.setAttribute('role', 'link');
        deletedMessage.addEventListener('click', async () => {
          await addNewUrlPattern(siteConfig.customName || '???', siteConfig.customPattern!, siteConfig.isEnabled);
          window.location.reload();
        });
        label.replaceWith(deletedMessage);
      });
      label.append(deleteButton);
    }
  } else {
    label.append(siteTitle);

    const editButton = d.createElement('button');
    editButton.textContent = browser.i18n.getMessage('config_editButton');
    editButton.setAttribute('style', 'margin-left: auto;');
    editButton.addEventListener('click', async () => 
      label.replaceWith(createConfigurableLine(d, (await getSiteConfiguration(siteConfig.id)), !editable))
    );
  
    label.append(editButton);
  }

  label.addEventListener('click', labelClick);

  return label;
}

async function labelClick(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const input = event.target;
    await updateStoredConfig(input.name, {
      isEnabled: input.checked,
    });
  }
}

async function saveNewTitle(siteId: string, newTitle: string): Promise<SiteConfiguration> {
  await updateStoredConfig(siteId, {
    customName: newTitle,
  });
  return getSiteConfiguration(siteId);
}

export function createUrlPatternInput(d: Document): HTMLElement {
  const form = d.createElement('form');
  form.action = '#';
  form.setAttribute('style', 'margin-top: 10px;');
  const fieldset = d.createElement('fieldset');
  form.append(fieldset);

  const sectionTitle = d.createElement('legend');
  sectionTitle.textContent = browser.i18n.getMessage('config_pattern_formTitle');
  fieldset.append(sectionTitle);

  const inputStyle = 'display: block; margin-bottom: 5px';

  const nameLabel = d.createElement('label');
  nameLabel.textContent = browser.i18n.getMessage('config_pattern_name');
  nameLabel.setAttribute('style', ';');
  fieldset.append(nameLabel);

  const nameInput = d.createElement('input');
  nameInput.type = 'text';
  nameInput.setAttribute('style', inputStyle);
  nameInput.required = true;
  nameLabel.append(nameInput);

  const urlLabel = d.createElement('label');
  urlLabel.textContent = browser.i18n.getMessage('config_pattern_urlTemplate');
  fieldset.append(urlLabel);
  const urlInput = d.createElement('input');
  urlInput.type = 'url';
  urlInput.placeholder = 'https://www.openstreetmap.org/#map={zoom}/{latitude}/{longitude}';
  urlInput.setAttribute('style', inputStyle);
  urlInput.required = true;
  urlInput.pattern = // must contain curly braces; but only with known parameters
    /([^{}]+\{(zoom|latitude|longitude|osm_(user_name|tag_key|tag_value|(changeset|node|way|relation)_id))\})+[^{}]*/.source;
  urlLabel.append(urlInput);

  const submitButton = d.createElement('input');
  submitButton.type = 'submit'
  submitButton.value = browser.i18n.getMessage('config_pattern_createOption');

  fieldset.append(submitButton);

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // needed to ensure this async function executes completely
    await addNewUserUrl(nameInput.value, urlInput.value);
    window.location.reload();
  });

  return form;
}

async function addNewUserUrl(name: string, url: string) {
  const urlPattern: UrlPattern = { tag: 'user-v1', url };
  await addNewUrlPattern(name, urlPattern);
}