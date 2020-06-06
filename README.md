# OSM Smart Menu
A browser extension to help the OpenStreetMap community easily access different maps and tools to analyze OSM data.

It's officially supported for [Google Chrome](https://chrome.google.com/webstore/detail/osm-smart-menu/icipmdhgbkejfideagkhdebiaeohfijk) and Mozilla Firefox (for [Desktop](https://addons.mozilla.org/firefox/addon/osm-smart-menu/) and [Android](https://addons.mozilla.org/android/addon/osm-smart-menu/)).


## Contributing

### Report bugs or request features
You can [open a new issue](https://github.com/jgpacker/osm-smart-menu/issues/new)  in Github or [send a message](https://www.openstreetmap.org/message/new/jgpacker) to the author's OpenStreetMap account.

### Add new websites
1. Add a new entry in `src/sites-configuration.ts`;
2. Add an entry for it's name in the english language file (`addon/_locales/en/messages.json`) and for other languages you know. The entry's message id should be `site_<NEW_ENTRY_ID>`;

### Translations
Add a file called `messages.json` in the folder `addon/_locales/<LANGUAGE_CODE>/`.
See [Chrome's documentation](https://developer.chrome.com/extensions/i18n#overview-locales) for more details.

Some websites' names should be left untranslated, preserving the original name.

After that's done, you can also translate `addon/_locales/en/long_description.html`. This file's content is used in extension websites.


## Building
Run `npm install` and `npm run build`.
A file will be created in `./web-ext-artifacts/`.
(tested with Node 14.x)
