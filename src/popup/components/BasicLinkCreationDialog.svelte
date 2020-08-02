<script lang="ts">
  import { CustomUserOption } from "../utils";
  import { addNewUrlPattern } from "../../storage/config-handler";
  import { browser } from "webextension-polyfill-ts";
  import InfoBox from "./InfoBox.svelte";

  export let customUserOption: CustomUserOption | undefined;

  let optionCreated: boolean = false;

  async function buttonClick() {
    if (customUserOption) {
      await addNewUrlPattern(customUserOption.defaultName, customUserOption.urlPattern);
      optionCreated = true;
    }
  }
</script>

<style>
  button {
    display: block;
    margin: 4px auto;
  }
</style>

{#if customUserOption}
  <InfoBox>
    {#if !optionCreated}
      {browser.i18n.getMessage('newOptionDetected_notice')}
      <button on:click={buttonClick}>
        {browser.i18n.getMessage('newOptionDetected_buttonText')}
      </button>
    {:else}{browser.i18n.getMessage('newOptionDetected_added', customUserOption && customUserOption.defaultName)}{/if}
  </InfoBox>
{/if}
