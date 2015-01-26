# domoapps cli

## Installing
1. Make sure you have the latest stable [Node](http://nodejs.org/) installed
2. Install/update the domo CLI via npm
```
npm install -g git+ssh://git@git.empdev.domo.com:Development/domoapps-cli.git
```

## Publishing a domoapp design
1. Open your terminal and login using `domo login`.
2. Navigate to the directory on your computer where you would like to keep your design files.
3. Initialize a new design by running `domo init` and providing a name for your design. This generates the following files to help you get started.
  * A basic index.html file (see [example](./examples/mydesign/index.html))
  * A manifest.json file (see [example](./examples/mydesign/manifest.json))
  * Basic CSS and JavaScript files
  * The [domo.js library](./templates/domo.js)
4. Edit your design and run `domo publish` when you're ready.

## Adding a DomoApp to a page
Once you've published your design, you can add a DomoApp to a page in Domo:

1. Navigate to a page in Domo, with the `domoapps` feature switch enabled.
2. Click `Add Card`, select the `DomoApps` type. 
3. Give your card a name and select the design you want then click save.

## Migrating existing (mason) apps
Follow the [migration steps](https://git.empdev.domo.com/Development/domoapps-cli/wiki/Migration)

## Full Documentation

Complete documentation is available [here](https://git.empdev.domo.com/Development/domoapps-cli/wiki)
