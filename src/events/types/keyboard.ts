import { Explorer } from "../../explorer/explorer";
import { actions } from "../actions";

export const keydown = (event: KeyboardEvent, explorer: Explorer) => {
  
  // Handle keyboard shortcuts for file/folder creation
  if (event.shiftKey) {
    switch (event.key.toLowerCase()) {
      case 'f': event.preventDefault();
        event.stopPropagation();
        actions.NewFile(event, explorer);
        break;
      case 'd': event.preventDefault();
        event.stopPropagation();
        actions.NewDirectory(event, explorer);
        break;
      default: break;
    }
  }
  
  // Handle context-specific keys
  switch (event.key) {
    case 'Enter':
    case 'ArrowRight':
      actions.OpenFileOrDirectory(event, explorer, event.key === "Enter");
      break;
    case 'ArrowLeft':
      actions.CloseSelfOrParentDirectory(event, explorer);
      break;
    case 'Delete':
    case 'Backspace':
      if (event.ctrlKey || event.metaKey) {
        // actions.(event, explorer, target);
      }
      break;
    case 'F2': 
      actions.Rename(event,explorer);
      break;
    case 'ArrowDown':
      actions.FocusNext(event, explorer);
      break;
    case 'ArrowUp':
      actions.FocusPrevious(event, explorer);
      break;
    default: break;
  }
};
