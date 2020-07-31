<script lang="ts">
  import { browser } from "webextension-polyfill-ts";
  import { getRelevantSites } from "../sites-manipulation-helper";
  import type { SiteLink } from "../sites-manipulation-helper";
  import { getSitesConfiguration } from "../../storage/config-handler";
  import LinkList from "./LinkList.svelte";
  import { OsmAttribute } from "../../sites-configuration";

  let enabledLinks: SiteLink[] | undefined;

  async function getEnabledLinks(): Promise<SiteLink[]> {
    const config = await getSitesConfiguration();
    const basicMapParameters = {
      zoom: "3",
      lat: "23.00",
      lon: "24.43",
    };
    const enabledMapLinks = getRelevantSites(
      config,
      undefined,
      basicMapParameters
    );
    const allBasicParameters: Record<OsmAttribute, string> = {
      ...basicMapParameters,
      nodeId: "1",
      wayId: "1",
      relationId: "1",
      changesetId: "1",
      userName: "jgpacker",
      key: "amenity",
      value: "school",
      tracesId: "1",
    };
    const allEnabledLinks: SiteLink[] = getRelevantSites(
      config,
      undefined,
      allBasicParameters
    );

    allEnabledLinks.forEach((link, linkIndex) => {
      const possibleMapLink = enabledMapLinks.find(
        (mapLink) => mapLink.id === link.id
      );
      if (possibleMapLink) {
        // prioritize the "map versions" of each link
        allEnabledLinks[linkIndex] = possibleMapLink;
      }
    });
    return allEnabledLinks;
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

{#if enabledLinks}
  <LinkList siteLinks={enabledLinks} />
{:else}
  <div id="fix-button-margin">
    <button on:click={async () => (enabledLinks = await getEnabledLinks())}>
      {browser.i18n.getMessage('button_showEnabledLinks')}
    </button>
  </div>
{/if}
