const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronNav", {
  goBack: () => ipcRenderer.send("nav-back"),
  goForward: () => ipcRenderer.send("nav-forward"),
  reload: () => ipcRenderer.send("nav-reload"),
  onNavState: (callback) => {
    ipcRenderer.on("nav-state", (_event, state) => callback(state));
  },
  onTitleUpdate: (callback) => {
    ipcRenderer.on("title-updated", (_event, title) => callback(title));
  },
});
