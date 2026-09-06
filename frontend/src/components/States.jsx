import { AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export const Loader = ({ label = "Loading…", full = false }) => (
  <div className={`flex flex-col items-center justify-center gap-3 text-stone-500 ${full ? "min-h-screen" : "py-24"}`} data-testid="loading-state">
    <Loader2 className="animate-spin text-brand" size={32} />
    <p className="text-sm font-semibold">{label}</p>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action, actionTo, testId = "empty-state" }) => (
  <div className="oa-card flex flex-col items-center text-center px-6 py-16" data-testid={testId}>
    {Icon && (
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon size={26} />
      </span>
    )}
    <h3 className="font-display mt-5 text-xl font-bold">{title}</h3>
    <p className="mt-2 max-w-md text-[15px] text-stone-500 leading-relaxed">{description}</p>
    {action && actionTo && (
      <Link to={actionTo} className="btn-primary mt-6" data-testid={`${testId}-action`}>
        {action}
      </Link>
    )}
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className="oa-card flex flex-col items-center text-center px-6 py-14 border-red-100" data-testid="error-state">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
      <AlertTriangle size={26} />
    </span>
    <h3 className="font-display mt-5 text-xl font-bold">Something went wrong</h3>
    <p className="mt-2 max-w-md text-[15px] text-stone-500">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-secondary mt-6" data-testid="error-retry-button">
        Try again
      </button>
    )}
  </div>
);

export const PageHeader = ({ eyebrow, title, description, children }) => (
  <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" data-testid="page-title">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-[15px] text-stone-500 leading-relaxed">{description}</p>}
    </div>
    {children && <div className="flex flex-wrap gap-3">{children}</div>}
  </div>
);
