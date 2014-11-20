# domoapps cli

## Installing
1. Make sure you have the latest stable [Node](http://nodejs.org/) installed
2. Install/update the domo CLI via npm: `npm install -g git+ssh://git@git.empdev.domo.com:Development/domoapps-cli.git`

## Publishing a domoapp design
1. Open your terminal and login using `domo login`.
2. Navigate to the directory on your computer where you want to keep your design files.
3. Initialize a new design by running `domo init` and providing a name for your design. This generates a basic index.html file (see [example](./docs/examples/mydesign/index.html)) and a manifest.json file (see [example](./docs/examples/mydesign/manifest.json)).
4. Edit your design and run `domo publish` when you're ready.

## Creating new domoapps
This feature is not yet enabled.

## Migrating existing (mason) apps
Follow the [migration steps](./docs/migrating.md)

## Documentation

Complete documentation is available [here](https://git.empdev.domo.com/Development/domoapps-cli/wiki/Index)
