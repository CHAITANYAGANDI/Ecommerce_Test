const path = require('path');

/**
 * craco config — explicitly injects Tailwind + Autoprefixer into webpack's
 * postcss-loader. The shorter `style.postcss.plugins` form is silently
 * ignored in some craco 7.x setups; loaderOptions.postcssOptions is the
 * canonical way to be sure the plugins actually get loaded.
 */
module.exports = {
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: {
        postcssOptions: {
          ident: 'postcss',
          config: false,
          plugins: [
            require('tailwindcss')({
              config: path.resolve(__dirname, 'tailwind.config.js'),
            }),
            require('autoprefixer'),
          ],
        },
      },
    },
  },
};
