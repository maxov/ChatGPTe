# ChatGPTe

A lightweight Electron wrapper for [chatgpt.com](https://chatgpt.com) with a native macOS toolbar.

## Why?

The official ChatGPT macOS app doesn't expose the full web feature set — notably, you can't select reasoning effort (like "heavy thinking") or use extended thinking with the Pro plan. This wrapper loads the full web interface so all features are available, while still feeling like a native Mac app.

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
