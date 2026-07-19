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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-200">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold text-slate-900 tracking-tight">RMS</span>
        </div>

        <nav aria-label="Primary" className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors duration-150 ease-in-out ${FOCUS_RING} ${
                      isActive
                        ? "border-indigo-600 bg-indigo-50 font-semibold text-indigo-700"
                        : "border-transparent font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-4 w-4 flex-shrink-0 transition-colors duration-150 ease-in-out ${
                          isActive ? "text-indigo-600" : "text-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200">
          <h1 className="text-base font-semibold text-slate-900">Rental Management System</h1>

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
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 ${FOCUS_RING}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                {getInitials(user?.FullName)}
              </span>
              {user?.FullName && <span>{user.FullName}</span>}
            </button>

            {profileMenuOpen && (
              <div
                id="profile-menu"
                role="menu"
                aria-labelledby="profile-menu-trigger"
                onKeyDown={handleMenuKeyDown}
                className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 ${FOCUS_RING}`}
                >
                  <UserCircle className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  My Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => setProfileMenuOpen(false)}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors duration-150 ease-in-out hover:bg-slate-100 ${FOCUS_RING}`}
                >
                  <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Change Password
                </button>

                <hr className="my-1 border-slate-200" />

                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-2.5 px-4 py-2 text-sm text-rose-600 transition-colors duration-150 ease-in-out hover:bg-rose-50 ${FOCUS_RING}`}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
