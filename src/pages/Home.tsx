import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PackageCheck,
  CreditCard,
  Users,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import heroImage from "../assets/jyoti-bhandar-hero.png";
import { useAuth } from "../context/AuthContext";

interface QuickLink {
  label: string;
  to: string;
  icon: LucideIcon;
  iconAccent: string;
  hoverAccent: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    iconAccent: "bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]",
    hoverAccent: "hover:border-[#2a78d6]/40 hover:bg-[#2a78d6]/5 dark:hover:border-[#3987e5]/40 dark:hover:bg-[#3987e5]/10",
  },
  {
    label: "Rentals",
    to: "/rentals",
    icon: ClipboardList,
    iconAccent: "bg-[#1baf7a]/10 text-[#1baf7a] dark:bg-[#199e70]/15 dark:text-[#199e70]",
    hoverAccent: "hover:border-[#1baf7a]/40 hover:bg-[#1baf7a]/5 dark:hover:border-[#199e70]/40 dark:hover:bg-[#199e70]/10",
  },
  {
    label: "Returns",
    to: "/returns",
    icon: PackageCheck,
    iconAccent: "bg-[#eda100]/10 text-[#eda100] dark:bg-[#c98500]/15 dark:text-[#c98500]",
    hoverAccent: "hover:border-[#eda100]/40 hover:bg-[#eda100]/5 dark:hover:border-[#c98500]/40 dark:hover:bg-[#c98500]/10",
  },
  {
    label: "Payments",
    to: "/payments",
    icon: CreditCard,
    iconAccent: "bg-[#008300]/10 text-[#008300] dark:bg-[#008300]/15 dark:text-[#008300]",
    hoverAccent: "hover:border-[#008300]/40 hover:bg-[#008300]/5 dark:hover:border-[#008300]/40 dark:hover:bg-[#008300]/10",
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    iconAccent: "bg-[#eb6834]/10 text-[#eb6834] dark:bg-[#d95926]/15 dark:text-[#d95926]",
    hoverAccent: "hover:border-[#eb6834]/40 hover:bg-[#eb6834]/5 dark:hover:border-[#d95926]/40 dark:hover:bg-[#d95926]/10",
  },
  {
    label: "Reports",
    to: "/reports",
    icon: FileText,
    iconAccent: "bg-[#7c3aed]/10 text-[#7c3aed] dark:bg-[#8b5cf6]/15 dark:text-[#a78bfa]",
    hoverAccent: "hover:border-[#7c3aed]/40 hover:bg-[#7c3aed]/5 dark:hover:border-[#8b5cf6]/40 dark:hover:bg-[#8b5cf6]/10",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/20 sm:text-base">
          <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Welcome, {user?.FullName ?? "there"}!
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <img
          src={heroImage}
          alt="Jyoti Bhandar Rentals storefront"
          className="h-48 w-full object-cover sm:h-auto sm:max-h-[380px]"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition-colors duration-150 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${link.hoverAccent}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${link.iconAccent}`}>
                <link.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
