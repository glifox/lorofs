import { LoroTreeNode } from "loro-crdt";

const FILE_SVG = [
  '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />',
  '<path d="M14 2v4a2 2 0 0 0 2 2h4" />',
  '<path d="m8 12.5-5 5" />',
  '<path d="m3 12.5 5 5" />',
];

const CLOSE_FOLDER = [
  '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  '<path d="m9.5 10.5 5 5" />',
  '<path d="m14.5 10.5-5 5" />',
];

const OPEN_FOLDER = [
  '<path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>',
  '<circle cx="14" cy="15" r="1" />',
];

const SVG = `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-folder-x-icon lucide-folder-x"
></svg>`;


export const defaultIcon = (node: LoroTreeNode, open: boolean): HTMLSpanElement => { 
  const file = node.data.get("type") === "file";
  const wraper = document.createElement("span");
  wraper.innerHTML = SVG;
  
  const svg = wraper.firstElementChild as HTMLElement;
  if (file) svg.innerHTML = FILE_SVG.join("\n");
  else if (open) svg.innerHTML = OPEN_FOLDER.join("\n");
  else svg.innerHTML = CLOSE_FOLDER.join("\n");
  
  return svg
}
