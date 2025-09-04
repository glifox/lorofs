import { HtmlUtils } from "../../explorer/utils";
import { Explorer } from "../../explorer/explorer";

interface Item { 
  text: string, 
  onclick: (explorer: Explorer, target?: HTMLElement | undefined) => void 
}

export const defaultMenuItems = (... aditional: (Item | string)[]) => {
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
  menuItems?: (Item | string)[]; 
}

export const contextmenu = (
  e: Event, 
  explorer: Explorer, 
  options: ContextMenuOptions = {
    menuItems: defaultMenuItems()
  }
) => {
  let menu = document.getElementById(HtmlUtils.MENUID); 
  if (menu) { menu.remove(); return; }
  
  e.preventDefault();
  const evt = e as MouseEvent;
  
  const target = (e.target as HTMLElement).closest(`.${HtmlUtils.MAINCLASS}`) as HTMLElement | null;
 
  menu = document.createElement('div');
  menu.id = HtmlUtils.MENUID;
  menu.style.cssText = `position: fixed; left: ${evt.clientX}px; top: ${evt.clientY}px;`;
  
  const element = target;
  
  const removeMenu = () => {
    if (document.body.contains(menu)) { document.body.removeChild(menu); }
    document.removeEventListener('click', removeMenu);
  };
  
  for (let item of options.menuItems) {
    let child: HTMLElement;
    if (typeof item === "string") child = addDivider(item);
    else {
      child = addItem(item.text, () => {
        item.onclick(explorer, element);
        document.body.removeChild(menu);
        removeMenu();
      })
    }
    menu.appendChild(child);
  }
 
  document.body.appendChild(menu);
  
  document.addEventListener('click', removeMenu);
  document.addEventListener('auxclick', removeMenu);
}

const addItem = (text: string, onClick: () => void) => {
  const item = document.createElement('button');
  item.style.display = "block";
  item.textContent = text;
  item.classList.add(HtmlUtils.MENUBUTTONCLASS)
  
  item.addEventListener('click', onClick);
  
  return item;
};

const addDivider = (text: string): HTMLElement => {
  const span = document.createElement("hr");
  span.classList.add(HtmlUtils.MENUDIVIDERCLASS)
  span.dataset.name = text;
  
  return span
}