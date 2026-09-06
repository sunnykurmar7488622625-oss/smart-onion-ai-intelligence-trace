import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

export const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-canvas">
    <div className="relative hidden lg:flex flex-col justify-between bg-brand text-white p-12 grain overflow-hidden">
      <Logo onDark />
      <div className="relative">
        <p className="eyebrow !text-white/60">Smart Quality. Trusted Trade.</p>
        <h2 className="font-display mt-4 text-4xl font-bold tracking-tight leading-tight">One inspection. Continuous monitoring. Evidence every buyer trusts.</h2>
        <ul className="mt-8 space-y-3 text-white/80">
          <li>· Camera & image quality checks with Grade A / URS estimation</li>
          <li>· Day-wise storage deterioration alerts</li>
          <li>· Standardized digital reports with Verification ID</li>
        </ul>
      </div>
      <p className="text-sm text-white/50">ONIONAI · AI-powered Onion Quality Intelligence & Traceability Platform</p>
    </div>
    <div className="flex flex-col justify-center px-6 py-12 md:px-16">
      <div className="lg:hidden mb-10"><Logo /></div>
      <div className="mx-auto w-full max-w-md animate-fade-up">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-stone-500">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-8 text-sm text-stone-500">{footer}</p>
      </div>
    </div>
  </div>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      toast.error(errMsg(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to check your onions, reports and storage."
      footer={<>New to ONIONAI? <Link to="/register" className="font-semibold text-brand hover:underline" data-testid="login-register-link">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="login-form">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="login-email-input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="field" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="login-password-input" />
        </div>
        <button type="submit" className="btn-primary w-full text-base" disabled={busy} data-testid="login-submit-button">
          {busy && <Loader2 size={18} className="animate-spin" />} Log in
        </button>
      </form>
    </AuthLayout>
  );
}
