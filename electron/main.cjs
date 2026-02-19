const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");

// Keep a global reference to prevent garbage collection
let mainWindow = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "OncoInfo - Medicijnbibliotheek",
    icon: path.join(__dirname, "..", "public", "pwa-icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: "#f5f0f7",
    autoHideMenuBar: false,
  });

  // Show window when ready to avoid white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL("http://localhost:8080");
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Handle navigation to external URLs
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const appUrl = isDev ? "http://localhost:8080" : "file://";
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { role: "quit", label: "Exit OncoInfo" },
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
      label: "Help",
      submenu: [
        {
          label: "About OncoInfo",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About OncoInfo",
              message: "OncoInfo - Medicijnbibliotheek",
              detail: `Version ${app.getVersion()}\n\nOncology drug information library for healthcare professionals.\n\n© DRMSoftware`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMenu();
    createWindow();
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
