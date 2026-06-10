"use client";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { IconMenu2 } from "@tabler/icons-react";

// --- Context to manage Open/Close state across components ---
interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// --- MAIN SIDEBAR COMPONENT ---
export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  // If user didn't provide state, we create internal state (optional)
  const [openState, setOpenState] = useState(false);
  const _open = open !== undefined ? open : openState;
  const _setOpen = setOpen !== undefined ? setOpen : setOpenState;

  return (
    <SidebarContext.Provider value={{ open: _open, setOpen: _setOpen, animate }}>
      {/* Desktop Sidebar (Hover to Expand) */}
      <div
        className={cn(
          "h-full hidden md:flex flex-col bg-transparent flex-shrink-0",
          _open ? "w-[180px]" : "w-[60px]",
          "transition-all duration-300 ease-in-out"
        )}
        onMouseEnter={() => _setOpen(true)}
        onMouseLeave={() => _setOpen(false)}
      >
        {children}
      </div>

      {/* Mobile Sidebar — two separate elements so the fixed drawer is NOT a
          descendant of the backdrop-blur bar. backdrop-filter creates a new
          CSS containing block, which would make `position: fixed` children
          positioned relative to the bar (56px) instead of the viewport. */}

      {/* 1. The visible header bar (no children that need viewport-fixed positioning) */}
      <div className="flex md:hidden h-14 w-full flex-shrink-0 bg-black/60 backdrop-blur-md px-4 items-center justify-between z-20">
        <div className="text-white font-bold text-lg">Menu</div>
        {/* Always show ≡ — tapping it toggles the panel open/closed */}
        <IconMenu2
          className="text-white cursor-pointer"
          onClick={() => _setOpen(v => !v)}
        />
      </div>

      {/* 2. The drawer — sibling of the bar so fixed positioning is viewport-relative */}
      <div className="md:hidden">
        <AnimatePresence>
          {_open && (
            <>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[699]"
                onClick={() => _setOpen(false)}
              />
              <motion.div
                key="drawer-panel"
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-x-0 top-14 bg-black z-[700] flex flex-col p-4 w-full max-h-[75%] overflow-y-auto shadow-2xl rounded-b-2xl"
              >
                {children}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </SidebarContext.Provider>
  );
};

// --- SIDEBAR BODY (Container for content) ---
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    // FIX: Changed 'div' to 'motion.div' to accept motion props
    <motion.div
      className={cn(
        "h-full flex flex-col w-full overflow-hidden py-4",
        props.className
      )}
      {...props}
    >
      {props.children}
    </motion.div>
  );
};

// --- SIDEBAR LINK (The individual menu items) ---
interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

// FIX: Extended LinkProps to avoid 'any'
interface SidebarLinkProps extends Omit<React.ComponentProps<typeof Link>, "to"> {
  link: Links;
  className?: string;
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: SidebarLinkProps) => {
  const { open, animate } = useSidebar();
  const location = useLocation();
  const isActive = location.pathname === link.href;

  return (
    <Link
      to={link.href}
      className={cn(
        "flex items-center justify-start gap-4 group/sidebar py-2 px-3 rounded-md transition-all duration-200",
        // Hover Effect
        "hover:bg-neutral-800",
        // Active State Highlight
        isActive ? "bg-neutral-800 border-l-4 border-blue-500" : "border-l-4 border-transparent",
        className
      )}
      {...props}
    >
      {/* Icon (Always Visible) */}
      <div className={cn("flex-shrink-0 text-neutral-200 group-hover/sidebar:text-white transition-colors")}>
        {link.icon}
      </div>

      {/* Label (Animates In/Out) */}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-200 text-sm group-hover/sidebar:text-white transition-colors whitespace-pre font-medium"
      >
        {link.label}
      </motion.span>
    </Link>
  );
};