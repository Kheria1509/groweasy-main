interface StepperProps {
  current: number; // 1-based index of the active step
}

const STEPS = ["Upload", "Preview", "Import", "Results"];

/** Horizontal step indicator for the four-stage import flow. */
export function Stepper({ current }: StepperProps) {
  return (
    <ol className="mx-auto flex w-full max-w-2xl items-center">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white"
                    : isDone
                      ? "border-brand-600 bg-brand-600/10 text-brand-600 dark:text-brand-300"
                      : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                }`}
              >
                {isDone ? "✓" : step}
              </span>
              <span
                className={`mt-2 hidden text-xs font-medium sm:block ${
                  isActive || isDone
                    ? "text-slate-800 dark:text-slate-100"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded transition ${
                  isDone ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
