import { getSitesConfiguration } from '../config-handler';
import { createConfigurableSitesList } from './html-content-creation';

(async function () {
  const sitesConfig = await getSitesConfiguration();
  const optionsLayout = createConfigurableSitesList(document, sitesConfig);

  document.body.append(optionsLayout);
})();
