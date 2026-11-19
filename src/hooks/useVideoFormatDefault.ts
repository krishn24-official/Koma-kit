import { useEffect, useRef } from 'react';
import { useTimelineDuration } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';

/**
 * Switches export to MP4 when the template gets a timeline (first video or scheduled
 * item), and back to PNG when the timeline goes away. Choosing a format by hand
 * still works: this only runs when the timeline appears or disappears.
 */
export function useVideoFormatDefault() {
  const hasTimeline = useTimelineDuration() > 0;
  const previous = useRef(hasTimeline);

  useEffect(() => {
    if (previous.current === hasTimeline) return;
    previous.current = hasTimeline;

    const { exportOptions, updateExportOptions } = useEditorStore.getState();
    if (hasTimeline && exportOptions.format !== 'mp4') updateExportOptions({ format: 'mp4' });
    if (!hasTimeline && exportOptions.format === 'mp4') updateExportOptions({ format: 'png' });
  }, [hasTimeline]);
}
