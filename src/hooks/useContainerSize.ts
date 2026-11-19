import { useLayoutEffect, useState, type RefObject } from 'react';
import type { Size } from '@/types';

/** Tracks an element's size with ResizeObserver. */
export function useContainerSize<T extends HTMLElement>(ref: RefObject<T>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
