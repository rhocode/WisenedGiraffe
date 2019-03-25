const webpackMerge = require('webpack-merge');
const commonConfig = require('./config/webpack.common.config');

module.exports = (env) => {

  const determineAddons = (addons) => {
    return [...[addons]]
      .filter(addon => Boolean(addon))
      .map(addon => require(`./config/addons/webpack.${addon}.js`));
  };

  const environment = env.env || 'dev';

  const envConfig = require(`./config/webpack.${environment}.config`);

  return webpackMerge(commonConfig, envConfig, ...determineAddons(env.addons));
};