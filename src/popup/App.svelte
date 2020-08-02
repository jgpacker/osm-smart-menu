<script lang="ts">
  import type { EventualSitesOrError } from "./main";
  import { browser } from "webextension-polyfill-ts";
  import { KnownError } from "./utils";
  import ConfigurationLink from "./components/ConfigurationLink.svelte";
  import InfoBox from "./components/InfoBox.svelte";
  import BasicLinkCreationDialog from "./components/BasicLinkCreationDialog.svelte";
  import LinkList from "./components/LinkList.svelte";
  import ErrorMessage from "./components/ErrorMessage.svelte";
  import ShowEnabledLinksButton from "./components/ShowEnabledLinksButton.svelte";

  export let eventualSitesOrError: EventualSitesOrError;
</script>

<style>
  .loading::first-line {
    font-weight: bold;
  }
</style>

<ConfigurationLink />
<div>
  {#await eventualSitesOrError}
    <InfoBox>
      <div class="loading">{browser.i18n.getMessage('loading')}</div>
    </InfoBox>
  {:then sitesListOrError}
    {#if 'sitesList' in sitesListOrError}
      <BasicLinkCreationDialog
        customUserOption={sitesListOrError.customUserOption} />
      <LinkList siteLinks={sitesListOrError.sitesList} />
      <ShowEnabledLinksButton
        config={sitesListOrError.config}
        currentSiteId={sitesListOrError.currentSiteId}
        currentlyShownLinks={sitesListOrError.sitesList}
        extractedParameters={sitesListOrError.extractedParameters} />
    {:else}
      <ErrorMessage error={sitesListOrError.error} />
      {#if sitesListOrError.error === KnownError.INCOMPATIBLE_WEBSITE || sitesListOrError.error === KnownError.NO_INFORMATION_EXTRACTED}
        <ShowEnabledLinksButton config={sitesListOrError.config} />
      {/if}
    {/if}
  {/await}
</div>
