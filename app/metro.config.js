const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// The lock/unlock sounds are Ogg Vorbis, which Android plays natively.
config.resolver.assetExts.push('ogg');

module.exports = config;
