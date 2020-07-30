<script lang="ts">
  import UrlTemplateForm from "./components/UrlTemplateForm.svelte";
  import ConfigurableLine from "./components/ConfigurableLine.svelte";
  import { SiteConfiguration } from "../storage/config-handler";

  export let sitesConfig: SiteConfiguration[];
</script>

<div>
  {#each sitesConfig as siteConfig (siteConfig.id)}
    <ConfigurableLine {siteConfig} />
  {/each}
</div>
<UrlTemplateForm />
