const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')
module.exports = defineConfig({
    transpileDependencies: true,
    lintOnSave: false,
    devServer: {
        //open: 'http://localhost:8080',
        hot: false,
        liveReload: false
    },
    configureWebpack: {
        resolve: {
            fallback: {
                "stream": require.resolve("stream-browserify"),
                "assert": require.resolve("assert"),
                "crypto": require.resolve("crypto-browserify"),
                "path": require.resolve("path-browserify"),
                "constants": require.resolve("constants-browserify"),
                "os": require.resolve("os-browserify/browser"),
            }
        },
        plugins: [
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer']
            })
        ]
    }
})