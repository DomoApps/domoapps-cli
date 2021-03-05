# Ryuu CLI

A command line interface to the App Dev Studio.

See the [developer docs](https://developer.domo.com) for instructions on how to install and use this tool, as well as more information about the complete App Dev Studio.

## Releasing the latest Phoenix version
```bash
npm install @domoinc/domo-phoenix@latest
npm run build:phoenix
git add templates/**/domoPhoenix*.js
git commit -m "Update to the latest Phoenix version"
```

## Releasing the CLI 
When running the `version` command you can increment the numbers as follows:

* `npm version major` - x.0.0
* `npm version minor` - 4.x.0
* `npm version patch` - 4.0.x

### Release commands
```bash
npm version patch
npm run push
npm publish
```

[npm package](https://www.npmjs.com/package/ryuu)