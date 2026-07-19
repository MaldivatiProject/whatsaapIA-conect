"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

/**
 * Promise-based replacement for window.confirm(), backed by <ConfirmDialog />.
 * `await confirm(...)` resolves to true/false exactly like window.confirm did,
 * but renders a themed dialog instead of a blocking native alert.
 *
 * Usage:
 *   const { confirm, confirmDialogProps } = useConfirmDialog();
 *   if (await confirm({ title: "...", variant: "destructive" })) { ... }
 *   return <>...<ConfirmDialog {...confirmDialogProps} /></>;
 */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  return {
    confirm,
    confirmDialogProps: {
      open: options !== null,
      onOpenChange: (open: boolean) => {
        if (!open) settle(false);
      },
      title: options?.title ?? "",
      description: options?.description,
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
      variant: options?.variant,
      onConfirm: () => settle(true),
    },
  };
}
