import {
  getSitesConfiguration,
  SiteConfiguration,
} from "../storage/config-handler";
import { setupDragAndDrop } from "./utils";
// @ts-expect-error
import App from "./App.svelte";

getSitesConfiguration().then((sitesConfig: SiteConfiguration[]) => {
  new App({
    target: document.body,
    props: {
      sitesConfig,
    },
  });

  setupDragAndDrop(document);
});
