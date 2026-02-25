# A-Z Loop — IINA Multi A-B Looper Plugin

Saveable, recallable A-B loop points for [IINA](https://iina.io), the modern media player for macOS.

Create multiple loop regions per video, save them for later, and jump between them instantly with keyboard shortcuts.

## Features

- **10 loop slots per video** — Quick-assign via Ctrl+1 through Ctrl+9 and Ctrl+0
- **3-press slot system** — Press once to set A, again to set B & save, again to activate
- **Quick access sidebar** — View and manage all loops for the current video
- **Persistent storage** — Loops are remembered across sessions
- **Jump to loop start** — Optionally seek to the A point when activating a loop
- **Dark mode support** — Follows your system appearance automatically

## Installation

### From Release (.iinaplgz)

1. Download the latest `.iinaplgz` from [Releases](https://github.com/micro-JAY/iina-az-loop/releases)
2. Double-click the file to install, or drag it onto IINA

### From Plugin Folder

1. Clone this repository
2. Copy the entire repo folder (renamed to `az-loop.iinaplugin`) to your IINA plugins directory:
   ```
   ~/Library/Application Support/com.colliderli.iina/plugins/az-loop.iinaplugin/
   ```
   Or for IINA Advance:
   ```
   ~/Library/Application Support/com.iina-advance/plugins/az-loop.iinaplugin/
   ```
3. Restart IINA
4. The "A-Z Loop" tab will appear in the sidebar

## Usage

### Quick Slot Workflow (3-Press System)

1. Open a video in IINA
2. Seek to the desired start position and press **Ctrl+1**
   → Sets the A point for slot 1 (OSD shows "A set — press again for B")
3. Seek to the desired end position and press **Ctrl+1** again
   → Sets the B point, saves the loop, and activates it immediately
4. Press **Ctrl+1** any time after to jump back to this loop

Slots must be filled sequentially — you can't create slot 3 before slot 2 exists.

### Sidebar Workflow

1. Open the A-Z Loop sidebar tab
2. Click **Set A** at the desired start position
3. Click **Set B** at the desired end position
4. Optionally enter a name, then click **Save**

### Activating a Saved Loop

- **Click** any saved loop in the sidebar to activate it
- **Ctrl+1** through **Ctrl+9** and **Ctrl+0** activate slots 1–10
- The active loop is highlighted with an accent badge

### Managing Loops

- **Rename**: Hover over a loop and click "Rename", then type the new name
- **Delete**: Hover over a loop and click the × button
- **Clear**: Click the "Clear" button to remove the active A-B loop without deleting the saved entry

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 – Ctrl+9 | Loop slot 1–9 (3-press: set A → set B → activate) |
| Ctrl+0 | Loop slot 10 (3-press: set A → set B → activate) |
| Meta+L | Show A-Z Loop sidebar (configurable) |

Menu items are also available under the plugin's menu for Set A, Set B, Save, and Clear.

## Preferences

Open IINA → Settings → Plugins → A-Z Loop to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Jump to loop start | On | Seek to loop A point when activating |
| Active loop slots | 5 | Number of active slots per video (1–10) |
| Toggle sidebar key | Meta+L | Keybinding to toggle the sidebar |

Only slots within the active count respond to Ctrl+N hotkeys. For example, with the default of 5, only Ctrl+1 through Ctrl+5 are active.

## How It Works

A-Z Loop uses mpv's native `ab-loop-a` and `ab-loop-b` properties for seamless looping. Saved loops are stored in IINA's plugin preferences as JSON, keyed by video filename. The sidebar communicates with the main plugin via IINA's message passing API.

The 3-press slot system tracks a `pendingSlot` state: the first hotkey press records the current playback position as point A; the second press on the same slot captures point B, saves the loop, and activates it; subsequent presses simply activate the saved loop.

## Known Limitations

- Videos are identified by filename (not full path). Two files with the same name in different directories will share loop data.
- The Ctrl+1–0 shortcuts may conflict with other plugins or IINA keybindings. The menu items will still work if shortcuts conflict.
- Changing the sidebar keybinding in preferences requires reloading the plugin.

## Contributing

1. Fork this repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT
