# domoapps cli

## Installing
1. Make sure you have the latest stable [Node](http://nodejs.org/) installed
2. Install the domo CLI via npm: `npm install -g git+ssh://git@git.empdev.domo.com:Development/domoapps-cli.git`

## Publishing a domoapp
1. Login using `domo login`.
2. Create an index.html file and a manifest.json file.
2. run `domo publish`.

## Migrating Apps
To migrate an exiting (mason) app: 
1. Find the app's unique id by visiting the app's details page. The id will be the last set of numbers in the URL, e.g. /page/1905765842/details/**1342622060**
2. Open your terminal and navigate to a folder where you would like to store your domoapp design.
3. In this folder create a `manifest.json` file containing the following:

```json
{
  "name": "myapp",
  "version": "0.0.1"
}
```

4. In this folder also create an `index.html` file containing whatever markup your design will use. 
This is the main entry point of the domoapp. Here you include any other assets you want your app to load, for example:

```html
<html>
  <head>
    <link rel="stylesheet" href="style.css">
  </head>
  <body>
    <h1>My App</h1>
    <script src="app.js"></script>
  </body>
</html>
```

5. Now run `domo migrate`. This will create a new design for you, upload your assets, and link the card to a new domoapp.

## Running the tests
1. Make sure jasmine-node is installed: `npm install -g jasmine-node`
2. Make sure domovm is running
3. run `jasmine-node spec`