import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "altis-theme";

function getSavedTheme(): Theme {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      aria-label={`Activer le mode ${nextTheme === "dark" ? "nuit" : "jour"}`}
      className="rounded-md p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-altis-marble dark:hover:bg-slate-800"
      onClick={() => setTheme(nextTheme)}
      title={`Mode ${nextTheme === "dark" ? "nuit" : "jour"}`}
      type="button"
    >
      {theme === "light" ? (
        <Moon aria-hidden="true" size={18} />
      ) : (
        <Sun aria-hidden="true" size={18} />
      )}
    </button>
  );
}
