// 레포 루트의 shared/(트렌드 파싱·나라 목록)를 앱에서도 import 할 수 있게 감시 폴더에 추가
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../shared")];
module.exports = config;
