"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandContextValue {
  search: string;
  setSearch: (value: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  itemCount: number;
  registerItem: () => number;
  unregisterItem: (id: number) => void;
}

const CommandContext = React.createContext<CommandContextValue>({
  search: "",
  setSearch: () => {},
  selectedIndex: 0,
  setSelectedIndex: () => {},
  itemCount: 0,
  registerItem: () => 0,
  unregisterItem: () => {},
});

// ─── Command Root ─────────────────────────────────────────────────────────────

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const [search, setSearch] = React.useState("");
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const counterRef = React.useRef(0);
    const [itemCount, setItemCount] = React.useState(0);

    const registerItem = React.useCallback(() => {
      const id = counterRef.current++;
      setItemCount((c) => c + 1);
      return id;
    }, []);

    const unregisterItem = React.useCallback((_id: number) => {
      setItemCount((c) => Math.max(0, c - 1));
    }, []);

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % Math.max(itemCount, 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1));
        } else if (e.key === "Escape") {
          onClose?.();
        }
      },
      [itemCount, onClose]
    );

    return (
      <CommandContext.Provider
        value={{ search, setSearch, selectedIndex, setSelectedIndex, itemCount, registerItem, unregisterItem }}
      >
        <div
          ref={ref}
          className={cn(
            "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    );
  }
);
Command.displayName = "Command";

// ─── Command Dialog ───────────────────────────────────────────────────────────

interface CommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function CommandDialog({ children, open, onOpenChange }: CommandDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-xl max-w-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ─── Command Input ────────────────────────────────────────────────────────────

interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onValueChange?: (value: string) => void;
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, onValueChange, ...props }, ref) => {
    const { search, setSearch } = React.useContext(CommandContext);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);
      onValueChange?.(value);
    };

    return (
      <div className="flex items-center border-b border-border px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={ref}
          value={search}
          onChange={handleChange}
          className={cn(
            "flex h-11 w-full bg-transparent py-3 text-sm text-foreground outline-none",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {search && (
          <button
            onClick={() => { setSearch(""); onValueChange?.(""); }}
            className="ml-2 rounded-sm text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
CommandInput.displayName = "CommandInput";

// ─── Command List ─────────────────────────────────────────────────────────────

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    role="listbox"
    {...props}
  />
));
CommandList.displayName = "CommandList";

// ─── Command Empty ────────────────────────────────────────────────────────────

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-6 text-center text-sm text-muted-foreground", className)}
    {...props}
  />
));
CommandEmpty.displayName = "CommandEmpty";

// ─── Command Group ────────────────────────────────────────────────────────────

interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("overflow-hidden p-1 text-foreground", className)}
      role="group"
      {...props}
    >
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
);
CommandGroup.displayName = "CommandGroup";

// ─── Command Separator ────────────────────────────────────────────────────────

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 h-px bg-border my-1", className)}
    {...props}
  />
));
CommandSeparator.displayName = "CommandSeparator";

// ─── Command Item ─────────────────────────────────────────────────────────────

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  disabled?: boolean;
  onSelect?: (value: string) => void;
  value?: string;
  keywords?: string[];
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, disabled, onSelect, value, children, ...props }, ref) => {
    const { registerItem, unregisterItem, selectedIndex, setSelectedIndex } =
      React.useContext(CommandContext);

    const idRef = React.useRef<number>(-1);
    const [myIndex, setMyIndex] = React.useState<number>(-1);

    React.useEffect(() => {
      const id = registerItem();
      idRef.current = id;
      setMyIndex(id);
      return () => unregisterItem(id);
    }, [registerItem, unregisterItem]);

    const isSelected = myIndex === selectedIndex;

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition-colors",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          isSelected && "bg-secondary text-secondary-foreground",
          !isSelected && "hover:bg-secondary/50",
          className
        )}
        data-disabled={disabled ? true : undefined}
        onMouseEnter={() => !disabled && setSelectedIndex(myIndex)}
        onClick={() => {
          if (!disabled) {
            onSelect?.(value ?? "");
          }
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CommandItem.displayName = "CommandItem";

// ─── Command Shortcut ─────────────────────────────────────────────────────────

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
};
