const {
  app,
  session,
  BaseWindow,
  WebContentsView,
  Menu,
  ipcMain,
  shell,
} = require("electron");
const path = require("path");

const APP_NAME = "ChatGPTe";
const CHROME_VERSION = "131.0.0.0";
const ALLOWED_HOSTS = [".openai.com", ".auth0.com", ".chatgpt.com", ".chat.com"];
const TOOLBAR_HEIGHT = 40;

app.setName(APP_NAME);

function getUserAgentPlatform() {
  switch (process.platform) {
    case "win32":
      return "Windows NT 10.0; Win64; x64";
    case "linux":
      return "X11; Linux x86_64";
    default:
      return "Macintosh; Intel Mac OS X 10_15_7";
  }
}

function getChromeUserAgent() {
  return `Mozilla/5.0 (${getUserAgentPlatform()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_VERSION} Safari/537.36`;
}

function isAllowedURL(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(
      (h) => hostname === h.slice(1) || hostname.endsWith(h)
    );
  } catch {
    return false;
  }
}

function isTransientPopupURL(url) {
  return !url || url === "about:blank";
}

function createWindow() {
  const isMac = process.platform === "darwin";
  const win = new BaseWindow({
    width: 1200,
    height: 800,
    title: APP_NAME,
    ...(isMac
      ? {
          titleBarStyle: "hidden",
          trafficLightPosition: { x: 12, y: 12 },
        }
      : {}),
    backgroundColor: "#f7f7f8",
  });

  const toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload-toolbar.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const chatView = new WebContentsView({
    webPreferences: {
      partition: "persist:chatgpt",
    },
  });

  win.contentView.addChildView(toolbarView);
  win.contentView.addChildView(chatView);

  function layoutViews() {
    const { width, height } = win.getContentBounds();
    const edge = 3;
    toolbarView.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT });
    chatView.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width,
      height: height - TOOLBAR_HEIGHT - edge,
    });
  }

  layoutViews();
  win.on("resize", layoutViews);

  toolbarView.webContents.loadFile("toolbar.html", {
    query: { platform: process.platform },
  });
  chatView.webContents.loadURL("https://chatgpt.com");

  // Send navigation state updates to toolbar
  function updateNavState() {
    toolbarView.webContents.send("nav-state", {
      canGoBack: chatView.webContents.canGoBack(),
      canGoForward: chatView.webContents.canGoForward(),
    });
  }

  chatView.webContents.on("did-navigate", updateNavState);
  chatView.webContents.on("did-navigate-in-page", updateNavState);

  // Forward page title changes to toolbar
  chatView.webContents.on("page-title-updated", (_event, title) => {
    toolbarView.webContents.send("title-updated", title);
  });

  setupNavigation(chatView.webContents);

  // Store references for IPC and menu access
  win._chatView = chatView;
  win._toolbarView = toolbarView;
}

function setupNavigation(webContents) {
  webContents.on("will-navigate", (event, url) => {
    if (!isAllowedURL(url)) {
      event.preventDefault();
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedURL(url) && !isTransientPopupURL(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  webContents.on("did-create-window", (child) => {
    setupNavigation(child.webContents);
  });
}

app.whenReady().then(() => {
  session.fromPartition("persist:chatgpt").setUserAgent(getChromeUserAgent());

  // IPC handlers for toolbar navigation buttons
  ipcMain.on("nav-back", (event) => {
    for (const win of BaseWindow.getAllWindows()) {
      if (win._toolbarView?.webContents === event.sender) {
        win._chatView.webContents.goBack();
        break;
      }
    }
  });

  ipcMain.on("nav-forward", (event) => {
    for (const win of BaseWindow.getAllWindows()) {
      if (win._toolbarView?.webContents === event.sender) {
        win._chatView.webContents.goForward();
        break;
      }
    }
  });

  ipcMain.on("nav-reload", (event) => {
    for (const win of BaseWindow.getAllWindows()) {
      if (win._toolbarView?.webContents === event.sender) {
        win._chatView.webContents.reload();
        break;
      }
    }
  });

  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createWindow(),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "Navigate",
      submenu: [
        {
          label: "Back",
          accelerator: "CmdOrCtrl+[",
          click: (_, win) => {
            if (win?._chatView) win._chatView.webContents.goBack();
          },
        },
        {
          label: "Forward",
          accelerator: "CmdOrCtrl+]",
          click: (_, win) => {
            if (win?._chatView) win._chatView.webContents.goForward();
          },
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: isMac
        ? [{ role: "minimize" }, { role: "zoom" }]
        : [{ role: "minimize" }, { role: "close" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();

  app.on("activate", () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
