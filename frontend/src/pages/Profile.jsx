import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Cpu, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/States";

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, organization: user.organization || "" });
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(null);

  useEffect(() => { api.get("/system/ai-status").then((r) => setAi(r.data)).catch(() => setAi({ connected: false, provider: "unknown" })); }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/auth/profile", form);
      updateUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Profile & Settings" title={user.name} description={`${user.role === "farmer" ? "Farmer / Supplier" : "Buyer"} account · member since ${fmtDate(user.created_at)}`} />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <form onSubmit={save} className="md:col-span-3 oa-card p-6 md:p-8 space-y-5" data-testid="profile-form">
          <div><label className="label" htmlFor="name">Full name</label><input id="name" className="field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" /></div>
          <div><label className="label" htmlFor="org">Farm / Organization</label><input id="org" className="field" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} data-testid="profile-organization-input" /></div>
          <div><label className="label">Email</label><input className="field bg-subtle" value={user.email} disabled data-testid="profile-email" /></div>
          <div><label className="label">Role</label><input className="field bg-subtle capitalize" value={user.role === "farmer" ? "Farmer / Supplier" : "Buyer"} disabled data-testid="profile-role" /></div>
          <button type="submit" className="btn-primary" disabled={busy} data-testid="profile-save-button">{busy && <Loader2 size={18} className="animate-spin" />} Save changes</button>
        </form>
        <div className="md:col-span-2 space-y-6">
          <div className="oa-card p-6" data-testid="ai-status-card">
            <div className="flex items-center gap-2 text-brand"><Cpu size={18} /><h3 className="font-display text-lg font-bold text-ink">AI Engine</h3></div>
            {ai ? (
              <>
                <p className="mt-3 font-semibold">{ai.connected ? `${ai.provider} · ${ai.model}` : "Local image processing"}</p>
                <p className="text-sm text-stone-500 mt-1">{ai.connected ? "Vision AI is connected via the server. Keys never reach the browser." : "No AI key configured — colour & texture processing is used. Connect a provider in the backend environment to enable vision AI."}</p>
              </>
            ) : <p className="mt-3 text-sm text-stone-500">Checking…</p>}
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary w-full" data-testid="profile-logout-button"><LogOut size={18} /> Log out</button>
        </div>
      </div>
    </div>
  );
}
