import { LoroTreeNode, TreeID } from "loro-crdt";


export const HtmlUtils = {
  rtreeid: /\d+@\d+/,
  rmapid: /cid:(\d+@\d+):Map/,
  rhtmlid: /lorofs-(\d+a\d+)/,
  
  __id(id: TreeID | string): string {
    const match = id.match(this.rtreeid);
    if (!match) throw new Error("Invalid ID format");
    
    return id.replace("@", "a");
  },
  
  mainID(id: TreeID | string, alias: string): string { return `lorofs-${this.__id(id)}-${alias}` },
  wrapID(id: TreeID | string, alias: string): string { return `lorofs-wrap-${this.__id(id)}-${alias}` },
  
  HtmlID2TreeID(id: string, type: "main" | "warp" = "main"): TreeID {
    const match = id.match(this.rhtmlid);
    if (!match || !match[1]) throw new Error("Invalid ID format");
    return match[1].replace("a", "@") as TreeID;
  },
  
  depth(node: LoroTreeNode): number {
    let depth = 1;
    let parent = node.parent();
    while (parent) { depth++; parent = parent.parent(); }
    return depth;
  },
  
  MENUID: "lorofs-contextmenu",
  
  MAINCLASS: "lorofs-item",
  ICONCLASS: "lorofs-icon",
  NAMECLASS: "lorofs-name",
  PROPCLASS: "lorofs-prop",
  WRAPCLASS: "lorofs-wrap",
  ERRORCLASS: "lorofs-error",
  
  MENUBUTTONCLASS: "lorofs-menubutton",
  MENUDIVIDERCLASS: "lorofs-menudivider",
}