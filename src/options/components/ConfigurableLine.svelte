<script lang="ts">
  import {
    SiteConfiguration,
    addNewUrlPattern,
    updateStoredConfig,
    getSiteConfiguration,
    deleteUrlPattern,
  } from "../../storage/config-handler";
  import { browser } from "webextension-polyfill-ts";
  import { dragHandleClass } from "../utils";
  export let siteConfig: SiteConfiguration;

  let deleted = false;
  let editable = false;
  let siteTitle = getSiteTitle(siteConfig);

  const dragHandleSrc = "/icons/drag_indicator-black.svg"; // from https://fonts.gstatic.com/s/i/materialicons/drag_indicator/v5/24px.svg?download=true
  function getSiteTitle(siteConfig: SiteConfiguration) {
    return (
      siteConfig.customName ||
      browser.i18n.getMessage(`site_${siteConfig.id}`) ||
      "???"
    );
  }
  async function updateTitle() {
    await updateStoredConfig(siteConfig.id, {
      customName: siteTitle,
    });
    const newConfig: SiteConfiguration = await getSiteConfiguration(
      siteConfig.id
    );
    siteConfig = newConfig;
    editable = false;
  }
  async function toggleIsEnabled() {
    await updateStoredConfig(siteConfig.id, {
      isEnabled: !siteConfig.isEnabled,
    });
    const newConfig: SiteConfiguration = await getSiteConfiguration(
      siteConfig.id
    );
    siteConfig = newConfig;
  }
  async function deleteConfig() {
    await deleteUrlPattern(siteConfig.id);
    deleted = true;
  }
  async function restoreDeletedConfig() {
    await addNewUrlPattern(
      getSiteTitle(siteConfig),
      siteConfig.customPattern!,
      siteConfig.isEnabled
    );
    // deleted = false; the restored website is added at the top of the list and the site ID changes...
    window.location.reload();
  }
</script>

<style>
  label {
    display: flex;
    padding: 1px 0 1px;
    align-items: center;
  }

  img {
    height: 100%;
    touch-action: none;
  }
  input[type="checkbox"] {
    margin-left: 0;
  }
  input[type="text"] {
    width: 100%;
    margin-right: 2px;
  }
  button.save,
  button.edit {
    margin-left: auto;
  }
  button.delete {
    margin-left: 2px;
  }
  div.deleted {
    text-align: center;
    background-color: #f0f0f0;
    border-radius: 2px;
    cursor: pointer;
    padding: 3px;
    margin: 1px 0;
  }
</style>

{#if siteConfig.customPattern || siteConfig.defaultConfiguration}
  {#if !deleted}
    <label>
      <img alt="" class={dragHandleClass} src={dragHandleSrc} />
      <input
        type="checkbox"
        name={siteConfig.id}
        checked={siteConfig.isEnabled}
        on:click={toggleIsEnabled} />
      {#if !editable}
        {getSiteTitle(siteConfig)}
        <button class="edit" on:click|preventDefault={() => (editable = true)}>
          {browser.i18n.getMessage('config_editButton')}
        </button>
      {:else}
        <input type="text" bind:value={siteTitle} />
        <button class="save" on:click={updateTitle}>
          {browser.i18n.getMessage('config_saveButton')}
        </button>
        {#if siteConfig.customPattern}
          <button class="delete" on:click={deleteConfig}>
            {browser.i18n.getMessage('config_deleteButton')}
          </button>
        {/if}
      {/if}
    </label>
  {:else}
    <div class="deleted" role="link" on:click={restoreDeletedConfig}>
      {browser.i18n.getMessage('config_linkDeleted', getSiteTitle(siteConfig))}
    </div>
  {/if}
{/if}
