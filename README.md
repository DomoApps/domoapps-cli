# Ryuu CLI

A command line interface to the Domo App Framework.

[![npm version](https://img.shields.io/npm/v/ryuu.svg?style=flat-square)](https://www.npmjs.org/package/ryuu)
[![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=ryuu&query=$.install.pretty&label=install%20size&style=flat-square)](https://packagephobia.com/result?p=ryuu)
[![npm downloads](https://img.shields.io/npm/dm/ryuu.svg?style=flat-square)](https://npm-stat.com/charts.html?package=ryuu)
[![Known Vulnerabilities](https://snyk.io/test/npm/ryuu/badge.svg)](https://snyk.io/test/npm/ryuu)

## Documentation

- [CLI Documentation](https://developer.domo.com/portal/rmfbkwje8kmqj-domo-apps-cli)
- [CLI Installation](https://developer.domo.com/portal/6hlzv1hinkq19-setup-and-installation)
- [App Framework Documentation](https://developer.domo.com/portal/d54m2ohkacza0-welcome)

## Contributing

### Recommended Workflow:

1. Create new branch (named "DOMO-XXXXXX")
2. Make Changes
3. Commit Changes
4. Test changes (if necessary, version a alpha/beta/tagged version, then release it)
5. Make pull request
6. After pull request is merged to master, bump normal version, then release it to npm, brew, and chocolatey

### Building

To build the CLI, run

```bash
npm run build
```

All necessary files will be built/copied into the `dist` folder.

### Linking

In order for easier development with ryuu-proxy or ryuu-client, use linking.

1. `cd` into the folder that you cloned ryuu-proxy/ryuu-client to, ex. `cd ~/ryuu/ryuu-proxy`
2. `npm link`
3. `cd` into the folder that you cloned domoapps-cli to, ex `cd ~/ryuu/domoapps-cli`
4. `npm link @domoinc/ryuu-proxy` (this is because the package name for ryuu-proxy is @domoinc/ryuu-proxy)
   Use `npm unlink` in both locations to unlink the repositories later if needed.

### Debugging

Debugging is most easily done via the the native node extension in VSCode.

1. Run node and point it to the built domo.js (different from the ryuu.js) file in `dist/bin` after building
   ```bash
   node --inspect-brk ~/ryuu/domoapps-cli/dist/bin/domo.js [command]
   ```
2. <kbd>⌘ Command</kbd> + <kbd>⇧ Shift</kbd> + <kbd>P</kbd> to open the VSCode command palette.
3. Select `Debug: Attach to Node Process` and select the node process you just started in step 1.
4. The process should move your active window to the beginning of the CLI (generally domo.ts), and you can start debugging.

TIPS:

- Set breakpoints in the `.ts` files for domoapps-cli, and in the `.js` files for all node modules, unless you've utilized `npm link` like for ryuu-client/ryuu-proxy, in which case you can use the `.ts` files as well.
- If your breakpoint isn't being hit, try to "advance" the code to make sure the breakpoint is being set in the right file.

### Versioning

This project utilizes [standard-version](https://github.com/conventional-changelog/standard-version).

- `npm run bump` - Version bumps determined automatically via commits.
- `npm run bumpBeta` or `npm run bump -- --prerelease beta` - 4.0.x-beta.0 (if no current beta) or 4.0.0-beta.x (if current beta exists).

### Releasing

Versions should be released on NPM until confirmed stable, at which point brew and chocolatey can be released

- `npm run release`
- `npm run releaseAlpha`
- `npm run releaseBeta`
- `npm run releaseBrew`
- `npm run releaseChocolatey`

### Committing the latest Phoenix version

```bash
npm install @domoinc/domo-phoenix@latest
npm run build:phoenix
git add templates/**/domoPhoenix*.js
git commit -m "Update to the latest Phoenix version"
```
