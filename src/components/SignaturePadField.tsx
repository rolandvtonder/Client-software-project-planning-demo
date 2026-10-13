import SignaturePad from 'signature_pad';
import {useEffect, useImperativeHandle, useRef, type Ref} from 'react';

export type SignatureHandle = {isEmpty: () => boolean; toDataURL: () => string; clear: () => void};

/** Finger signature on a white pad with a gold baseline. Keeps the drawing on resize/rotate. */
export function SignaturePadField({ref, onChange}: {ref?: Ref<SignatureHandle>; onChange?: (empty: boolean) => void}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const p = new SignaturePad(c, {penColor: '#1c2725', minWidth: 1, maxWidth: 2.8, backgroundColor: 'rgba(0,0,0,0)'});
    pad.current = p;
    const resize = () => {
      const data = p.toData();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      c.width = c.offsetWidth * ratio;
      c.height = c.offsetHeight * ratio;
      c.getContext('2d')!.scale(ratio, ratio);
      p.clear();
      p.fromData(data);
    };
    resize();
    window.addEventListener('resize', resize);
    p.addEventListener('endStroke', () => onChange?.(p.isEmpty()));
    return () => {
      window.removeEventListener('resize', resize);
      p.off();
    };
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    isEmpty: () => pad.current?.isEmpty() ?? true,
    toDataURL: () => pad.current?.toDataURL('image/png') ?? '',
    clear: () => {
      pad.current?.clear();
      onChange?.(true);
    },
  }));

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-[var(--radius-card)] border-2 border-control/60 bg-white landscape:max-md:h-40">
      <canvas ref={canvas} className="absolute inset-0 size-full touch-none" aria-label="Signature pad — sign with your finger" role="img" />
      <div className="pointer-events-none absolute inset-x-6 bottom-12 border-b-2 border-gold" aria-hidden />
      <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[14px] text-muted" aria-hidden>
        Sign above the line
      </p>
    </div>
  );
}
