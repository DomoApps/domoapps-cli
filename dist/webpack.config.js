var webpack = require('webpack');
var path = require('path');
var packageJson = require('./package.json');
var bannerComment = [
    "domo.js v" + packageJson.version,
    'Optional utility library for Custom Apps'
].join('\n');
module.exports = {
    entry: './src/domo.ts',
    devtool: 'inline-source-map',
    plugins: [
        new webpack.BannerPlugin(bannerComment)
    ],
    module: {
        rules: [{
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'domo.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'domo',
        libraryTarget: 'umd'
    }
};
//# sourceMappingURL=webpack.config.js.map