# Contributing

## Design principles
1. Focus on the OpenStreetMap Community
2. User autonomy
3. Inclusivity

## Initial setup
Install a recent version of Node.js and run `npm install`.

## Build
Run `npm run build`.
A file will be created in `./web-ext-artifacts/`.

## Test
Run automated tests with `npm test`.

To test manually, first compile the TypeScript code with `npm run tscompile`, and then load the folder `./addon/` in [Firefox][firefox-load] and [Chrome][chrome-load].

[firefox-load]: https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/
[chrome-load]: https://developer.chrome.com/extensions/getstarted

## Develop
The main code is at `./src/`, and it is compiled to `./addon` (where the other assets are).

Take a look at `./addon/manifest.json` to find all entrypoints.

The VS Code IDE is recommended for this repository.
