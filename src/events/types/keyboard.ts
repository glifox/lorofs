import { Explorer } from "../../explorer/explorer";
import { actions } from "../actions";
import { createKeybindingsHandler, KeyBindingHandlerOptions, KeyBindingMap } from "@glifox/desmos";
import { getKeyBindingMap, KeymapConfig } from "../keybind";


export const keydown = (
  keybindings: KeymapConfig = defaultKeymap,
  options?: {
    aditionalBindingMaps?: KeyBindingMap,
    keyBindingHandlerOptions?: KeyBindingHandlerOptions,
  },
): ((event: Event, ...args: any[]) => void) => {
  return createKeybindingsHandler({
      ...getKeyBindingMap(keybindings),
      ...options?.aditionalBindingMaps ?? {}
    }, 
    options?.keyBindingHandlerOptions ?? {}
  );
};

export const defaultKeymap: KeymapConfig = {
  "shift-f": "NewFile",
  "shift-d": "NewDirectory",
  "arrowup": "FocusPrevious",
  "arrowdown": "FocusNext",
  "arrowright": "OpenFileOrDirectory",
  "arrowleft": "CloseSelfOrParentDirectory",
  "enter": { action: "OpenFileOrDirectory", params: [true] },
  "f2": "Rename"
}