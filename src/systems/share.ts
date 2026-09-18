/**
 * Hand a result to the outside world: the native share sheet where there is
 * one (phones), the clipboard otherwise. Resolves to how it went so the scene
 * can toast or fall back to showing the text.
 */
export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareText(text: string, title = 'Rug or Not?'): Promise<ShareOutcome> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
    canShare?: (data: { title?: string; text?: string }) => boolean;
  };
  // Only phones and tablets have a share sheet worth using; desktops go to the clipboard.
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  if (coarse && nav.share && (!nav.canShare || nav.canShare({ title, text }))) {
    try {
      await nav.share({ title, text });
      return 'shared';
    } catch {
      /* dismissed or unsupported payload: fall through to the clipboard */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
