import { UndoManager } from "loro-crdt";
import catppuccinIcons from "./icons/catppuccin.json";
import {
  LoroFS,
  Explorer,
  IconProvider,
  defaultListeners,
  defaultMenuItems,
  actions,
  HtmlUtils,
} from "../dist/lorofs" // Change this for LoroFS

const doc1 = LoroFS.new("Example", () => { }); 
const export1 = doc1.export({mode: "snapshot"})
const doc2 = LoroFS.load(export1);

doc1.subscribeToLocalUpdates((update) => {
  doc2.import(update)
});

const el1 = document.getElementById("explorer1")

const undoManager = new UndoManager(doc1.getMainDoc(), { mergeInterval: 1 });

const explorer1 = new Explorer(doc1, el1!, { 
  alias: "explorer1",
  iconProvider: IconProvider.new(catppuccinIcons as any, "Catppuccin Mocha"),
  listeners: defaultListeners({ contextMenuOptions: { 
    menuItems: defaultMenuItems(
       { text: "undo", onclick: undoManager.undo },  
      { text: "redo", onclick: undoManager.redo }
    )
  }}),
  onOpenFile: (node) => { alert(`Opened file: ${node.data.get("name")}`) }
})

const el2 = document.getElementById("explorer2")
const explorer2 = new Explorer(doc2, el2!, {
  alias: "explorer2", focusable: false,
  listeners: [],
  onOpenFile: (_) => { }
});

// Root Foldes and files
const src = doc1.createDirectory("src");
const assets = doc1.createDirectory("assets");
doc1.createFile("package.json", "text/pain");

// src
doc1.createFile("index.js", "text/plain", src);

setTimeout(() => {
  explorer1.openDirectory(document.getElementById(HtmlUtils.mainID(src, explorer1.alias))!);
  explorer2.openDirectory(document.getElementById(HtmlUtils.mainID(src, explorer2.alias))!);
}, 100)

// Add keyboard shortcuts for testing file/folder creation
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key === 'F') {
    e.preventDefault();
    actions.NewFile(e, explorer1);
  }
  
  if (e.shiftKey && e.key === 'D') {
    e.preventDefault();
    actions.NewDirectory(e, explorer1)
  }
  
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    actions.FocusPrevious(e, explorer1);
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    actions.FocusNext(e, explorer1);
  }
});
