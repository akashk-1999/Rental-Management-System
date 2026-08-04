import { KeyRound, ShieldCheck, UserCircle } from "lucide-react";
import Modal from "./Modal";

interface ProfileUser {
  FullName: string;
  Username: string;
  Role: "Admin" | "Staff";
  IsActive: boolean;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ProfileUser | null;
}

function getInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Profile">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-3xl font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
          {getInitials(user.FullName)}
        </span>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{user.FullName}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">@{user.Username}</p>
      </div>

      <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <UserCircle className="h-4 w-4" aria-hidden="true" />
            Full Name
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-white">{user.FullName}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Username
          </dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-white">{user.Username}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Role
          </dt>
          <dd>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
              {user.Role}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-sm text-slate-500 dark:text-slate-400">Status</dt>
          <dd>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                user.IsActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
              }`}
            >
              {user.IsActive ? "Active" : "Inactive"}
            </span>
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
