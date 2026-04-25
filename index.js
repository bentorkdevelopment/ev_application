/**
 * @format
 */


import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { setupBackgroundHandler } from './src/services/fcmService';
import { setCustomText } from './src/utils/typography';

// Apply global font settings
setCustomText();

setupBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
