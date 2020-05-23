import { browser } from 'webextension-polyfill-ts'
import { Sites } from '../sites-configuration'
import { getLocalConfig, setLocalConfig } from '../config-handler';

(async function () {
  document.addEventListener("click", handleClick);

  const div = document.createElement('div');

  await Object.entries(Sites).forEach(async ([siteId, _site]) => {
    const localConfig = await getLocalConfig(siteId);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = siteId;
    input.checked = localConfig.isEnabled;

    const label = document.createElement('label');
    label.appendChild(input);
    label.append(browser.i18n.getMessage(`site_${siteId}`));

    div.appendChild(label);
  });

  document.body.append(div);
})();


async function handleClick(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    const input = event.target;
    setLocalConfig(input.name, {
      isEnabled: input.checked,
    });
  }
}
