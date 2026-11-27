import { ImagePlus, LayoutTemplate, Sparkles, X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEditorStore } from '@/store/useEditorStore';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useUiStore } from '@/store/useUiStore';

const SEEN_KEY = 'koma-welcome-seen';

function readSeen(): boolean {
  try {
    // Links from the search pages (?open=…) go straight to a tool.
    if (new URL(window.location.href).searchParams.has('open')) return true;
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function Choice({
  icon,
  title,
  text,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-left transition-colors hover:border-brand-500 [&_svg]:size-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-neutral-400">{text}</span>
      </span>
    </button>
  );
}

/**
 * First-visit card over the empty editor: says what Koma Kit is for and offers the
 * quickest ways to start. Shown once (remembered in this browser).
 */
export function WelcomeCard() {
  const [seen, setSeen] = useState(readSeen);
  const empty = useEditorStore((s) => Object.keys(s.cells).length === 0 && s.elements.length === 0);
  const { uploadMany } = useMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  if (seen || !empty) return null;

  const close = () => {
    setSeen(true);
    try {
      window.localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Private mode etc.: it just shows again next time.
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-labelledby="welcome-title"
        className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl"
      >
        <div className="absolute top-2 right-2">
          <IconButton label="Close" icon={<X />} onClick={close} />
        </div>
        <Logo />
        <h2 id="welcome-title" className="mt-4 text-xl leading-tight font-bold text-white">
          Make anime posts, collages <span className="text-brand-400">&amp; video edits</span>
        </h2>
        <p className="mt-1.5 text-sm text-neutral-400">
          Free, no sign-up, no watermark. Your pictures never leave your device.
        </p>
        <div className="mt-4 space-y-2">
          <Choice
            icon={<LayoutTemplate />}
            title="Start from a template"
            text="Ready-made layouts, just add your pictures"
            onClick={() => {
              close();
              useUiStore.setState({ activePanel: 'templates', mobilePanelOpen: true });
            }}
          />
          <Choice
            icon={<ImagePlus />}
            title="Add pictures or videos"
            text="They fill the boxes in order"
            onClick={() => inputRef.current?.click()}
          />
          <Choice
            icon={<Sparkles />}
            title="Photo mosaic"
            text="One big picture made of many small ones"
            onClick={() => {
              close();
              void useMosaicStore.getState().open();
            }}
          />
        </div>
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full py-1.5 text-center text-sm text-neutral-400 hover:text-white"
        >
          Start blank
        </button>
        <HiddenFileInput
          ref={inputRef}
          multiple
          onFiles={(files) => {
            close();
            void uploadMany(files);
          }}
        />
      </div>
    </div>
  );
}
