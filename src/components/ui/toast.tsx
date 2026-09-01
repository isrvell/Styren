"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = "default" | "success" | "error" | "warning";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: (options: Omit<ToastData, "id">) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((options: Omit<ToastData, "id">): string => {
    const id = Math.random().toString(36).slice(2, 9);
    const duration = options.duration ?? 4000;
    setToasts((prev) => [...prev, { ...options, id }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

interface ToastViewportProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  { icon: React.ElementType; iconClass: string; className: string }
> = {
  default: {
    icon: Info,
    iconClass: "text-foreground",
    className: "bg-card border-border text-foreground",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-success",
    className: "bg-card border-border text-foreground",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-destructive",
    className: "bg-card border-border text-foreground",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    className: "bg-card border-border text-foreground",
  },
};

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const variant = toast.variant ?? "default";
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-md border p-4 shadow-lg",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-200",
        config.className
      )}
      role="alert"
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold leading-snug">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Standalone Toast component (for declarative use) ─────────────────────────

interface ToastComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

const ToastComponent = React.forwardRef<HTMLDivElement, ToastComponentProps>(
  ({ className, variant = "default", title, description, onDismiss, ...props }, ref) => {
    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full items-start gap-3 rounded-md border p-4 shadow-lg",
          config.className,
          className
        )}
        role="alert"
        {...props}
      >
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass)} />
        <div className="flex-1 min-w-0">
          {title && <p className="text-sm font-semibold leading-snug">{title}</p>}
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
ToastComponent.displayName = "Toast";

export {
  ToastProvider,
  useToast,
  ToastComponent as Toast,
  ToastViewport,
  type ToastData,
  type ToastVariant,
};
