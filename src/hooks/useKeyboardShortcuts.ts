import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { getCurrentDuration, usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import { getActiveItem } from '@/utils/timeline';

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Space plays/pauses the timeline, Delete/Backspace removes the selected item,
 * Escape clears the selection.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      // While cropping, only Escape (cancel) does anything.
      if (useUiStore.getState().cropRect) {
        if (event.key === 'Escape') useUiStore.getState().setCropRect(null);
        return;
      }
      const { selection, cells, removeItem, removeText, clearSelection } =
        useEditorStore.getState();

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }

      if (event.key === ' ' && getCurrentDuration() > 0) {
        // Buttons also react to Space; don't let a focused button fire twice.
        event.preventDefault();
        usePlaybackStore.getState().toggle();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selection) {
        event.preventDefault();
        if (selection.kind === 'text') {
          removeText(selection.id);
          return;
        }
        const item = getActiveItem(cells[selection.index], usePlaybackStore.getState().currentTime);
        if (item) removeItem(selection.index, item.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
