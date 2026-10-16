import { CalendarDays, Home, UserRound, Users } from "lucide-react";

export type MobileSection =
  | "home"
  | "plan"
  | "athletes"
  | "profile"
  | "my-trainers";

interface BottomNavProps {
  activeSection: MobileSection;
  onNavigate: (section: MobileSection) => void;
}

const navigationItems: {
  section: MobileSection;
  label: string;
  Icon: typeof Home;
}[] = [
  { section: "home", label: "Accueil", Icon: Home },
  { section: "plan", label: "Mon Plan", Icon: CalendarDays },
  { section: "athletes", label: "Athlètes", Icon: Users },
  { section: "profile", label: "Profil", Icon: UserRound },
];

export function BottomNav({ activeSection, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-slate-800 dark:bg-altis-navy/95 md:hidden"
    >
      <div className="grid h-16 grid-cols-4 items-center">
        {navigationItems.map(({ section, label, Icon }) => (
          <button
            aria-current={
              activeSection === section ||
              (section === "profile" && activeSection === "my-trainers")
                ? "page"
                : undefined
            }
            className={`flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
              activeSection === section
                ? "text-altis-navy dark:text-altis-gold"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-altis-marble"
            }`}
            key={section}
            onClick={() => onNavigate(section)}
            type="button"
          >
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
