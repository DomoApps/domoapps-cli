# domoapps cli

## Installing
1. Make sure you have the latest stable [Node](http://nodejs.org/) installed
2. Install the domo CLI via npm: `npm install -g git+ssh://git@git.empdev.domo.com:Development/domoapps-cli.git`

## Migrating Apps
To migrate an exiting (mason) app, find the apps unique id by visiting the app's details page. The id will be in the URL, e.g. 

## Running the tests
1. Make sure jasmine-node is installed: `npm install -g jasmine-node`
2. Make sure domovm is running
3. run `jasmine-node spec`