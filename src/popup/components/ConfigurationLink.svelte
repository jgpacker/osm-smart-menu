<script>
  import { browser } from "webextension-polyfill-ts";
</script>

<style>
  span {
    text-transform: lowercase;
    text-align: var(--i18n-align);
    display: block;
    cursor: pointer;
    font-size: smaller;
    background-color: #f0f0f0;
  }
</style>

<span
  role="link"
  style="--i18n-align:{browser.i18n.getMessage('@@bidi_end_edge')}"
  on:click={() => browser.runtime.openOptionsPage()}>
  {browser.i18n.getMessage('configurationLink')}
</span>
