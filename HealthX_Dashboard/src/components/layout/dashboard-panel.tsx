import type { ReactNode } from "react";

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardPanel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section
      className={`flex flex-col h-full min-h-0 rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ${className}`}
    >
      <header className="flex-shrink-0 flex items-start justify-between gap-2 px-3 py-2.5 lg:px-4 lg:py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/40">
        <div className="min-w-0 flex items-start gap-2">
          {icon && <span className="flex-shrink-0 text-indigo-500 mt-0.5">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
            {subtitle && (
              <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 p-3 lg:p-4">{children}</div>
    </section>
  );
}
