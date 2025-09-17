const path = require('path');

module.exports = {
    mode: 'development', // Set mode to avoid warnings
    entry: './render.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true, // Clean dist folder before each build
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx'],
    },
    target: 'electron-renderer',
    devtool: 'source-map', // Enable source maps for debugging
};
