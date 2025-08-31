import { LoroDoc, LoroTree, LoroTreeNode, LoroEventBatch, Subscription, TreeID, ExportMode, Listener, ImportStatus } from "loro-crdt";
import { v4 as uuid } from 'uuid';

/**
 * Type definition for the callback function used to save LoroDoc instances.
 * The second argument indicates if the doc (file content) should be deleted.
 */
type SaveCallback = (key: string, doc: LoroDoc, options?: { delete?: boolean }) => void;

/**
 * Interface for the return type of the createFile method.
 */
interface FileCreationResult {
    nodeId: TreeID;
    fileUuid: string;
}

export class LoroFS {
  #mainDoc: LoroDoc;
  #tree: LoroTree;
  #rootNodeId: TreeID;
  #trashNodeId: TreeID;
  #onSave: SaveCallback;
  
  private constructor(onSave?: SaveCallback) {
      this.#mainDoc = new LoroDoc();
      this.#onSave = onSave || ((key: string, doc: LoroDoc, options?: { delete?: boolean }) => {
          if (options?.delete) {
              console.warn(`(LoroFS) Delete function not implemented. Data for key "${key}" was not deleted.`);
          } else {
              console.warn(`(LoroFS) Save function not implemented. Data for key "${key}" is not being persisted.`);
          }
      });
  }

  /**
    * Creates a new, empty LoroFS instance.
    * @param name - The name for the new file system (e.g., 'my-project').
    * @param onSave - A callback function to handle saving/deleting LoroDoc instances.
    * @returns A new LoroFS instance.
    */
  public static new(name: string, onSave?: SaveCallback): LoroFS {
      if (!name || typeof name !== 'string') {
          throw new Error("A valid name (string) is required to create a new LoroFS.");
      }
      
      const fs = new LoroFS(onSave);
      fs.#initializeNewFS(name);
      fs.#addSaveCallback();
      return fs;
  }

  /**
    * Loads a LoroFS instance from a binary snapshot.
    * @param snapshot - The Uint8Array snapshot to load from.
    * @param onSave - A callback function to handle saving/deleting LoroDoc instances.
    * @returns A LoroFS instance loaded from the snapshot.
    */
  public static load(snapshot: Uint8Array, onSave?: SaveCallback): LoroFS {
      if (!(snapshot instanceof Uint8Array) || snapshot.length === 0) {
          throw new TypeError("A valid snapshot (Uint8Array) is required to load a LoroFS.");
      }

      const fs = new LoroFS(onSave);
      fs.#loadFromSnapshot(snapshot);
      fs.#addSaveCallback();
      return fs;
  }

  #addSaveCallback(): void { this.#mainDoc.subscribe(() => this.save()); }
  
  /**
    * Loads the file system state from a snapshot.
    * @private
    */
  #loadFromSnapshot(snapshot: Uint8Array): void {
      this.#mainDoc.import(snapshot);
      this.#tree = this.#mainDoc.getTree('fs-tree');
      const meta = this.#mainDoc.getMap('meta');

      // MEJORA: Se cargan los IDs directamente desde los metadatos. Es mucho más robusto
      // que buscar por un nombre hardcodeado como 'root' o 'trash'.
      const rootId = meta.get("rootNodeId") as TreeID | undefined;
      const trashId = meta.get("trashNodeId") as TreeID | undefined;

      if (!rootId || !trashId) {
          throw new Error("Invalid LoroFS snapshot: 'rootNodeId' or 'trashNodeId' not found in metadata.");
      }
      this.#rootNodeId = rootId;
      this.#trashNodeId = trashId;
  }

  /**
    * Initializes a new, empty file system structure.
    * @private
    */
  #initializeNewFS(name: string): void {
      this.#tree = this.#mainDoc.getTree('fs-tree');
      const meta = this.#mainDoc.getMap("meta");

      const rootNode = this.#tree.createNode();
      rootNode.data.set('name', name);
      rootNode.data.set('type', 'directory');
      this.#rootNodeId = rootNode.id;

      const trashNode = this.#tree.createNode();
      trashNode.data.set('name', 'trash');
      trashNode.data.set('type', 'directory');
      this.#trashNodeId = trashNode.id;

      meta.set("name", name);
      meta.set("created", `${Date.now()}`);
      // MEJORA: Se guardan los IDs de los nodos raíz y papelera para una carga fiable.
      meta.set("rootNodeId", this.#rootNodeId);
      meta.set("trashNodeId", this.#trashNodeId);
      
      this.#mainDoc.commit({ message: `:root:${name}` } );
      this.save(); // Save initial state
  }
  
  #assertNodeIsDirectory(nodeId: TreeID): LoroTreeNode {
      const node = this.#tree.getNodeByID(nodeId);
      if (!node) {
          throw new Error(`Node with ID "${nodeId}" not found.`);
      }
      if (node.data.get('type') !== 'directory') {
          throw new Error(`Node with ID "${nodeId}" is not a directory.`);
      }
      return node;
  }

  /**
    * Creates a directory.
    * @param name - The name of the new directory.
    * @param parentId - The ID of the parent node. Defaults to the root directory.
    * @returns The ID of the newly created directory node.
    */
  createDirectory(name: string, parentId: TreeID = this.#rootNodeId): TreeID {
      const parentNode = this.#assertNodeIsDirectory(parentId);

      // MEJORA: Evita crear directorios con nombres duplicados en el mismo nivel.
      const existing = parentNode.children()?.find(child => child.data.get('name') === name && child.data.get('type') === 'directory');
      if (existing) {
          throw new Error(`A directory with the name "${name}" already exists in parent "${parentId}".`);
      }

      const newNode = parentNode.createNode();
      newNode.data.set('name', name);
      newNode.data.set('type', 'directory');

      this.#mainDoc.commit({ message: `* ++ dir:${name} on **/${parentNode.data.get('name')}/` });
      return newNode.id;
  }

  /**
    * Creates a file.
    * @param name - The name of the new file.
    * @param fileType - A string representing the file type (e.g., 'text/plain').
    * @param parentId - The ID of the parent node. Defaults to the root directory.
    * @returns The ID of the new file node and the UUID for its content.
    */
  createFile(name: string, fileType: string = 'text/plain', parentId: TreeID = this.#rootNodeId): FileCreationResult {
      const parentNode = this.#assertNodeIsDirectory(parentId);

      // MEJORA: Evita crear archivos con nombres duplicados en el mismo nivel.
      const existing = parentNode.children()?.find(child => child.data.get('name') === name && child.data.get('type') === 'file');
      if (existing) {
          throw new Error(`A file with the name "${name}" already exists in parent "${parentId}".`);
      }
      
      const fileUuid = uuid();
      const fileNode = parentNode.createNode();
      fileNode.data.set('name', name);
      fileNode.data.set('type', 'file');
      fileNode.data.set('uuid', fileUuid);
      fileNode.data.set('fileType', fileType);

      const fileContentDoc = new LoroDoc();
      fileContentDoc.getText("content").insert(0, "");
      this.#onSave(fileUuid, fileContentDoc);
      
      this.#mainDoc.commit({ message: `* ++ file:${name} on **/${parentNode.data.get('name')}/` });
      return { nodeId: fileNode.id, fileUuid };
  }

  /**
    * MEJORA: Renombrado de `deleteNode` a `moveToTrash` para ser más explícito.
    * Moves a file or directory to the trash.
    * @param nodeId - The ID of the node to move to trash.
    */
  moveToTrash(nodeId: TreeID): void {
      if (nodeId === this.#rootNodeId || nodeId === this.#trashNodeId) {
          throw new Error("Cannot move the root or trash directory to the trash.");
      }

      const nodeToMove = this.#tree.getNodeByID(nodeId);
      if (!nodeToMove) {
          throw new Error(`Node with ID "${nodeId}" not found.`);
      }

      const trashNode = this.#tree.getNodeByID(this.#trashNodeId);
      if (!trashNode) {
          // This should never happen if the FS is initialized correctly.
          throw new Error("Internal error: Trash node is missing.");
      }

      nodeToMove.move(trashNode);
      this.#mainDoc.commit({ message: `* *~ ${nodeToMove.data.get('name')} to trash` });
  }
  
  /**
    * Deletes a node and all its children permanently.
    * MEJORA: Ahora devuelve los UUIDs de los archivos eliminados para que el
    * sistema anfitrión pueda limpiar los LoroDocs de contenido asociados.
    * @param nodeId - The ID of the node to delete.
    * @returns An array of UUIDs of the deleted files.
    */
    deleteNodePermanently(nodeId: TreeID): string[] {
      if (nodeId === this.#rootNodeId || nodeId === this.#trashNodeId) {
          throw new Error("Cannot permanently delete the root or trash directory.");
      }
      
      const deletedFileUuids: string[] = [];

      const recursiveDelete = (id: TreeID) => {
          const node = this.#tree.getNodeByID(id);
          if (!node) return;

          // Si es un archivo, guarda su UUID para devolverlo.
          if (node.data.get('type') === 'file') {
              const uuid = node.data.get('uuid') as string | undefined;
              if (uuid) {
                  deletedFileUuids.push(uuid);
              }
          }
          
          // Borra recursivamente los hijos.
          node.children()?.forEach(child => recursiveDelete(child.id));
          
          // Borra el nodo actual.
          this.#tree.delete(id);
      };

      recursiveDelete(nodeId);
      
      // Informar al sistema host que debe eliminar los documentos de contenido.
      for (const uuid of deletedFileUuids) {
          this.#onSave(uuid, new LoroDoc(), { delete: true });
      }
      
      const nodeName = this.#tree.getNodeByID(nodeId).data.get('name')
      this.#mainDoc.commit({ message: `* *- ${nodeName} permanently` });
      return deletedFileUuids;
    }
    
    /**
     * Moves a file or directory to a new parent.
     */
    moveNode(nodeId: TreeID, newParentId: TreeID): void {
      const nodeToMove = this.#tree.getNodeByID(nodeId);
      if (!nodeToMove) {
          throw new Error(`Node with ID "${nodeId}" not found.`);
      }

      const newParentNode = this.#assertNodeIsDirectory(newParentId);
      
      // Opcional: Comprobar si ya existe un nodo con el mismo nombre en el destino.
      const nodeName = nodeToMove.data.get('name');
      const conflict = newParentNode.children()?.find(child => child.data.get('name') === nodeName);
      if (conflict) {
          throw new Error(`A node with the name "${nodeName}" already exists in the destination.`);
      }

      nodeToMove.move(newParentNode);
      this.#mainDoc.commit({ message: `* *~ ${nodeName} to **/${newParentId}/` });
  }
  
  public renameNode(nodeId: TreeID, newName: string): void {
    const node = this.#tree.getNodeByID(nodeId);
    if (!node) {
      throw new Error(`Node with ID "${nodeId}" not found.`);
    }
    
    const oldName = node.data.get('name');
    node.data.set('name', newName);
    this.#mainDoc.commit({ message: `* *~ ${oldName} > ${newName}` });
  }

  /**
    * Gets a node by its ID.
    */
  getNodeById(nodeId: TreeID): LoroTreeNode | undefined { return this.#tree.getNodeByID(nodeId); }
  
  getRootNodeId(): TreeID { return this.#rootNodeId; }
  getRootNode(): LoroTreeNode {
      const node = this.getNodeById(this.#rootNodeId);
      if (!node) throw new Error("Internal error: Root node is missing");
      return node;
  }
  
  getTrashNodeId(): TreeID { return this.#trashNodeId; }
  getTrashNode(): LoroTreeNode {
      const node = this.getNodeById(this.#trashNodeId);
      if (!node) throw new Error("Internal error: Trash node is missing");
      return node;
  }

  /**
    * Subscribes to changes in the file system structure (the tree).
    */
  subscribeToTree(listener: Listener): Subscription { return this.#tree.subscribe(listener); }
  subscribeToLocalUpdates(listener: (update: Uint8Array) => void) { 
    return this.#mainDoc.subscribeLocalUpdates(listener); 
  }
  
  import(update_or_snapshot: Uint8Array): ImportStatus { return this.#mainDoc.import(update_or_snapshot); }
  
  /**
    * Triggers the save callback for the main file system document.
    */
  save(): void {
      const meta = this.#mainDoc.getMap("meta");
      const key = meta.get("name") as string;
      if (!key) {
          // This should not happen in a correctly initialized FS.
          console.error("(LoroFS) Cannot save main document: FS name is missing from metadata.");
          return;
      }
      this.#onSave(key, this.#mainDoc);
  }

  /**
    * A utility to list the contents of a directory.
    */
  listChildren(nodeId: TreeID = this.#rootNodeId): LoroTreeNode[] {
      const node = this.getNodeById(nodeId);
      if (!node || node.isDeleted()) return [];
      
      return node.children() ?? [];
  }
  
  getMainDoc() { return this.#mainDoc }
  export(mode: ExportMode): Uint8Array { return this.#mainDoc.export(mode); }
  toJSON() { return this.#tree.toJSON() }
}