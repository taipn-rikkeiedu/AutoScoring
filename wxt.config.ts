import { defineConfig } from 'wxt';
import { APP_INFO } from './src/core/constants';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: APP_INFO.name,
    description: APP_INFO.description,
    version: APP_INFO.version,
    permissions: [
      "activeTab",
      "storage",
      "scripting",
      "unlimitedStorage"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    icons: {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    },
    commands: {
      "_execute_action": {
        "suggested_key": {
          "default": "Ctrl+Shift+Y",
          "mac": "MacCtrl+Shift+Y"
        },
        "description": "Mở nhanh tiện ích REduX AutoScoring"
      }
    }
  }
});
