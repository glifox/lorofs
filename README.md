
# LoroFS

_LoroFS_ is a file system for the web built using [Loro](https://github.com/loro-dev), designed to be local-first and support collaborative editing. It focuses on managing the file structure and metadata, while giving the user full control over the actual file content. This approach prevents the main LoroDoc from becoming excessively large and slow.

_LoroFS_ also provides an integrated file explorer component to efficiently interact with and visualize the file system in the **DOM**.

## Installation

```bash
npm install @glifox/lorofs
```

## Usage

### LoroFS Core

The `LoroFS` class manages the file system's structure and metadata using a `LoroDoc` internally.

```ts
import { LoroDoc, LoroFS } from "@glifox/lorofs";

// A callback function to handle saving/deleting LoroDoc instances (file contents & main FS doc)
const mySaveCallback = (key: string, doc: LoroDoc, options?: { delete?: boolean }) => {
    if (options?.delete) {
        console.log(`Permanently deleting content for file UUID: ${key}`);
        // Implement actual deletion of the LoroDoc content (e.g., from IndexedDB, cloud storage)
    } else {
        console.log(`Saving document "${key}". Current state:`, doc.exportFromLatest());
        // Implement actual persistence of the LoroDoc (e.g., to IndexedDB, cloud storage)
    }
};

// 1. Create a new LoroFS instance
const fs = LoroFS.new("my-project", mySaveCallback);

// 2. Or, load an existing LoroFS instance from a snapshot
// const snapshot: Uint8Array = /* ... load from storage ... */;
// const fs = LoroFS.load(snapshot, mySaveCallback);

// Create a directory
const srcId = fs.createDirectory("src");
console.log(`Created 'src' directory with ID: ${srcId}`);

// Create a subdirectory inside 'src'
const iconsId = fs.createDirectory("icons", srcId);
console.log(`Created 'icons' subdirectory with ID: ${iconsId}`);

// Create a file
const { nodeId: readmeId, fileUuid: readmeContentId } = fs.createFile("README.md", "text/markdown");
console.log(`Created 'README.md' file with node ID: ${readmeId} and content UUID: ${readmeContentId}`);

// Rename a node
fs.renameNode(readmeId, "README-v2.md");

// Move a file/directory
fs.moveNode(readmeId, iconsId); // Move README-v2.md into the 'icons' directory

// Move a node to trash
fs.moveToTrash(readmeId);

// Permanently delete a node and its children
// This returns the UUIDs of all file contents that need to be deleted by the host system.
const deletedFileUuids = fs.deleteNodePermanently(readmeId);
deletedFileUuids.forEach(uuid => console.log(`Notified to delete file content with UUID: ${uuid}`));


// Export the current state of the file system
const snapshot = fs.exportSnapshot();
// mySaveCallback("my-project", fs.getLoroDoc()); // The main FS document is also saved via the callback
```

**`onSave` Callback:** The `onSave` callback is crucial for integrating `LoroFS` with your persistence layer. It's invoked for:
*   The main file system `LoroDoc` whenever the structure changes.
*   New file content `LoroDoc` instances when `createFile` is called.
*   Notifying your system to permanently delete file content `LoroDoc` instances when `deleteNodePermanently` is used (indicated by `options.delete = true`).

### Internal Explorer

The `Explorer` component allows you to render and interact with the `LoroFS` structure in the DOM. It listens to Loro events from the `LoroFS` instance to provide reactive UI updates with a clear separation of concerns:

*   **Explorer**: Handles business logic and coordinates between `LoroFS` and `Renderer`.
*   **Renderer**: Manages all DOM manipulation and visual updates.
*   **Event System**: Modular event handling with separate mouse and keyboard event types.

```ts
import { Explorer, LoroFS, LoroTreeNode } from "@glifox/lorofs";
import { defaultListeners } from "@glifox/lorofs/events/listeners";
import { IconProvider } from "@glifox/lorofs/icons/loader";

const fs = LoroFS.new("Example", /* mySaveCallback defined above */);
const el = document.getElementById("explorer")!;

// Optional: Custom Icon Provider
// const iconConfig = { themes: [...] }; // Your icon theme data (e.g., from VSCode/Zed icon packs)
// const customIconProvider = IconProvider.new(iconConfig, "vs-seti");

const explorer = new Explorer(fs, el, {
  listeners: defaultListeners(), // Provides core file explorer functionality
  // iconProvider: customIconProvider, // Uncomment to use a custom icon provider
  onOpenFile: (node: LoroTreeNode) => {
    console.log(`Opening file: ${node.data.get("name")}, Content UUID: ${node.data.get("uuid")}`);
    // Implement file opening logic here (e.g., load LoroDoc content using node.data.get("uuid"))
  }
});

// To stop the explorer and clean up listeners/DOM
// explorer.stop();
```

#### Interactive File/Directory Creation and Renaming

The explorer includes interactive methods for creating and renaming items, providing a smooth user experience:

*   **Placeholder Input:** An input field appears directly in the tree for naming.
*   **Reactive Icons:** File icons update automatically based on the entered name's extension.
*   **Keyboard Controls:** `Enter` to confirm, `Escape` to cancel. Auto-confirm on blur (if a name is provided).
*   **Automatic File Type Detection:** MIME type inferred from file extension.
*   **Validation:** Basic name validation with user-friendly error messages.

```ts
// Create new file in root directory (or specify a parent HTML element)
explorer.createNewFile();

// Create new directory in root directory
explorer.createNewDirectory();

// Assuming `dirElement` is an HTMLElement representing a directory in the explorer
// explorer.createNewFile(dirElement);
// explorer.createNewDirectory(dirElement);

// Assuming `elementToRename` is an HTMLElement representing a file or directory
// explorer.startRename(elementToRename);
```

#### File Operations & Navigation

The explorer supports comprehensive keyboard navigation and shortcuts, alongside mouse interactions:

**Keyboard Shortcuts:**

*   **Creation:**
    *   `Shift+F`: Create new file at the current target or root.
    *   `Shift+D`: Create new directory at the current target or root.
*   **Manipulation:**
    *   `F2`: Rename selected item.
    *   `Delete` / `Backspace`: Move selected item to trash.
    *   `Shift+Delete`: Permanently delete selected item (with confirmation).
*   **Navigation:**
    *   `Enter`: Open file, or toggle (expand/collapse) directory.
    *   `ArrowRight`: Open directory.
    *   `ArrowLeft`: Close current directory, or move focus to parent directory.
    *   `ArrowDown`: Focus next visible item.
    *   `ArrowUp`: Focus previous visible item.

**Mouse Interactions:**

*   **Click:** Open file or toggle directory expansion.
*   **Drag & Drop:** Move files/directories between folders.
*   **Right-Click (Context Menu):** Access contextual actions like "New File", "New Folder", "Rename". The context menu is extensible via `ContextMenuOptions`.

#### Event System Architecture

The event system is modular and extensible. You can provide your own listeners or augment the `defaultListeners`:

```ts
import { defaultListeners } from "@glifox/lorofs/events/listeners";
import { click, dragstart, drop } from "@glifox/lorofs/events/types/mouse";
import { keydown } from "@glifox/lorofs/events/types/keyboard";
import { defaultMenuItems, ContextMenuOptions } from "@glifox/lorofs/events/types/contextmenu";

// Example of custom context menu options
const customContextMenuOptions: ContextMenuOptions = {
    menuItems: [
        ...defaultMenuItems(), // Include default items
        {
            text: 'Custom Action',
            onclick: (explorer, target) => {
                console.log('Custom action for:', target?.dataset.name);
            }
        }
    ]
};

// Example of custom listener setup
const customListeners = [
  { name: "click", callback: click },
  { name: "keydown", callback: keydown },
  { name: "contextmenu", callback: (e, explorer) => { 
      contextmenu(e, explorer, customContextMenuOptions); 
  }}
  // Add more custom listeners or override existing ones
];

const explorer = new Explorer(fs, el, {
  listeners: customListeners
});
```

### Custom Icons

The system supports custom icon providers for an enhanced visual experience:

```ts
import { IconProvider } from "@glifox/lorofs/icons/loader";
import { defaultListeners } from "@glifox/lorofs/events/listeners";

// Load your icon theme configuration (e.g., from a JSON file)
// This structure is inspired by VSCode/Zed icon packs.
const myIconConfig = {
  themes: [
    {
      name: "vs-seti",
      appearance: "dark", // or 'light'
      directory_icons: {
        collapsed: "/path/to/icons/folder.svg",
        expanded: "/path/to/icons/folder-open.svg"
      },
      file_stems: {
        "package.json": "/path/to/icons/json.svg",
        "webpack.config": "/path/to/icons/webpack.svg"
      },
      file_suffixes: {
        ".js": "/path/to/icons/javascript.svg",
        ".ts": "/path/to/icons/typescript.svg",
        ".css": "/path/to/icons/css.svg",
        ".html": "/path/to/icons/html.svg"
      },
      file_icons: {
        "text": { path: "/path/to/icons/file.svg" },
        "javascript": { path: "/path/to/icons/javascript.svg" },
        // ... more specific icons
      }
    }
  ]
};

// Create an IconProvider instance for your chosen theme
const customIconProvider = IconProvider.new(myIconConfig, "vs-seti");

const explorer = new Explorer(fs, el, {
  iconProvider: customIconProvider,
  listeners: defaultListeners()
});
```
If no `iconProvider` is specified, `LoroFS` defaults to simple icons from [Lucide](https://lucide.dev/).

## Architecture Overview

**Separation of Concerns:**
*   **`LoroFS`**: Core file system operations and data management using `loro-crdt`.
*   **`Explorer`**: Business logic coordinator, handles user interactions and dispatches commands.
*   **`Renderer`**: Pure DOM manipulation, responsible for visual updates and interactive elements like placeholders.
*   **Event System**: Modular event handling separated by type (mouse, keyboard, context menu).

**Key Benefits:**
*   Clean separation between data layer and presentation.
*   Extensible event and icon systems.
*   Type-safe operations.
*   Reactive UI updates through Loro's event system.
*   Consistent keyboard and mouse interaction patterns.

## Summary of Features

*   **File System Operations:**
    *   Create Directories and Files (with automatic file type detection).
    *   Rename files and directories.
    *   Move files and directories (including drag & drop).
    *   Move to Trash functionality.
    *   Permanent deletion (returns UUIDs of file contents for host system cleanup).
    *   Snapshot export and load (Loro implementation).
*   **User Interface (Explorer):**
    *   Interactive file/directory creation and renaming (with placeholders, reactive icons, validation).
    *   Comprehensive Keyboard shortcuts and navigation (`Shift+F/D`, `F2`, `Delete`, `Arrows`, `Enter`).
    *   Mouse interaction (click to open/toggle, drag & drop to move).
    *   Customizable Right-click Context Menu.
    *   Support for custom icon providers, including theme-based icons (inspired by [Zed](https://zed.dev/extensions) icon packs).
    *   Simple default icons using [Lucide](https://lucide.dev/).
    *   Extensible event listener system.
*   **Persistence Strategy:**
    *   `onSave` callback for the host application to persist the main FS `LoroDoc` and individual file content `LoroDoc` instances.

See the [sample](./sample/index.ts) for complete implementation example.
