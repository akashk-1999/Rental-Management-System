import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Users,
  Home,
  UserCheck,
  CreditCard,
  UserCircle,
  KeyRound,
  LogOut,
  Menu,
  X,
  Pin,
  PinOff,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Users", to: "/users", icon: Users },
  { label: "Properties", to: "/properties", icon: Home },
  { label: "Tenants", to: "/tenants", icon: UserCheck },
  { label: "Payments", to: "/payments", icon: CreditCard },
];

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

function getInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

interface NavListProps {
  onNavigate?: () => void;
  expanded?: boolean;
}

function NavList({ onNavigate, expanded = true }: NavListProps) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end
            title={item.label}
            aria-label={item.label}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border-l-4 py-2 text-sm transition-colors duration-150 ease-in-out ${FOCUS_RING} ${
                expanded ? "px-3" : "justify-center px-2"
              } ${
                isActive
                  ? "nav-fluid-active border-indigo-600 font-semibold text-indigo-700 dark:text-indigo-300"
                  : "border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors duration-150 ease-in-out ${
                    isActive ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400 dark:text-slate-500"
                  }`}
                  aria-hidden="true"
                />
                {expanded && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Move focus onto the first menu item whenever the dropdown opens.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const firstItem = profileMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [profileMenuOpen]);

  // Close the mobile nav drawer if the viewport grows back to desktop size.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setIsMobileNavOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setProfileMenuOpen(true);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      profileMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
        break;
      case "ArrowUp":
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case "Escape":
        event.preventDefault();
        setProfileMenuOpen(false);
        profileButtonRef.current?.focus();
        break;
      case "Tab":
        setProfileMenuOpen(false);
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar: collapsed to icons by default, expands on hover, click the pin to keep it open */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-300 ease-in-out lg:flex dark:border-slate-800 dark:bg-slate-900 ${
          isSidebarExpanded ? "w-60" : "w-16"
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          {isSidebarExpanded && (
            <>
              <span className="flex-1 truncate text-lg font-bold text-slate-900 tracking-tight dark:text-white">RMS</span>
              <button
                type="button"
                onClick={() => setIsSidebarPinned((pinned) => !pinned)}
                aria-label={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
                aria-pressed={isSidebarPinned}
                title={isSidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
                className={`flex-shrink-0 rounded-lg p-1.5 transition-colors duration-150 ease-in-out ${FOCUS_RING} ${
                  isSidebarPinned
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                }`}
              >
                {isSidebarPinned ? (
                  <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </>
          )}
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
          <NavList expanded={isSidebarExpanded} />
        </nav>
      </aside>

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${isMobileNavOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isMobileNavOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ease-in-out ${
            isMobileNavOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`relative flex h-full w-64 max-w-[80vw] flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-slate-900 ${
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold text-slate-900 tracking-tight dark:text-white">RMS</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close menu"
              className={`rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 ${FOCUS_RING}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
            <NavList onNavigate={() => setIsMobileNavOpen(false)} />
          </nav>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open menu"
              className={`flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden ${FOCUS_RING}`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white lg:hidden">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <h1 className="hidden truncate text-base font-semibold text-slate-900 dark:text-white sm:block">
              Rental Management System
            </h1>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${
                theme === "dark" ? "border-sky-400/40" : "border-slate-200"
              } ${FOCUS_RING}`}
            >
              <Sun
                className={`absolute h-4 w-4 transition-all duration-300 ease-in-out ${
                  theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
                aria-hidden="true"
              />
              <Moon
                className={`absolute h-4 w-4 text-sky-400 transition-all duration-300 ease-in-out ${
                  theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                }`}
                aria-hidden="true"
              />
            </button>

            <div className="relative" ref={profileMenuRef}>
            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              onKeyDown={handleTriggerKeyDown}
              id="profile-menu-trigger"
              title="Account menu"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-controls="profile-menu"
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ${FOCUS_RING}`}
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm dark:bg-indigo-500/20 dark:text-indigo-300">
                {getInitials(user?.FullName)}
              </span>
              {user?.FullName && <span className="hidden sm:inline">{user.FullName}</span>}
            </button>

            {profileMenuOpen && (
              <div
                id="profile-menu"
                role="menu"
                aria-labelledby="profile-menu-trigger"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 ${FOCUS_RING}`}
                >
                  <UserCircle className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  My Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 ${FOCUS_RING}`}
                >
                  <KeyRound className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  Change Password
                </button>

                <hr className="my-1 border-slate-200 dark:border-slate-700" />

                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 transition-colors duration-150 ease-in-out hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 ${FOCUS_RING}`}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
