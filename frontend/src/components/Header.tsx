import { ThemeToggle } from "./ThemeToggle";
import { SparklesIcon } from "./icons";

/** App header with brand mark and theme toggle. */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              GrowEasy
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI CSV Importer
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
