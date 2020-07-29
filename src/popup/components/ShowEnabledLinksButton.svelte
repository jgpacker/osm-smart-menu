<script lang="ts">
  import { browser } from "webextension-polyfill-ts";
  import { getRelevantSites } from "../sites-manipulation-helper";
  import type { SiteLink } from "../sites-manipulation-helper";
  import { getSitesConfiguration } from "../../storage/config-handler";
  import LinkList from "./LinkList.svelte";

  let maybeEnabledLinks: SiteLink[] | undefined;

  async function getEnabledLinks(): Promise<SiteLink[]> {
    const basicData: Record<string, string> = {
      zoom: "3",
      lat: "23.00",
      lon: "24.43",
    };
    const config = await getSitesConfiguration();
    return getRelevantSites(config, undefined, basicData);
  }
</script>

<style>
  button {
    margin: 5px auto;
    display: block;
  }
  div#fix-button-margin {
    /* button is centralized with `auto`, but needs some "min-margin" in some cases */
    padding: 0 5px;
  }
</style>

{#if !maybeEnabledLinks}
  <div id="fix-button-margin">
    <button
      on:click={async () => (maybeEnabledLinks = await getEnabledLinks())}>
      {browser.i18n.getMessage('button_showEnabledLinks')}
    </button>
  </div>
{:else}
  <LinkList siteLinks={maybeEnabledLinks} />
{/if}
