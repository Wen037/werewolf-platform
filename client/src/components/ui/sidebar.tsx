"use client";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";

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

      {/* Mobile Sidebar (Hamburger Menu) — fixed-height bar, NOT h-full, so it
          doesn't push the page content off-screen on small viewports */}
        <div className="flex md:hidden h-14 w-full flex-shrink-0 bg-black/60 backdrop-blur-md px-4 items-center justify-between z-20">
        <div className="text-white font-bold text-lg">Menu</div>
        <IconMenu2
          className="text-white cursor-pointer"
          onClick={() => _setOpen(true)}
        />
        {/* Mobile Drawer Overlay */}
        <AnimatePresence>
          {_open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "fixed inset-0 bg-black z-[100] flex flex-col p-4 w-full h-full"
              )}
            >
              <div
                className="absolute right-4 top-4 cursor-pointer"
                onClick={() => _setOpen(false)}
              >
                <IconX className="text-white" />
              </div>
              {children}
            </motion.div>
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