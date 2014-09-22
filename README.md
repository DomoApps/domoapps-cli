# domoapps cli

## Installing
1. Make sure you have the latest stable [Node](http://nodejs.org/) installed
2. Install the domo CLI via npm: `npm install -g git+ssh://git@git.empdev.domo.com:Development/domoapps-cli.git`

## Publishing a domoapp
1. Login using `domo login`.
2. Create an index.html file and a manifest.json file.
2. run `domo publish`.

## Migrating existing (mason) apps
Follow the [migration steps](./docs/migrating.md)

## Running the tests
1. Make sure jasmine-node is installed: `npm install -g jasmine-node`
2. Make sure domovm is running
3. run `jasmine-node spec`