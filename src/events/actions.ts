import { HtmlUtils } from "../explorer/utils";
import { Explorer } from "../explorer/explorer";


export const getTarget = (event: Event): HTMLElement | null => {
  let target = event.target  as HTMLElement;
  
  if (target instanceof HTMLInputElement) target.closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement;
  else target = event.target as HTMLElement ?? document.activeElement as HTMLElement;
  
  return target.closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
}


const calcIndexOfFocusedElement = (focusables: NodeListOf<Element>,target: HTMLElement) => {
  if (focusables.length === 0) return;

  let currentIndex = -1;
  for (let i = 0; i < focusables.length; i++) {
    if (focusables[i] === target) { currentIndex = i; break; } // Find the activeElement index
  }
  return currentIndex;
}


export const actions = {
  OpenFileOrDirectory: (event: KeyboardEvent, explorer: Explorer, toogleDirectory: boolean = false) => {
    if (event.target instanceof HTMLInputElement) return;
    const target = getTarget(event);
    if (!target) return;
    
    event.preventDefault();
    const type = target.dataset.type;
    switch (type) {
      case "file": explorer.openFile(target); break;
      case "directory":
        if (toogleDirectory) explorer.toggleDirectory(target);
        else explorer.openDirectory(target);
    }
  },
  CloseSelfOrParentDirectory: (event: KeyboardEvent, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    if (!target) return;
    
    const directory = target.closest('[data-type="directory"][data-open="true"]') as HTMLElement;
    if (!directory) return;
    
    explorer.closeDirectory(directory);
    (directory.querySelector("."+HtmlUtils.PROPCLASS) as HTMLElement).focus();
  },
  NewDirectory: (event: Event, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    explorer.createNewDirectory(target);
  },
  NewFile: (event: Event, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    explorer.createNewFile(target);
  },
  Rename: (event: Event, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    explorer.startRename(target);
  },
  FocusNext: (event: Event, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    const rootId = explorer.fs.getRootNodeId();
    const rootElement = document.getElementById(
      HtmlUtils.mainID(rootId, explorer.alias)
    )
    
    if (!rootElement) {
      console.warn("Root element not found");
      return;
    }
    
    const focusables = document.querySelectorAll(`[data-alias=${explorer.alias}][data-focusable=true]`);
    const index = calcIndexOfFocusedElement(focusables, target);

    let nextIndex = (index + 1) % focusables.length; // Next Element to be focussed
    if (index === -1) nextIndex = 0; // Fail save

    (focusables[nextIndex].querySelector("."+HtmlUtils.PROPCLASS) as HTMLElement).focus();   
  },
  FocusPrevious: (event: Event, explorer: Explorer) => {
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    const target = getTarget(event);
    const rootId = explorer.fs.getRootNodeId();
    const rootElement = document.getElementById(HtmlUtils.mainID(rootId, explorer.alias))

    if (!rootElement) {
      console.warn("Root element not found");
      return;
    }
    
    const focusables = document.querySelectorAll(`[data-alias=${explorer.alias}][data-focusable=true]`);
    const index = calcIndexOfFocusedElement(focusables, target);

    let nextIndex = Math.max(index - 1, 0); // Next Element to be focussed
    if (index === 0) nextIndex = focusables.length - 1; // Fail save
    else 
    if (index === -1) nextIndex = 0; // Fail save

    (focusables[nextIndex].querySelector("."+HtmlUtils.PROPCLASS) as HTMLElement).focus();   
  }
}
