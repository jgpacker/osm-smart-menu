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
      <span class="loading">{browser.i18n.getMessage('loading')}</span>
    </InfoBox>
  {:then sitesListOrError}
    {#if typeof sitesListOrError === 'object'}
      <BasicLinkCreationDialog
        customUserOption={sitesListOrError.customUserOption} />
      <LinkList siteLinks={sitesListOrError.sitesList} />
    {:else}
      <ErrorMessage error={sitesListOrError} />
      {#if sitesListOrError === KnownError.INCOMPATIBLE_WEBSITE || sitesListOrError === KnownError.NO_INFORMATION_EXTRACTED}
        <ShowEnabledLinksButton />
      {/if}
    {/if}
  {/await}
</div>
