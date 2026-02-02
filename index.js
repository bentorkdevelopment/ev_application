/**
 * @format
 */


import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { setupBackgroundHandler } from './src/services/fcmService';

setupBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
