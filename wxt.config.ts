import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: "REduX",
    version: "4.0.1",
    permissions: [
      "activeTab",
      "storage",
      "scripting",
      "declarativeNetRequest"
    ],
    host_permissions: [
      "<all_urls>"
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: "ruleset_1",
          enabled: true,
          path: "rules.json"
        }
      ]
    },
    icons: {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  }
});
