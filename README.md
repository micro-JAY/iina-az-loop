# Alphabet Loop — IINA Multi AB Looper Plugin

Saveable, recallable A-B loop points for [IINA](https://iina.io), the modern media player for macOS.

Create multiple loop regions per video, save them for later, and jump between them instantly with keyboard shortcuts.

## Features

- **Multiple saved loops per video** — Mark A and B points, save with a custom name
- **Quick access sidebar** — View and manage all loops for the current video
- **Keyboard shortcuts** — Ctrl+1 through Ctrl+5 to instantly activate saved loops
- **Persistent storage** — Loops are remembered across sessions
- **Jump to loop start** — Optionally seek to the A point when activating a loop
- **Dark mode support** — Follows your system appearance automatically

## Installation

### From Plugin Folder

1. Download or clone this repository
2. Copy the `iina-looper.iinaplugin` folder to your IINA plugins directory:
   ```
   ~/Library/Application Support/com.colliderli.iina/plugins/
   ```
   Or for IINA Advance:
   ```
   ~/Library/Application Support/com.iina-advance/plugins/
   ```
3. Restart IINA
4. The "A-Z Loop" tab will appear in the sidebar

## Usage

### Creating a Loop

1. Open a video in IINA
2. Open the Looper sidebar tab
3. Seek to the desired start position and click **Set A**
4. Seek to the desired end position and click **Set B**
5. Optionally enter a name, then click **Save**

-or-
1. Open a video in IINA
2. Use your A-B loop hotkey to set the loop points
3 Open the abcLooper sidebar tab and name the loop.

### Activating a Saved Loop

- **Click** any saved loop in the sidebar to activate it
- **Ctrl+1** through **Ctrl+5** activate the first 5 saved loops
- The active loop is highlighted with an accent badge

### Managing Loops

- **Rename**: Hover over a loop and click "Rename", then type the new name
- **Delete**: Hover over a loop and click the × button
- **Clear**: Click the "Clear" button to remove the active A-B loop without deleting the saved entry

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 – Ctrl+5 | Activate saved loop 1–5 |
| Meta+L | Show Looper sidebar (configurable) |

Menu items are also available under the plugin's menu for Set A, Set B, Save, and Clear.

## Preferences

Open IINA → Settings → Plugins → Looper to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Jump to loop start | On | Seek to loop A point when activating |
| Max loops per video | 10 | Maximum saved loops per video (1–20) |
| Toggle sidebar key | Meta+L | Keybinding to toggle the sidebar |

## How It Works

Looper uses mpv's native `ab-loop-a` and `ab-loop-b` properties for seamless looping. Saved loops are stored in IINA's plugin preferences as JSON, keyed by video filename. The sidebar communicates with the main plugin via IINA's message passing API.

## Known Limitations

- Videos are identified by filename (not full path). Two files with the same name in different directories will share loop data.
- The Ctrl+1–5 shortcuts may conflict with other plugins or IINA keybindings. The menu items will still work if shortcuts conflict.
- Changing the sidebar keybinding in preferences requires reloading the plugin.

## Contributing

1. Fork this repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT
