import { getSitesConfiguration } from '../storage/config-handler';
import { createConfigurableSitesList, createUrlPatternInput } from './html-content-creation';

(async function () {
  const sitesConfig = await getSitesConfiguration();
  const optionsLayout = createConfigurableSitesList(document, sitesConfig);
  const urlPatternInput = createUrlPatternInput(document);

  document.body.append(optionsLayout, urlPatternInput);
})();
