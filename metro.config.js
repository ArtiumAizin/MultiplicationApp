const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// הגדרת נתיב הבסיס הציבורי עבור ה-Bundler ב-Web
config.transformer.publicPath = '/MultiplicationApp/assets';

module.exports = config;