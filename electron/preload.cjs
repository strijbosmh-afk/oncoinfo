const { contextBridge } = require("electron");

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
});
