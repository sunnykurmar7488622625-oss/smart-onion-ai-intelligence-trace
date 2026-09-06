import { Link } from "react-router-dom";

export const LogoMark = ({ size = 40, onDark = false }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path
      d="M4 14V8a4 4 0 0 1 4-4h6M34 4h6a4 4 0 0 1 4 4v6M44 34v6a4 4 0 0 1-4 4h-6M14 44H8a4 4 0 0 1-4-4v-6"
      stroke={onDark ? "#FFFFFF" : "#1C1917"}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path d="M24 13.5c-1.6 3.2-9.5 6.8-9.5 14.5a9.5 9.5 0 0 0 19 0c0-7.7-7.9-11.3-9.5-14.5Z" fill="#701A2D" />
    <path d="M24 17c-1 2.3-5.8 5.2-5.8 11.2a5.8 5.8 0 0 0 11.6 0c0-6-4.8-8.9-5.8-11.2Z" fill="#8E2A40" />
    <path d="M24 21c-.6 1.4-2.6 3.3-2.6 6.8a2.6 2.6 0 0 0 5.2 0c0-3.5-2-5.4-2.6-6.8Z" fill="#D9A3B0" />
    <path d="M24 13.5c.4-3 2-5.2 4.2-6.3M24 13.5c-.4-3-2-5.2-4.2-6.3" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const Logo = ({ to = "/", onDark = false, size = 36, className = "" }) => (
  <Link to={to} className={`inline-flex items-center gap-2.5 ${className}`} data-testid="logo-link" aria-label="ONIONAI home">
    <LogoMark size={size} onDark={onDark} />
    <span className={`font-display text-xl font-bold tracking-tight ${onDark ? "text-white" : "text-ink"}`}>
      ONION<span className="text-brand-accent">AI</span>
    </span>
  </Link>
);
