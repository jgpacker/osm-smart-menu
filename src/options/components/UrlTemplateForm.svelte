<script lang="ts">
  import { browser } from "webextension-polyfill-ts";
  import { UrlPattern } from "../../popup/sites-manipulation-helper";
  import { addNewUrlPattern } from "../../storage/config-handler";

  const urlTemplatePlaceholder =
    "https://www.openstreetmap.org/#map={zoom}/{latitude}/{longitude}";
  const urlTemplatePattern: string = /([^{}]+\{(zoom|latitude|longitude|osm_(user_name|tag_key|tag_value|(changeset|node|way|relation)_id))\})+[^{}]*/
    .source; // must contain curly braces; but only with known parameters

  let linkName = "";
  let linkUrlTemplate = "";

  async function onFormSubmit(event: Event) {
    event.preventDefault(); // needed to ensure this async function executes completely

    const urlPattern: UrlPattern = { tag: "user-v1", url: linkUrlTemplate };
    await addNewUrlPattern(linkName, urlPattern);

    window.location.reload();
  }
</script>

<style>
  form {
    margin-top: 10px;
  }

  input {
    display: block;
    margin-bottom: 5px;
  }
</style>

<form action="#" on:submit={onFormSubmit}>
  <fieldset>
    <legend>{browser.i18n.getMessage('config_pattern_formTitle')}</legend>
    <label>
      {browser.i18n.getMessage('config_pattern_name')}
      <input type="text" required bind:value={linkName} />
    </label>
    <label>
      {browser.i18n.getMessage('config_pattern_urlTemplate')}
      <input
        type="url"
        required
        bind:value={linkUrlTemplate}
        placeholder={urlTemplatePlaceholder}
        pattern={urlTemplatePattern} />
    </label>
    <button type="submit">
      {browser.i18n.getMessage('config_pattern_createOption')}
    </button>
  </fieldset>
</form>
