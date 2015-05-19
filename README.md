# domoapps cli

## Installing
1. Make sure you have [Node](http://nodejs.org/) installed.
  * domoapps-cli is not currently compatible with Node v0.12, so choose a version greater than or equal to 0.10 and less than 0.12
2. Install/update the domo CLI via npm

```
npm install -g DomoApps/domoapps-cli
```

## Creating a Domo App Design
1. Open your terminal and login using `domo login`.
2. Navigate to the directory on your computer where you would like to keep your design files.
3. Initialize a new design by running `domo init` and providing a name for your design. This generates the following files to help you get started.
  * A boilerplate index.html file (see [example](./examples/mydesign/index.html))
  * A manifest.json file (see [example](./examples/mydesign/manifest.json))
  * Boilerplate CSS and JavaScript files
  * The [domo.js library](./templates/domo.js)
4. Edit your design and run `domo publish` when you're ready.
  * *Hint*: Run `domo publish --watch` to automatically keep your app up to date as you code.

## Adding a DomoApp to a page
Once you've published your design, you can add a DomoApp to a page in Domo:

1. Open Domo in your browser and enable the `domoapps` feature by adding `?_f=domoapps` to the end of the URL and then reloading the page.
2. Click `Add Card`, select the `DomoApp` type. 
3. Give your card a name, select the design you want, configure your data sources, then click save.

## Full Documentation

Complete documentation is available [here](https://github.com/DomoApps/docs/wiki)

## Legacy Apps

###  Migrating existing (mason) apps

If you have a legacy app from the old Mason platform, you can migrate it using the [migration steps](https://git.empdev.domo.com/Development/domoapps-cli/wiki/Migration).
