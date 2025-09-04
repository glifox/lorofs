import {
  LoroEvent,
  LoroEventBatch,
  LoroTreeNode,
  Subscription,
  TreeID
} from "loro-crdt";
import { LoroFS } from "../LoroFS";
import { Renderer } from "./renderer";
import { HtmlUtils } from "./utils";

export interface Listener {
    name: string;
    callback: (event: Event, explorer: Explorer) => void;
}

interface internalListener {
    name: string;
    callback: (event: Event) => void;
}

interface ExplorerOptions {
  alias?: string,
  focusable?: boolean,
  iconProvider?: any,
  listeners?: Listener[],
  onOpenFile?: (node: LoroTreeNode) => void,
}


export class Explorer {
  public readonly element: HTMLElement;
  public readonly fs: LoroFS;
  public readonly alias: string;
  private subs: Subscription;
  private renderer: Renderer;
  private listeners: internalListener[] = [];
  private callbacks = {
    onOpenFile: (_: LoroTreeNode) => { }
  }

  constructor(fs: LoroFS, element: HTMLElement, options?: ExplorerOptions) {
    this.element = element;
    this.fs = fs;
    if (options?.alias) this.alias = options?.alias;
    else this.alias = "explorer" + Math.ceil(Math.random() * 100);
    this.renderer = new Renderer({
      alias: this.alias,
      focusable: options?.focusable ?? true,
      rootId: this.fs.getRootNodeId(),
      trashId: this.fs.getTrashNodeId(),
      getNodeByid: this.fs.getNodeById.bind(this.fs),
      icon: options?.iconProvider ?? null
    });
    
    if (options?.listeners) {
      this.listeners = options.listeners.map(listener => {
        return {
          name: listener.name,
          callback: (event: Event) => listener.callback(event, this)
        }
      });
    }
    
    if (options?.onOpenFile) this.callbacks.onOpenFile = options.onOpenFile;
    else this.callbacks.onOpenFile = (_) => { };
    
    this.start();
  }

  private render(fs: LoroFS) {
    const root = fs.getRootNode();
    const element = this.renderer.new(root, true);
    this.element.appendChild(element);
  }
  
  public stop() {
    this.subs();
    this.element.innerHTML = '';
    this.removeEventListeners();
  }
  
  public start() {
    this.render(this.fs);
    this.subs = this.fs.subscribeToTree(this.updater.bind(this));
    this.addEventListeners();
  }
  
  private updater(event: LoroEventBatch) {
    event.events.forEach(
      (e: LoroEvent) => this.renderer.eventMap[e.diff.type](e.diff, e.target)
    );
  }
  
  private addEventListeners() {
    this.listeners.forEach(({ name, callback }) => {
      this.element.addEventListener(name, callback);
    });
  }

  
  private removeEventListeners() {
    this.listeners.forEach(({ name, callback }) => {
      this.element.removeEventListener(name, callback);
    });
  }
  
  #elementToNode(element: HTMLElement): LoroTreeNode | undefined {
    if (!element) return null;
    const id = HtmlUtils.HtmlID2TreeID(element.id);
    if (!id) return null;
    
    return this.fs.getNodeById(id);
  }
  
  public openDirectory(element: HTMLElement): void {
    const node = this.#elementToNode(element);
    if (!node || node.data.get("type") !== "directory") return;
    
    this.renderer.openDirectory(element, node);
  }
  
  public closeDirectory(element: HTMLElement): void {
    const node = this.#elementToNode(element);
    if (!node || node.data.get("type") !== "directory") return;
    
    this.renderer.closeDirectory(element, node);
  }
  
  public toggleDirectory(element: HTMLElement): void {
    const node = this.#elementToNode(element);
    if (!node || node.data.get("type") !== "directory") return;
    
    this.renderer.toggleDirectory(element, node);
  }
  
  public openFile(element: HTMLElement): void {
    const node = this.#elementToNode(element);
    if (!node || node.data.get("type") !== "file") return;
    
    this.callbacks.onOpenFile(node);
  }
  
  /**
   * Creates a new file with an interactive placeholder input.
   * The user can type the filename and the icon will update reactively based on the file extension.
   * @param parentElement - Optional parent directory element. If not provided, creates in root directory.
   */
  public createNewFile(parentElement?: HTMLElement, onCreate:  (element: HTMLElement) => void = () => {}): void {
    const parentNode = parentElement ? this.#elementToNode(parentElement) : this.fs.getRootNode();
    if (!parentNode || parentNode.data.get("type") !== "directory") return;
    
    // Ensure parent directory is open
    if (parentElement) this.openDirectory(parentElement);
    
    this.renderer.createPlaceholder(
      "file", 
      parentNode, 
      parentElement, 
      (name: string, _, parentNode: LoroTreeNode): TreeID => {
        const fileType = this.renderer.getFileTypeFromName(name);
        const result = this.fs.createFile(name, fileType, parentNode.id);
        
        return result.nodeId;
      },
      onCreate
    );
  }
  
  /**
   * Creates a new directory with an interactive placeholder input.
   * The user can type the directory name and confirm creation.
   * @param parentElement - Optional parent directory element. If not provided, creates in root directory.
   */
  public createNewDirectory(parentElement?: HTMLElement, onCreate: (element: HTMLElement) => void = () => {}): void {
    const parentNode = parentElement ? this.#elementToNode(parentElement) : this.fs.getRootNode();
    if (!parentNode || parentNode.data.get("type") !== "directory") return;
    
    // Ensure parent directory is open
    if (parentElement) this.openDirectory(parentElement);
    
    this.renderer.createPlaceholder(
      "directory", 
      parentNode, 
      parentElement, 
      (name: string, _, parentNode: LoroTreeNode): TreeID => {
        let id = this.fs.createDirectory(name, parentNode.id);
        return id;
      },
      onCreate
    );
  }

  /**
   * Starts the rename process for an element.
   * @param element - The element to rename.
   */
  public startRename(element: HTMLElement, onRename: (element: HTMLElement) => void = () => { }): void {
    const node = this.#elementToNode(element);
    if (!node) return;
    
    this.renderer.startRename(
      element, node, 
      (newName: string, nodeId: any) => {
        this.fs.renameNode(nodeId, newName);
        onRename(element)
      }
    );
  }
  
  public getAlias() { return this.alias }
}
