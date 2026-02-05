# ViewSortGo

A lightweight desktop app for viewing and sorting images into folders using keyboard shortcuts.

Built with [Wails v2](https://wails.io/) (Go + React/TypeScript).

![Screenshot](docs/screenshot.png)

## Features

- **Keyboard-driven sorting** — Assign keys to move/copy images to destination folders
- **Profiles** — Save different shortcut configurations for different workflows
- **Thumbnail strip** — Quick navigation via thumbnail previews
- **Undo** — Reverse file operations with Ctrl+Z

## Build

Requires [Go 1.21+](https://go.dev/) and [Wails CLI](https://wails.io/docs/gettingstarted/installation).

```sh
wails build
```

Development with hot reload:

```sh
wails dev
```

## License

MIT
