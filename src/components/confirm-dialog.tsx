"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AlertDialog } from "radix-ui";

/**
 * Confirmation for destructive actions: a Radix alert dialog. The backdrop fades in from a blur, and the dialog
 * flips down from the top as it comes into focus. The motion is modeled on Animate UI's alert dialog (animate-ui.com)
 * but written here, not copied: Animate UI's license (MIT + Commons Clause) doesn't fit this AGPL project.
 * Focus starts on Cancel; Escape cancels.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
        <AnimatePresence>
          {open && (
            <AlertDialog.Portal forceMount>
              <AlertDialog.Overlay asChild forceMount>
                <motion.div
                  key="overlay"
                  className="fixed inset-0 z-50 bg-black/40"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                />
              </AlertDialog.Overlay>
              <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
                <AlertDialog.Content asChild forceMount>
                  <motion.div
                    key="content"
                    className="pointer-events-auto w-full max-w-sm rounded-lg border border-line bg-surface p-5 text-ink shadow-[var(--lift-shadow)]"
                    initial={{ opacity: 0, filter: "blur(4px)", transform: "perspective(500px) rotateX(-20deg) scale(0.8)" }}
                    animate={{ opacity: 1, filter: "blur(0px)", transform: "perspective(500px) rotateX(0deg) scale(1)" }}
                    exit={{ opacity: 0, filter: "blur(4px)", transform: "perspective(500px) rotateX(-20deg) scale(0.8)" }}
                    transition={{ type: "spring", stiffness: 150, damping: 25 }}
                  >
                    <AlertDialog.Title className="text-xl">{title}</AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-muted">{description}</AlertDialog.Description>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <AlertDialog.Cancel className="btn">Cancel</AlertDialog.Cancel>
                      <AlertDialog.Action className="btn-primary" onClick={onConfirm}>
                        {confirmLabel}
                      </AlertDialog.Action>
                    </div>
                  </motion.div>
                </AlertDialog.Content>
              </div>
            </AlertDialog.Portal>
          )}
        </AnimatePresence>
      </AlertDialog.Root>
    </MotionConfig>
  );
}
