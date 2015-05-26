# domoapps cli

## Installing
1. Make sure you have the latest [NodeJS](http://nodejs.org/download) installed.
   Verify that Node is properly installed on your path by opening your terminal and typing `node --version`.
2. Upload your public SSH key to Github following [these instructions](https://help.github.com/articles/generating-ssh-keys/).
2. Install/update the domo CLI tool via npm:

```
npm install -g git+ssh://git@github.com/DomoApps/domoapps-cli
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

1. Open Domo in your browser, go to the page you want to add the app to, such as the Overview page.
2. Click `Add Card`, select the `Domo App` type. 
3. Give your card a name, select the design you want, configure your data sources, then click save.

## Full Documentation

Complete documentation is available [here](https://domoapps.herokuapp.com/)
