import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Tractor } from "lucide-react";
import { AuthLayout } from "@/pages/Login";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";

const ROLES = [
  { value: "farmer", icon: Tractor, title: "Farmer / Supplier", text: "Create batches, scan onions, monitor storage and dispatch" },
  { value: "buyer", icon: ShoppingBag, title: "Buyer", text: "View authorized batches and verify quality reports" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "farmer", organization: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      toast.success("Account created. Welcome to ONIONAI!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(errMsg(err, "Registration failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free for farmers, suppliers, traders and buyers."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline" data-testid="register-login-link">Log in</Link></>}
    >
      <form onSubmit={submit} className="space-y-5" data-testid="register-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map(({ value, icon: Icon, title, text }) => (
            <button
              type="button"
              key={value}
              onClick={() => setForm({ ...form, role: value })}
              data-testid={`register-role-${value}`}
              className={`text-left rounded-2xl border p-4 transition-[border-color,background-color] ${form.role === value ? "border-brand bg-brand-soft" : "border-stone-200 bg-white hover:bg-subtle"}`}
            >
              <Icon size={22} className={form.role === value ? "text-brand" : "text-stone-500"} />
              <p className="mt-2 font-bold">{title}</p>
              <p className="text-xs text-stone-500 leading-snug mt-0.5">{text}</p>
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required minLength={2} className="field" placeholder="Ramesh Patil" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="register-name-input" />
        </div>
        <div>
          <label className="label" htmlFor="organization">Farm / Organization <span className="text-stone-400 font-normal">(optional)</span></label>
          <input id="organization" className="field" placeholder="Patil Farms, Nashik" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} data-testid="register-organization-input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="field" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email-input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="field" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password-input" />
        </div>
        <button type="submit" className="btn-primary w-full text-base" disabled={busy} data-testid="register-submit-button">
          {busy && <Loader2 size={18} className="animate-spin" />} Create account
        </button>
      </form>
    </AuthLayout>
  );
}
