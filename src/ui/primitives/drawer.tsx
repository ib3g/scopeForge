"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function Drawer({ open, onOpenChange, eyebrow, title, description, closeLabel, children, className = "" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: string;
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="drawer-overlay"/>
      <Dialog.Content className={`polish-drawer ${className}`} aria-describedby={description ? undefined : undefined}>
        <header className="drawer-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div><Dialog.Close className="btn btn-ghost btn-icon" aria-label={closeLabel}><X size={18}/></Dialog.Close></header>
        <div className="drawer-content">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function Modal({ open, onOpenChange, eyebrow, title, description, closeLabel, children, footer, destructive = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  description?: string;
  closeLabel: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  destructive?: boolean;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="drawer-overlay"/>
      <Dialog.Content className={`polish-modal ${destructive ? "modal-destructive" : ""}`}>
        <header className="drawer-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div><Dialog.Close className="btn btn-ghost btn-icon" aria-label={closeLabel}><X size={18}/></Dialog.Close></header>
        {children && <div className="modal-content">{children}</div>}
        {footer && <footer className="modal-footer">{footer}</footer>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
