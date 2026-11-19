import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Delete/Backspace removes the selected item; Escape clears selection. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const { selection, removeCellImage, removeText, clearSelection } =
        useEditorStore.getState();

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selection) {
        event.preventDefault();
        if (selection.kind === 'cell') removeCellImage(selection.index);
        else removeText(selection.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
