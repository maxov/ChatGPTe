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

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ALLOWED_HOSTS = [".openai.com", ".auth0.com", ".chatgpt.com"];
const TOOLBAR_HEIGHT = 40;

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

function createWindow() {
  const win = new BaseWindow({
    width: 1200,
    height: 800,
    title: "",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 12, y: 12 },
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

  toolbarView.webContents.loadFile("toolbar.html");
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
    if (!isAllowedURL(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  webContents.on("did-create-window", (child) => {
    setupNavigation(child.webContents);

    child.webContents.on("will-navigate", (_event, url) => {
      try {
        const { hostname } = new URL(url);
        if (hostname === "chatgpt.com" || hostname.endsWith(".chatgpt.com")) {
          child.close();
        }
      } catch {}
    });
  });
}

app.whenReady().then(() => {
  session.fromPartition("persist:chatgpt").setUserAgent(CHROME_UA);

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

  const template = [
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
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createWindow(),
        },
        { role: "close" },
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
      submenu: [{ role: "minimize" }, { role: "zoom" }],
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
