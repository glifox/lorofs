import { HtmlUtils } from "../../explorer/utils";
import { Explorer } from "../../explorer/explorer";

interface Item { text: string, onclick: (explorer: Explorer, target?: HTMLElement | undefined) => void }

export const defaultMenuItems = (... aditional: Item[]) => {
  return [
    {
      text: 'New File',
      onclick: (explorer: Explorer, target?: HTMLElement | undefined) => explorer.createNewFile(target)
    },
    {
      text: 'New Folder', 
      onclick: (explorer: Explorer, target?: HTMLElement | undefined) => explorer.createNewDirectory(target)
    },
    {
      text: 'Rename', 
      onclick: (explorer: Explorer, target?: HTMLElement | undefined) => explorer.startRename(target)
    },
    ...aditional
  ]
}

export interface ContextMenuOptions {
  menuItems?: Item[]; 
}

export const contextmenu = (
  e: Event, 
  explorer: Explorer, 
  options: ContextMenuOptions = {
    menuItems: defaultMenuItems()
  }
) => {
  let menu = document.getElementById("lorofs-contextmenu"); 
  if (menu) { menu.remove(); return; }
  
  e.preventDefault();
  const evt = e as MouseEvent;
  
  const target = (e.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
 
  menu = document.createElement('div');
  menu.id = "lorofs-contextmenu";
  menu.style.cssText = `position: fixed; left: ${evt.clientX}px; top: ${evt.clientY}px;`;
  
  const element = target;
  
  const removeMenu = () => {
    if (document.body.contains(menu)) { document.body.removeChild(menu); }
    document.removeEventListener('click', removeMenu);
  };
  
  for (let item of options.menuItems) {
    const child = addItem(item.text, () => {
      item.onclick(explorer, element)
      document.body.removeChild(menu);
      removeMenu();
    })
    
    menu.appendChild(child);
  }
 
  document.body.appendChild(menu);
  
  document.addEventListener('click', removeMenu);
}

const addItem = (text: string, onClick: () => void) => {
  const item = document.createElement('button');
  item.style.display = "block";
  item.textContent = text;
  
  item.addEventListener('click', onClick);
  
  return item;
};