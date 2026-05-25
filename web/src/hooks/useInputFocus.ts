import { useState, useCallback } from "react";

interface UseInputFocusOptions {
  /** Focus border color — defaults to primary */
  borderFocus?: string;
  /** Blur border color — defaults to border */
  borderBlur?: string;
}

interface UseInputFocusReturn {
  borderColor: string;
  handleFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const DEFAULT_FOCUS = "hsl(var(--primary) / 0.45)";
const DEFAULT_BLUR = "hsl(var(--border) / 0.6)";

export function useInputFocus(opts: UseInputFocusOptions = {}): UseInputFocusReturn {
  const [borderColor, setBorderColor] = useState(DEFAULT_BLUR);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const color = opts.borderFocus ?? DEFAULT_FOCUS;
      e.currentTarget.style.borderColor = color;
      setBorderColor(color);
    },
    [opts.borderFocus],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const color = opts.borderBlur ?? DEFAULT_BLUR;
      e.currentTarget.style.borderColor = color;
      setBorderColor(color);
    },
    [opts.borderBlur],
  );

  return { borderColor, handleFocus, handleBlur };
}
