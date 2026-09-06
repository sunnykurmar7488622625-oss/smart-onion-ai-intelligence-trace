import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Boxes, Camera, FileText, ImagePlus, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const FARMER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { to: "/batches", label: "My Batches", icon: Boxes, id: "batches" },
  { to: "/camera", label: "Check with Camera", icon: Camera, id: "camera" },
  { to: "/inspect", label: "Upload Image", icon: ImagePlus, id: "inspect" },
  { to: "/reports", label: "Quality Reports", icon: FileText, id: "reports" },
  { to: "/verify", label: "Buyer Verification", icon: ShieldCheck, id: "verify" },
  { to: "/profile", label: "Profile", icon: UserRound, id: "profile" },
];
const BUYER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { to: "/batches", label: "Batches", icon: Boxes, id: "batches" },
  { to: "/verify", label: "Verify Quality", icon: ShieldCheck, id: "verify" },
  { to: "/reports", label: "Quality Reports", icon: FileText, id: "reports" },
  { to: "/profile", label: "Profile", icon: UserRound, id: "profile" },
];

const SHORT = { dashboard: "Home", batches: "Batches", camera: "Scan", inspect: "Upload", reports: "Reports", verify: "Verify", profile: "Profile" };

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px] text-[15px] font-semibold transition-colors duration-150 ${
    isActive ? "bg-brand-soft text-brand" : "text-stone-600 hover:bg-subtle hover:text-ink"
  }`;

export const AppShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isFarmer = user.role === "farmer";
  const nav = isFarmer ? FARMER_NAV : BUYER_NAV;
  const mobile = isFarmer
    ? [nav[0], nav[1], nav[2], nav[4], nav[6]]
    : [nav[0], nav[1], nav[2], nav[3], nav[4]];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="no-print hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-stone-200 bg-white px-4 py-6">
        <Logo to="/dashboard" className="px-2" />
        <p className="eyebrow mt-8 mb-3 px-4">{isFarmer ? "Supplier Workspace" : "Buyer Workspace"}</p>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, id }) => (
            <NavLink key={to} to={to} className={linkClass} data-testid={`nav-${id}`}>
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-subtle p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-bold" aria-hidden="true">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" data-testid="sidebar-user-name">{user.name}</p>
              <p className="truncate text-xs text-stone-500 capitalize">{user.role === "farmer" ? "Farmer / Supplier" : "Buyer"}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50" data-testid="logout-button">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      <header className="no-print lg:hidden sticky top-0 z-40 glass flex items-center justify-between px-4 py-3">
        <Logo to="/dashboard" size={30} />
        <NavLink to="/profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-bold" data-testid="mobile-profile-avatar">
          {user.name?.[0]?.toUpperCase()}
        </NavLink>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-8 md:py-10 lg:pb-12 animate-fade-up">
          <Outlet />
        </div>
      </main>

      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-stone-200 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {mobile.map(({ to, label, icon: Icon, id }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`mobile-nav-${id}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 min-h-[60px] text-[11px] font-semibold transition-colors ${
                  isActive ? "text-brand" : "text-stone-500"
                }`
              }
            >
              {id === "camera" ? (
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lift">
                  <Icon size={24} />
                </span>
              ) : (
                <Icon size={22} />
              )}
              <span className="truncate max-w-[64px]">{SHORT[id]}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <span className="hidden"><LogoMark size={1} /></span>
    </div>
  );
};
