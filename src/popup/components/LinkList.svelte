<script lang="ts">
  import { SiteLink } from "../sites-manipulation-helper";
  import { browser } from "webextension-polyfill-ts";
  import { openLink } from "../utils";
  import InfoBox from "./InfoBox.svelte";

  export let siteLinks: SiteLink[];
</script>

<style>
  .site {
    padding: 4px 16px;
    display: block;
    white-space: nowrap;
    text-decoration: inherit;
    color: inherit;
  }

  .site:hover {
    background-color: rgba(51, 7, 7, 0.08);
  }

  .site:active {
    background-color: rgba(0, 0, 0, 0.1);
  }
</style>

{#each siteLinks as site}
  <a id={site.id} href={site.url} class="site" on:click|preventDefault={() => openLink(site.url)}>
    {site.customName || browser.i18n.getMessage(`site_${site.id}`) || '???'}
  </a>
{:else}
  <InfoBox>{browser.i18n.getMessage('noEnabledCompatibleLinksFound')}</InfoBox>
{/each}
