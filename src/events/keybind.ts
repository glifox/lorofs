import { KeyBindingMap } from "@glifox/desmos";
import { actions } from "./actions";
import { Explorer } from "../explorer/explorer";

export type ActionParam = {
  action: keyof typeof actions,
  params: any[]
}; 
export interface KeymapConfig {
  [keybinding: string]: keyof typeof actions | ActionParam;
}

export const getKeyBindingMap = (config: KeymapConfig): KeyBindingMap => {
  const map: KeyBindingMap = {};
  
  for (const keybinding in config) {
    const action = config[keybinding];
    
    if ( 
      typeof action === "string" && 
      actions.hasOwnProperty(action)
    ) {
      map[keybinding] = actions[action];
      continue;
    }
    
    const { action: name, params = [] } = action as ActionParam;
    if (!name || !actions.hasOwnProperty(name)) continue;
    // @ts-ignore Para evitar la validacion del tipado en ...params
    map[keybinding] = (e, ex: Explorer) => actions[name](e, ex, ...params) 
  }
  
  return map;
}