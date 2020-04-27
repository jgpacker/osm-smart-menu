# OSM Smart Menu
OpenStreetMap helper extension compatible with the [Firefox](https://addons.mozilla.org/pt-BR/firefox/addon/osm-smart-menu/), [Chromium](https://chrome.google.com/webstore/detail/osm-smart-menu/icipmdhgbkejfideagkhdebiaeohfijk?authuser=2) and Opera browsers.


## Building for Firefox
Run `npm install` and `npm run build:firefox`.
A file will be created in `./web-ext-artifacts/`.
(tested with Node 14.x)

## Contributing

### Translations
Add a file called `messages.json` in the folder `addon/_locales/xy`, where xy is your languages' code.
You just need to translate the sentences that are different from the default values (in this case, values from the english translation).
Feel free to create regional translations adding the country code after the language code.
See [Chrome's documentation](https://developer.chrome.com/webstore/i18n) for details.

### Adding new websites
1. Add an entry in `lib/sites-configuration.ts`;
2. Add an entry for it's name translation in the default i18n file (`addon/_locales/en/messages.json`) and for other languages you know;

I reserve the right of refusing to add a website to the extension for any reason.
In the future, I plan to find a way to allow the users to add their own websites.
