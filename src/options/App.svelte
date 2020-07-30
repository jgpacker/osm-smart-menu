<script lang="ts">
  import UrlTemplateForm from "./components/UrlTemplateForm.svelte";
  import ConfigurableLine from "./components/ConfigurableLine.svelte";
  import type { SiteConfiguration } from "../storage/config-handler";

  export let sitesConfig: SiteConfiguration[];

  let currentEditableLinkById: string | undefined;
</script>

<div>
  {#each sitesConfig as siteConfig (siteConfig.id)}
    <ConfigurableLine bind:currentEditableLinkById {siteConfig} />
  {/each}
</div>
<UrlTemplateForm />
