<script lang="ts">
  import { browser } from "webextension-polyfill-ts";
  import { KnownError, openLink } from "../utils";
  import InfoBox from "./InfoBox.svelte";

  export let error: KnownError;

  const linkPlaceholder = "__LINK__";
  const text = browser.i18n.getMessage(`error_${error}`, linkPlaceholder);
  const linkText = "jgpacker/osm-smart-menu";
  const [firstPart, lastPart] = text.split(linkPlaceholder);
  const errorMessage = {
    firstPart,
    linkText,
    linkHref: `https://github.com/${linkText}/blob/master/README.md#osm-smart-menu`,
    lastPart,
  };
</script>

<InfoBox>
  {errorMessage.firstPart}
  <a href={errorMessage.linkHref} on:click|preventDefault={() => openLink(errorMessage.linkHref)}>
    {errorMessage.linkText}
  </a>
  {errorMessage.lastPart}
</InfoBox>
