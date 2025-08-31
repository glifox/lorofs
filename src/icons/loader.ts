import { LoroTreeNode } from "loro-crdt";


type IconTheme = {
    name: string;
    appearance: 'light' | 'dark';
    directory_icons: { collapsed: string; expanded: string };
    file_stems: { [key: string]: string };
    file_suffixes: { [key: string]: string };
    file_icons: { [key: string]: { path: string } };
};

export class IconProvider {
    #theme: IconTheme;
    #fileSuffixes: [string, string][];
    #fileStems: [string, string][];

    private constructor(iconConfig: { themes: IconTheme[] }, themeName: string) {
        const theme = iconConfig.themes.find(t => t.name === themeName);
        if (!theme) {
            throw new Error(`Icon theme "${themeName}" not found.`);
        }
        this.#theme = theme;

        this.#fileSuffixes = Object.entries(this.#theme.file_suffixes).sort(
            (a, b) => b[0].length - a[0].length
        );
        this.#fileStems = Object.entries(this.#theme.file_stems);
    }
    
    static new(iconConfig: { themes: IconTheme[] }, themeName: string) {
      const fs = new IconProvider(iconConfig, themeName);
      return (node: LoroTreeNode, open: boolean): HTMLElement | undefined | null => {
        const element = document.createElement("img");
        element.width = 16;
        element.height = 16;
        element.src = fs.getIconPath(node, open);
        
        return element;
      }
    }

    /**
     * Obtiene la ruta del icono para un nodo específico del árbol LoroFS.
     * @param node El nodo del árbol.
     * @param isExpanded Si el nodo (directorio) está expandido.
     * @returns La ruta del archivo SVG del icono.
     */
     private getIconPath(node: LoroTreeNode, open: boolean = false): string {
        const type = node.data.get('type') as 'file' | 'directory';
        
        if (type === 'directory') {
            return open 
                ? this.#theme.directory_icons.expanded 
                : this.#theme.directory_icons.collapsed;
        }

        const fileName = node.data.get('name') as string;
        if (!fileName) return this.#getDefaultFileIcon();

        // 1. Coincidencia por nombre completo (stem)
        const stemMatch = this.#fileStems.find(([stem]) => stem === fileName);
        if (stemMatch) {
            const iconName = stemMatch[1];
            return this.#theme.file_icons[iconName]?.path || this.#getDefaultFileIcon();
        }

        // 2. Coincidencia por sufijo (extensión)
        const suffixMatch = this.#fileSuffixes.find(([suffix]) => fileName.endsWith(suffix));
        if (suffixMatch) {
            const iconName = suffixMatch[1];
            return this.#theme.file_icons[iconName]?.path || this.#getDefaultFileIcon();
        }

        // 3. Icono por defecto
        return this.#getDefaultFileIcon();
    }

    #getDefaultFileIcon(): string {
        return this.#theme.file_icons['text']?.path;
    }
}
