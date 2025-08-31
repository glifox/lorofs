import { Explorer, Listener } from "../explorer/explorer";
import { click, dragstart, dragover, dragleave, drop } from "./types/mouse";
import { keydown } from "./types/keyboard";
import { contextmenu, ContextMenuOptions } from "./types/contextmenu";

interface ListenersOptions {
  contextMenuOptions?: ContextMenuOptions
}

export const defaultListeners = (options?: ListenersOptions): Listener[] => {
  return [
    { name: "click", callback: click },
    { name: "dragstart", callback: dragstart },
    { name: "dragover", callback: dragover },
    { name: "dragleave", callback: dragleave },
    { name: "drop", callback: drop },
    { name: "keydown", callback: keydown },
    { name: "contextmenu", callback: (e: Event, explorer: Explorer) => { contextmenu(e, explorer, options?.contextMenuOptions) } }
  ]
};