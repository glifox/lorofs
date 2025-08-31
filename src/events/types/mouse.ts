import { Explorer } from "../../explorer/explorer";
import { HtmlUtils } from "../../explorer/utils";

let draggedElement: HTMLElement | null = null;

export const click = (event: MouseEvent, explorer: Explorer) => {
  const target = (event.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
  if (!target) return;
  
  const type = target.dataset.type;
  if ( type === "file" ) explorer.openFile(target);
  else 
  if ( type === "directory" ) explorer.toggleDirectory(target);
  else return;
}

export const dragstart = (event: DragEvent, explorer: Explorer) => {
  const target = (event.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
  if (!target) return;
  
  draggedElement = target;
  
  // Set drag effect
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/html", target.outerHTML);
  }
}

export const dragover = (event: DragEvent, explorer: Explorer) => {
  event.preventDefault();
  
  const target = (event.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
  if (!target || !draggedElement) return;
  
  // Only allow dropping on directories
  const type = target.dataset.type;
  if (type !== "directory") return;
  
  // Prevent dropping on itself or its children
  if (target === draggedElement || target.closest(`#${draggedElement.id}`)) return;
  
  // Set drop effect
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  
  // Add visual feedback
  target.style.backgroundColor = "rgba(0, 123, 255, 0.1)";
}

export const dragleave = (event: DragEvent, explorer: Explorer) => {
  const target = (event.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
  if (!target) return;
  
  // Remove visual feedback
  target.style.backgroundColor = "";
}

export const drop = (event: DragEvent, explorer: Explorer) => {
  event.preventDefault();
  
  const target = (event.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
  if (!target || !draggedElement) return;
  
  // Remove visual feedback
  target.style.backgroundColor = "";
  
  const targetType = target.dataset.type;
  if (targetType !== "directory") return;
  
  // Prevent dropping on itself or its children
  if (target === draggedElement || target.closest(`#${draggedElement.id}`)) return;
  
  try {
    const fs = explorer.fs;
    const draggedId = HtmlUtils.HtmlID2TreeID(draggedElement.id);
    const targetId = HtmlUtils.HtmlID2TreeID(target.id);
    
    // Move the node in the file system
    fs.moveNode(draggedId, targetId);
    
    // Ensure target directory is open to show the moved item
    explorer.openDirectory(target);
    
  } 
  catch (error) { console.error("Failed to move node:", error); } 
  finally { draggedElement = null; }
}