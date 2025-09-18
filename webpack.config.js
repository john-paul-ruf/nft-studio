import path from 'path';
import {fileURLToPath} from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    mode: 'development',
    entry: './render.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        // More aggressive resolution options
        extensionAlias: {
            '.js': ['.js', '.jsx'],
        },
        // Try this instead of fullySpecified
        symlinks: false,
    },
    target: 'electron-renderer',
    devtool: 'source-map',
    // Add this to handle ES modules better
    experiments: {
        outputModule: false,
    },
};