import {
  LoroTreeNode,
  MapDiff,
  TreeDiff,
  TreeID,
} from "loro-crdt";
import { defaultIcon } from "../icons/default";
import { HtmlUtils } from "./utils";


interface RendererOptions {
  alias: string;
  focusable: boolean;
  rootId: TreeID;
  trashId: TreeID;
  getNodeByid: (id: TreeID) => LoroTreeNode | undefined;
  icon?: (node: LoroTreeNode, open: boolean) => HTMLElement | undefined | null;
}


export class Renderer {
  
  private open: Set<string> = new Set();
  private opening: Set<string> = new Set();
  private alias: string;
  private focusable: boolean;
  
  private getNodeById: (id: TreeID) => LoroTreeNode | undefined;
  private icon: (node: LoroTreeNode, open: boolean) => HTMLElement | undefined | null;
  
  private rootId: TreeID;
  private trashId: TreeID; 
  
  constructor(options: RendererOptions) {
    this.icon = options.icon ?? ((_: any) => null),
    this.getNodeById = options.getNodeByid;
    this.rootId = options.rootId;
    this.trashId = options.trashId;
    this.alias = options.alias;
    this.focusable = options.focusable;
  }
  
  public isOpen(id: TreeID) { return this.open.has(id); }
  public isOpening(id: TreeID) { return this.opening.has(id); }
  public getIcon(node: LoroTreeNode, open: boolean): HTMLElement {
    return this.icon(node, open) ?? defaultIcon( node, open);
  }

  public new(node: LoroTreeNode, open = false): HTMLElement {
    if (open) this.open.add(node.id);
    else this.open.delete(node.id);
    
    const element = document.createElement("div");
    const properties = document.createElement("div");
    const wraper = document.createElement("div");
    
    element.setAttribute("draggable", "true");
    element.dataset.type = node.data.get("type") as string;
    element.dataset.name = node.data.get("name") as string;
    element.dataset.open = open.toString();
    element.dataset.alias = this.alias;
    element.dataset.focusable = this.focusable.toString();
    
    const depth = HtmlUtils.depth(node);
    properties.style = `--depth: ${depth}`;
    wraper.dataset.depth = depth.toString();
    
    element.id = HtmlUtils.mainID(node.id, this.alias);
    wraper.id = HtmlUtils.wrapID(node.id, this.alias);
    
    element.classList.add(HtmlUtils.MAINCLASS);
    properties.classList.add(HtmlUtils.PROPCLASS);
    wraper.classList.add(HtmlUtils.WRAPCLASS);
    
    const icon = document.createElement("span")
    icon.classList.add(HtmlUtils.ICONCLASS);
    icon.appendChild(this.getIcon(node, open));
    
    const name = document.createElement("span")
    name.classList.add(HtmlUtils.NAMECLASS);
    name.innerText = node.data.get("name") as string;
    
    properties.appendChild(icon);
    properties.appendChild(name);
    if (this.focusable) properties.setAttribute("tabindex", "0")
    
    element.appendChild(properties);
    element.appendChild(wraper);
    
    if (open) this.showChildren(node, wraper);
    
    return element;
  }
  
  public showChildren(node: LoroTreeNode, wrap: HTMLElement) {    
    node.children()?.forEach((node: LoroTreeNode) => {
      const existingElement = document.getElementById(HtmlUtils.mainID(node.id, this.alias));
      if (existingElement) return;
      
      const childElement = this.new(node, this.isOpen(node.id));
      wrap.appendChild(childElement);
    });
  }
  
  private replaceIcon(iconSpan: HTMLElement, newIcon: HTMLElement) {
    const oldIcon = iconSpan.firstElementChild;
    
    if (oldIcon && oldIcon.isEqualNode(newIcon)) return;
  
    if (oldIcon) oldIcon.replaceWith(newIcon);
    else iconSpan.appendChild(newIcon);
  }
  
  /**
   * Update the DOM element. (Just its metadata)
   * This is meant for be call after a metadata
   * update, rather than a tree update
   */
  public update(node: LoroTreeNode, open: boolean = false): void {
    const element = document.getElementById(HtmlUtils.mainID(node.id, this.alias));
    if (!element) return;
    
    const baseSelector = `:scope > .${HtmlUtils.PROPCLASS}`;
    const properties = element.querySelector(baseSelector) as HTMLElement;
    if (!properties) return;
    
    const oldType = element.dataset.type;
    const oldName = element.dataset.name;
    const oldState = element.dataset.open === "true";
    
    const newType = node.data.get("type") as string;
    const newName = node.data.get("name") as string;
    
    if (newType !== oldType) element.setAttribute("type", newType);
    if (newName !== oldName) {
      element.dataset.name = newName;
      const nameSpan = element.querySelector(`${baseSelector} > .${HtmlUtils.NAMECLASS}`);
      if (!nameSpan) return;
    
      nameSpan.textContent = newName;
    
      const newIcon = this.getIcon(node, open);
      const iconSpan = element.querySelector(`${baseSelector} > .${HtmlUtils.ICONCLASS}`) as HTMLElement;
      
      this.replaceIcon(iconSpan, newIcon); 
    }
    
    if (oldState !== open) {
      element.dataset.open = open.toString();
      const newIcon = this.getIcon(node, open);
      
      const iconSpan = element.querySelector(`${baseSelector} > .${HtmlUtils.ICONCLASS}`);
      const oldIcon = iconSpan.firstElementChild;
      
      if (oldIcon) oldIcon.replaceWith(newIcon);
      else iconSpan.appendChild(newIcon);
    }
  }
  
  /**
   * Move a DOM element to another.
   */
  public move(node: LoroTreeNode, oldParentId: TreeID, newParentId: TreeID): void {
    const htmlNodeId = HtmlUtils.mainID(node.id, this.alias);
    const htmlNewParentId = HtmlUtils.wrapID(newParentId, this.alias);
    
    const nodeToMove = document.getElementById(htmlNodeId);
    const newParent = document.getElementById(htmlNewParentId);
    
    if (!nodeToMove || !newParent) return; 
    
    const properties = nodeToMove.querySelector(`:scope > .${HtmlUtils.PROPCLASS}`) as HTMLElement
    const wraper = nodeToMove.querySelector(`:scope > .${HtmlUtils.WRAPCLASS}`) as HTMLElement

    const currentDepth = parseInt(wraper.dataset.depth || "1", 10);
    const newDepth = HtmlUtils.depth(node);

    properties.style = `--depth: ${newDepth}`;
    wraper.dataset.depth = newDepth.toString();
    
    this.updateChildrenDepth(nodeToMove, newDepth - currentDepth);
    newParent.appendChild(nodeToMove);
  }

  /**
   * Updates the depth of all children elements recursively.
   */
  private updateChildrenDepth(element: HTMLElement, depthDiff: number): void {
    element.querySelectorAll(`.${HtmlUtils.MAINCLASS}`).forEach((child) => {
      const properties = child.querySelector(`:scope > .${HtmlUtils.PROPCLASS}`) as HTMLElement
      const wraper = child.querySelector(`:scope > .${HtmlUtils.WRAPCLASS}`) as HTMLElement
      
      const currentDepth = parseInt(wraper.dataset.depth || "1", 10);
      const newDepth = currentDepth + depthDiff;
      
      properties.style = `--depth: ${newDepth}`;
      wraper.dataset.depth = newDepth.toString();
    })
  }

  /**
   * Deletes a DOM element.
   */
  public delete(nodeId: TreeID, parentId: TreeID): void {
    const htmlNodeId = HtmlUtils.mainID(nodeId, this.alias);
    const htmlParentId = HtmlUtils.wrapID(parentId, this.alias);
    
    const parentElement = document.getElementById(htmlParentId);
    const nodeToDelete = document.getElementById(htmlNodeId);
    
    if (parentElement && nodeToDelete) parentElement.removeChild(nodeToDelete);
  }
  
  public openDirectory(element: HTMLElement, node: LoroTreeNode): void {
    if (this.isOpen(node.id) || this.isOpening(node.id)) return;
    this.opening.add(node.id);
    
    try {
      this.open.add(node.id);
      this.update(node, true);
      
      const wrap = element.querySelector("#"+HtmlUtils.wrapID(node.id, this.alias)) as HTMLElement;
      if (!wrap) return;
      
      this.cleanupOrphanedElements(node.id, wrap);
      this.showChildren(node, wrap);
    }
    
    finally { this.opening.delete(node.id); }
  }
  
  private cleanupOrphanedElements(parentId: TreeID, wrap: HTMLElement): void {
    const children = this.getNodeById(parentId)?.children() ?? [];
    const currentChildrenIds = new Set(
      children.map(node => HtmlUtils.mainID(node.id, this.alias))
    );
    
    Array.from(wrap.children).forEach(element => {
      if (!element.classList.contains(HtmlUtils.MAINCLASS)) return;
      if (!currentChildrenIds.has(element.id)) element.remove();
    });
  }
  
  public closeDirectory(element: HTMLElement, node: LoroTreeNode): void {
    if (!this.isOpen(node.id) || this.isOpening(node.id)) return;
    
    this.open.delete(node.id);
    this.update(node, false);
    element.querySelectorAll(`.${HtmlUtils.MAINCLASS}`).forEach((child) => child.remove());
  }
  
  public toggleDirectory(element: HTMLElement, node: LoroTreeNode): void {
    if (this.isOpen(node.id)) this.closeDirectory(element, node);
    else this.openDirectory(element, node);
  }
  
  public eventMap = {
    tree: (e: TreeDiff, _: any) => {
      for (let diff of e.diff) {
        if (diff.action === "create" && this.isOpen(diff.parent!) && !this.isOpening(diff.parent!)) {
          const existingElement = document.getElementById(HtmlUtils.mainID(diff.target, this.alias));
          if (existingElement) continue;
          
          const parentId = HtmlUtils.wrapID(diff.parent!, this.alias);
          const parent = document.getElementById(parentId);
          if (!parent) continue;
          
          const node = this.getNodeById(diff.target)!;
          const element = this.new(node);
          parent.appendChild(element);
          
          continue;
        }
        if (diff.action === "delete" && this.isOpen(diff.oldParent!)) {
          this.delete(diff.target, diff.oldParent!)
          continue;
        }
        if (diff.action === "move") {
          const wasVisible = this.isOpen(diff.oldParent!) && !this.isOpening(diff.oldParent!);
          const willBeVisible = this.isOpen(diff.parent!) && !this.isOpening(diff.parent!);
          
          if (wasVisible && !willBeVisible) this.delete(diff.target, diff.oldParent!);
          else 
          if (!wasVisible && willBeVisible) {
            const existingElement = document.getElementById(HtmlUtils.mainID(diff.target, this.alias));
            if (existingElement) continue;
            
            const parentId = HtmlUtils.wrapID(diff.parent!, this.alias);
            const parent = document.getElementById(parentId)!;
            const node = this.getNodeById(diff.target)!;
            const element = this.new(node);
            parent.appendChild(element);
          } 
          else 
          if (wasVisible && willBeVisible) {
            const node = this.getNodeById(diff.target);
            this.move(node, diff.oldParent!, diff.parent!);
          }
          continue;
        }
      }
    },
    map: (_: MapDiff, target: string) => {
      const id = target.match(HtmlUtils.rmapid)![1];
      if (!id) throw new Error("Invalid target ID format");
      const node = this.getNodeById(id as TreeID);
      if (!node) return;
      this.update(node, this.isOpen(node.id));
    }
  };

  /**
   * Creates an interactive placeholder element with input field for file/directory creation.
   * Handles input validation, icon updates, and keyboard events (Enter to confirm, Escape to cancel).
   */
  public createPlaceholder(
    type: "file" | "directory", 
    parentNode: LoroTreeNode, 
    parentElement: HTMLElement | null, 
    onConfirm: (name: string, type: "file" | "directory", parentNode: LoroTreeNode) => TreeID,
    onCreated: (element: HTMLElement) => void = () => {}
  ): void {
    const tempId = `placeholder-${Date.now()}`;
    const wrapId = HtmlUtils.wrapID( parentElement ? parentNode.id : this.rootId, this.alias);
    const wrapElement = document.getElementById(wrapId!);
    
    if (!wrapElement) return;
    
    // Create placeholder element structure
    const element = document.createElement("div");
    const properties = document.createElement("div");
    
    const depth = HtmlUtils.depth(parentNode) + 1;
    properties.style = `--depth: ${depth}`;
    
    element.id = tempId;
    element.classList.add(HtmlUtils.MAINCLASS, "lorofs-placeholder");
    properties.classList.add(HtmlUtils.PROPCLASS);
    
    // Create input field instead of span
    const input = document.createElement("input");
    input.classList.add(HtmlUtils.NAMECLASS);
    input.type = "text";
    input.placeholder = type === "file" ? "New file..." : "New folder...";
    input.value = "";
    
    const iconSpan = document.createElement("span");
    iconSpan.classList.add(HtmlUtils.ICONCLASS);
    
    // Update icon based on input value
    const updateIcon = () => {
      const value = input.value.trim();
      const tempNode = this.createTempNode(type, value || "untitled");
      
      const newIcon = this.getIcon(tempNode, false);
      this.replaceIcon(iconSpan, newIcon);
    };
    updateIcon(); // Initialize icon
    input.addEventListener("input", updateIcon);
    
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault();
        this.confirmPlaceholder(element, input.value, type, parentNode, onConfirm, onCreated);
      } 
      else 
      if (e.key === "Escape") { e.preventDefault();
        this.cancelPlaceholder(element);
      }
    });
    
    input.addEventListener("blur", () => {
      if (input.value) 
        this.confirmPlaceholder(element, input.value, type, parentNode, onConfirm, onCreated);
      else this.cancelPlaceholder(element);
    });
    
    properties.appendChild(iconSpan);
    properties.appendChild(input);
    element.appendChild(properties);
    
    wrapElement.appendChild(element);
    input.focus(); input.select();
  }

  /**
   * Creates a temporary node object for icon generation during placeholder input.
   */
  private createTempNode(type: "file" | "directory", name: string): any {
    return {
      data: {
        get: (key: string) => {
          if (key === "type") return type;
          if (key === "name") return name;
          if (key === "fileType" && type === "file") return this.getFileTypeFromName(name);
          return null;
        }
      }
    };
  }

  /**
   * Determines the MIME type of a file based on its extension.
   */
  public getFileTypeFromName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'zip': 'application/zip'
    };
    
    return mimeTypes[extension || ''] || 'text/plain';
  }

  /**
   * Confirms the creation of a file or directory from a placeholder input.
   */
  private confirmPlaceholder(
    placeholderElement: HTMLElement, 
    name: string, type: "file" | "directory", 
    parentNode: LoroTreeNode, 
    onConfirm: (name: string, type: "file" | "directory", parentNode: LoroTreeNode) => TreeID,
    onSucces: (element: HTMLElement) => void = () => {}
  ): void {
    if (!name) {
      this.cancelPlaceholder(placeholderElement);
      return;
    }
    
    const validationError = this.validateName(name);
    if (validationError) {
      this.setError(placeholderElement, validationError);
      return;
    }
    
    try {
      const id = onConfirm(name.trim(), type, parentNode);
      const el = this.new(this.getNodeById(id), true);
      placeholderElement.replaceWith(el);
      onSucces(el);
    } 
    catch (error) {
      console.warn(`Failed to create ${type}:`, error);
      this.setError(placeholderElement, (error as Error).message);
    }
  }

  /**
   * Cancels the creation process and removes the placeholder element.
   */
  private cancelPlaceholder(placeholderElement: HTMLElement): void { placeholderElement.remove(); }

  /**
   * Validates the name for file/directory creation.
   */
  private validateName(name: string): string | null {
    if (!name.trim()) return "name cannot be empty";
    
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) return "Name contains invalid characters";
    
    if (name.length > 255) return "Name is too long (maximum 255 characters)";
    
    return null;
  }

  /**
   * Shows a validation error to the user by styling the input and refocusing.
   */
  private setError(placeholderElement: HTMLElement, errorMessage: string): void {
    const input = placeholderElement.querySelector("input") as HTMLInputElement;
    if (!input) return;
    
    input.title = errorMessage;
    input.classList.add(HtmlUtils.ERRORCLASS)
    
    setTimeout(() => { input.classList.remove(HtmlUtils.ERRORCLASS) }, 3000);
    
    input.focus();
    input.select();
  }

  /**
   * Starts the rename process for an element.
   */
  public startRename(element: HTMLElement, node: LoroTreeNode, onConfirm: (newName: string, nodeId: TreeID) => void): void {
    const baseSelector = `:scope > .${HtmlUtils.PROPCLASS}`;
    
    const nameSpan = element.querySelector(`${baseSelector} > .${HtmlUtils.NAMECLASS}`) as HTMLElement;
    if (!nameSpan) return;
    
    const currentName = node.data.get("name") as string;
    
    // Create input field
    const input = document.createElement("input");
    input.classList.add(HtmlUtils.NAMECLASS);
    input.type = "text";
    input.value = currentName;
    
    const type = element.dataset.type as "file" | "directory";
    const iconSpan = element.querySelector(`${baseSelector} > .${HtmlUtils.ICONCLASS}`) as HTMLElement;
    
    const updateIcon = () => {
      const value = input.value.trim();
      const tempNode = this.createTempNode(type, value || "untitled");
      
      const newIcon = this.getIcon(tempNode, false);
      this.replaceIcon(iconSpan, newIcon);
    };
    
    input.addEventListener("input", updateIcon);
    nameSpan.replaceWith(input); // Replace span with input
    input.focus(); input.select();
    
    const finishRename = (confirmed: boolean) => {
      const newName = input.value.trim();
      
      if (confirmed && newName && newName !== currentName) {
        const validationError = this.validateName(newName);
        
        if (validationError) {
          this.setError(element, validationError);
          return;
        }
        
        try { onConfirm(newName, node.id); } 
        catch (error) {
          console.error("Rename failed:", error);
        }
      }
      
      // Restore original span (the update will be handled by the tree event)
      const newNameSpan = document.createElement("span");
      newNameSpan.classList.add(HtmlUtils.NAMECLASS);
      newNameSpan.setAttribute("tabindex", "0");
      newNameSpan.textContent = currentName;
      input.replaceWith(newNameSpan);
    };
    
    // Event listeners
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault();
        finishRename(true);
      } 
      else 
      if (e.key === "Escape") { e.preventDefault();
        finishRename(false);
      }
    });
    
    input.addEventListener("blur", () => { finishRename(true); });
  }
}