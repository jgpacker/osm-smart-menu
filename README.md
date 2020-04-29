# OSM Smart Menu
A browser extension to help the OpenStreetMap community easily visualize different maps and tools (officially supported for [Firefox](https://addons.mozilla.org/pt-BR/firefox/addon/osm-smart-menu/) and [Chromium](https://chrome.google.com/webstore/detail/osm-smart-menu/icipmdhgbkejfideagkhdebiaeohfijk)).


## Building for Firefox
Run `npm install` and `npm run build:firefox`.
A file will be created in `./web-ext-artifacts/`.
(tested with Node 14.x)

## Contributing

### Adding new websites
1. Add a new entry in `lib/sites-configuration.ts`;
2. Add an entry for it's name in the english language file (`addon/_locales/en/messages.json`) and for other languages you know. The entry's message id should be `site_<NEW_ENTRY_ID>`;

### Translations
Add a file called `messages.json` in the folder `addon/_locales/xy/`, where `xy` is your languages' code.
See [Chrome's documentation](https://developer.chrome.com/webstore/i18n) for details.
Some websites' names should be left untranslated, preserving the original name.

