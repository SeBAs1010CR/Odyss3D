import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/admin/utils";

/* ============ Spinner ============ */

export function Spinner({ size = "md" }: { size?: "md" | "lg" }) {
  return <div className={cn("spinner", size === "lg" && "spinner-lg")} aria-label="Cargando" />;
}

export function LoadingBlock({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="loading-block">
      <Spinner size="lg" />
      <span>{text}</span>
    </div>
  );
}

/* ============ Botón ============ */

type BtnVariant = "primary" | "ghost" | "danger";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "md" | "sm";
  loading?: boolean;
  block?: boolean;
}

export function Btn({ variant = "primary", size = "md", loading, block, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        "btn-app",
        variant === "primary" && "btn-app-primary",
        variant === "ghost" && "btn-app-ghost",
        variant === "danger" && "btn-app-danger",
        size === "sm" && "btn-app-sm",
        block && "btn-block",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ============ Campos ============ */

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
      {hint && <span className="uploading-note">{hint}</span>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return <input className={cn("input", className)} {...rest} />;
}

export function InputMoney({ suffix = "₡", className, ...rest }: InputProps & { suffix?: string }) {
  return (
    <span className="input-with-suffix">
      <Input className={className} {...rest} />
      <span className="suffix">{suffix}</span>
    </span>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function SelectBox({ className, children, ...rest }: SelectProps) {
  return (
    <select className={cn("select", className)} {...rest}>
      {children}
    </select>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...rest }: TextAreaProps) {
  return <textarea className={cn("textarea", className)} {...rest} />;
}

/* ============ Card ============ */

export function Card({ title, actions, className, children }: { title?: ReactNode; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={cn("card", className)}>
      {(title || actions) && (
        <div className="card-head">
          {title && <div className="card-title">{title}</div>}
          {actions && <div className="admin-page-actions">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="admin-page-head">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        {sub && <p className="admin-page-sub">{sub}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}

/* ============ Modal ============ */

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Eliminar", busy, onCancel, onConfirm }: { open: boolean; title: string; message: ReactNode; confirmLabel?: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Btn>
        </>
      }
    >
      <p className="error-text" style={{ lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

/* ============ Empty ============ */

export function EmptyState({ icon, title, text }: { icon?: ReactNode; title: string; text?: string }) {
  return (
    <div className="empty-state">
      {icon}
      <div className="empty-state-title">{title}</div>
      {text && <div className="empty-state-text">{text}</div>}
    </div>
  );
}