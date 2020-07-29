<style>
  #info {
    text-align: center;
    padding: 4px;
    min-width: 200px; /* Chrome adjustment */
    max-width: 600px; /* Desktop Firefox adjustment */
    white-space: pre-line;
  }

  #info {
    border-bottom: 1px solid lightgray; /* add "separator" line before other elements */
  }
  #info:only-child {
    border-bottom: none;
  }
</style>

<div id="info">
  <slot />
</div>
