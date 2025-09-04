import { LoroFS } from "../src/LoroFS";
import { Explorer } from "../src/explorer/explorer";
import { IconProvider } from "../src/icons/loader";
import { defaultListeners } from "../src/events/listeners";
import catppuccinIcons from "./icons/catppuccin.json";
import { HtmlUtils } from "../src/explorer/utils";
import { actions } from "../src/events/actions";
import { UndoManager } from "loro-crdt";
import { defaultMenuItems } from "../src/events/types/contextmenu";
import { defaultKeymap } from "../src/events/types/keyboard";
import { KeymapConfig } from "../src/events/keybind";

const doc = LoroFS.new("Example", () => { }); 
const el = document.getElementById("explorer")

const undoManager = new UndoManager(doc.getMainDoc(), { mergeInterval: 1 });

const contextmenu = {
  menuItems: defaultMenuItems(
    "divider",
    { text: "undo", onclick: () => undoManager.undo() },
    { text: "redo", onclick: () => undoManager.redo() }
  )
};

const keybindings: KeymapConfig = {
  ...defaultKeymap,
  "ctrl-z": { action: "Undo", params: [() => undoManager.undo()] },
  "ctrl-y": { action: "Redo", params: [() => undoManager.redo()] },
}

const explorer = new Explorer(doc, el!, { 
  iconProvider: IconProvider.new(catppuccinIcons as any, "Catppuccin Mocha"),
  listeners: defaultListeners({ contextMenuOptions: contextmenu, keybindings }),
  onOpenFile: (node) => { alert(`Opened file: ${node.data.get("name")}`) }
})

setTimeout(() => {
  doc.createDirectory("Other directory")
  const git = doc.createDirectory(".github")
  doc.createFile("oldfile.md", "text/plain", git)
  const el = doc.createFile("package.json")
  setTimeout(() => { 
    doc.deleteNodePermanently(el.nodeId)
    doc.renameNode(git, "src")
    explorer.openDirectory(document.getElementById(HtmlUtils.mainID(git, explorer.alias))!)
    
    setTimeout(() => {
      const new_ = doc.createFile("newfile.md", "text/plain", git)
      explorer.openDirectory(document.getElementById(HtmlUtils.mainID(git, explorer.alias))!)
      setTimeout(() => {
        doc.renameNode(new_.nodeId, ".gitignore")
      }, 2000)
      setTimeout(() => {
        explorer.closeDirectory(document.getElementById(HtmlUtils.mainID(git, explorer.alias))!)
      }, 5000)
    }, 500)
  }, 2000)
}, 2000)

// Add keyboard shortcuts for testing file/folder creation
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    actions.FocusPrevious(e, explorer);
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    actions.FocusNext(e, explorer);
  }
});
