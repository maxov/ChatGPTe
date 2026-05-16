# ChatGPTe

A lightweight Electron wrapper for [chatgpt.com](https://chatgpt.com) with a native desktop toolbar for macOS, Windows, and Linux.

## Why?

The official ChatGPT macOS app doesn't expose the full web feature set — notably, you can't select reasoning effort (like "heavy thinking") or use extended thinking with the Pro plan. This wrapper loads the full web interface so all features are available, while still feeling like a native desktop app.

## Features

- Custom toolbar with back, forward, and reload buttons
- Dynamic window title showing the current chat name
- Keyboard shortcuts for navigation (Cmd/Ctrl+[, Cmd/Ctrl+])
- External links open in your default browser
- Persistent login sessions
- Multi-window support (Cmd/Ctrl+N)

## Setup

```
pnpm install
```

## Development

```
pnpm start
```

## Build

```
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

Release builds are written to `dist/`:

- macOS: `.dmg`
- Windows: installer `.exe` and `.zip`
- Linux: `.AppImage` and `.tar.gz`

## Install Locally on macOS

```
pnpm install-app
```

This copies the macOS `.app` bundle to `~/Applications/`.
