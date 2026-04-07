# ChatGPT for Mac

A lightweight Electron wrapper for [chatgpt.com](https://chatgpt.com) with a native macOS toolbar.

## Features

- Custom toolbar with back, forward, and reload buttons
- Dynamic window title showing the current chat name
- Keyboard shortcuts for navigation (Cmd+[, Cmd+])
- External links open in your default browser
- Persistent login sessions
- Multi-window support (Cmd+N)

## Setup

```
pnpm install
```

## Development

```
pnpm start
```

## Build & Install

```
pnpm dist
pnpm install-app
```

This builds a macOS `.app` bundle and copies it to `~/Applications/`.
