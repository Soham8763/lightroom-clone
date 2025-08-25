import { useEffect, useCallback } from 'react';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsProps {
  shortcuts: ShortcutAction[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsProps) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isContentEditable = target.contentEditable === 'true';
    
    if (['input', 'textarea', 'select'].includes(tagName) || isContentEditable) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;
      const metaMatch = !!shortcut.meta === event.metaKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress, enabled]);

  return null;
};

// Predefined shortcut sets for common actions
export const editorShortcuts = {
  save: { key: 's', ctrl: true, description: 'Save project' },
  undo: { key: 'z', ctrl: true, description: 'Undo last action' },
  redo: { key: 'y', ctrl: true, description: 'Redo last action' },
  export: { key: 'e', ctrl: true, description: 'Export image' },
  zoomIn: { key: '=', ctrl: true, description: 'Zoom in' },
  zoomOut: { key: '-', ctrl: true, description: 'Zoom out' },
  zoomFit: { key: '0', ctrl: true, description: 'Fit to screen' },
  crop: { key: 'r', description: 'Switch to crop tool' },
  light: { key: '1', description: 'Switch to light adjustments' },
  color: { key: '2', description: 'Switch to color adjustments' },
  effects: { key: '3', description: 'Switch to effects' },
  toggleFullscreen: { key: 'f', description: 'Toggle fullscreen' },
  resetAdjustments: { key: 'r', ctrl: true, description: 'Reset all adjustments' },
  copyAdjustments: { key: 'c', ctrl: true, alt: true, description: 'Copy adjustments' },
  pasteAdjustments: { key: 'v', ctrl: true, alt: true, description: 'Paste adjustments' },
};

export const dashboardShortcuts = {
  upload: { key: 'u', ctrl: true, description: 'Upload images' },
  search: { key: 'f', ctrl: true, description: 'Focus search' },
  selectAll: { key: 'a', ctrl: true, description: 'Select all projects' },
  delete: { key: 'Delete', description: 'Delete selected projects' },
  newFolder: { key: 'n', ctrl: true, shift: true, description: 'Create new folder' },
  refresh: { key: 'F5', description: 'Refresh gallery' },
  gridView: { key: 'g', description: 'Switch to grid view' },
  listView: { key: 'l', description: 'Switch to list view' },
};
