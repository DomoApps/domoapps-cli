import * as Configstore from "configstore";

const pkg = require("../package.json");

export const configstore = new Configstore(pkg.name);