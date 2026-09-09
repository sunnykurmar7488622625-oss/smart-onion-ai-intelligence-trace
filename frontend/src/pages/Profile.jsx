import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Cpu, Loader2, LogOut, MessageSquareText, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PageHeader } from "@/components/States";

const SMS_STATUS = {
  SENT: "bg-emerald-100 text-emerald-800",
  MOCKED: "bg-amber-100 text-amber-800",
  NO_PHONE: "bg-stone-100 text-stone-600",
  FAILED: "bg-red-100 text-red-800",
};

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user.name, organization: user.organization || "", phone: user.phone || "" });
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [ai, setAi] = useState(null);
  const [sms, setSms] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const isFarmer = user.role === "farmer";

  const loadAlerts = () => api.get("/alerts").then((r) => setAlerts(r.data)).catch(() => {});
  useEffect(() => {
    api.get("/system/ai-status").then((r) => setAi(r.data)).catch(() => setAi({ connected: false, provider: "unknown" }));
    api.get("/system/sms-status").then((r) => setSms(r.data)).catch(() => setSms(null));
    loadAlerts();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put("/auth/profile", { ...form, phone: form.phone.replace(/[\s-]/g, "") });
      updateUser(data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/alerts/test");
      toast.success(data.status === "SENT" ? "Test SMS sent to your phone" : `Test alert logged (${data.status === "MOCKED" ? "SMS sender is mocked until Twilio keys are added" : data.status})`);
      loadAlerts();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Profile & Settings" title={user.name} description={`${isFarmer ? "Farmer / Supplier" : "Buyer"} account · member since ${fmtDate(user.created_at)}`} />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <form onSubmit={save} className="md:col-span-3 oa-card p-6 md:p-8 space-y-5" data-testid="profile-form">
          <div><label className="label" htmlFor="name">Full name</label><input id="name" className="field" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" /></div>
          <div><label className="label" htmlFor="org">Farm / Organization</label><input id="org" className="field" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} data-testid="profile-organization-input" /></div>
          <div>
            <label className="label" htmlFor="phone">Mobile number for SMS alerts</label>
            <input id="phone" type="tel" className="field" placeholder="+919876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="profile-phone-input" />
            <p className="mt-1 text-xs text-stone-500">Use international format with country code. You will be texted when a batch starts losing Grade A in storage.</p>
          </div>
          <div><label className="label">Email</label><input className="field bg-subtle" value={user.email} disabled data-testid="profile-email" /></div>
          <div><label className="label">Role</label><input className="field bg-subtle capitalize" value={isFarmer ? "Farmer / Supplier" : "Buyer"} disabled data-testid="profile-role" /></div>
          <button type="submit" className="btn-primary" disabled={busy} data-testid="profile-save-button">{busy && <Loader2 size={18} className="animate-spin" />} Save changes</button>
        </form>

        <div className="md:col-span-2 space-y-6">
          <div className="oa-card p-6" data-testid="sms-status-card">
            <div className="flex items-center gap-2 text-brand"><MessageSquareText size={18} /><h3 className="font-display text-lg font-bold text-ink">SMS Decline Alerts</h3></div>
            {sms ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${sms.connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`} data-testid="sms-provider-badge">{sms.connected ? "Twilio connected" : "Mocked sender"}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${user.phone ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>{user.phone ? "Phone set" : "No phone"}</span>
                </div>
                <p className="mt-3 text-sm text-stone-500">{sms.connected ? "Alerts are sent as real text messages through Twilio." : "No Twilio keys configured — alerts are logged below instead of texted. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER to the backend .env to go live."}</p>
                {isFarmer && <button onClick={sendTest} disabled={testing || !user.phone} className="btn-secondary mt-4 w-full" data-testid="send-test-sms-button">{testing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send test alert</button>}
              </>
            ) : <p className="mt-3 text-sm text-stone-500">Checking…</p>}
          </div>
          <div className="oa-card p-6" data-testid="ai-status-card">
            <div className="flex items-center gap-2 text-brand"><Cpu size={18} /><h3 className="font-display text-lg font-bold text-ink">AI Engine</h3></div>
            {ai ? (
              <>
                <p className="mt-3 font-semibold">{ai.connected ? `${ai.provider} · ${ai.model}` : "Local image processing"}</p>
                <p className="text-sm text-stone-500 mt-1">{ai.connected ? "Vision AI is connected via the server. Keys never reach the browser." : "No AI key configured — colour & texture processing is used."}</p>
              </>
            ) : <p className="mt-3 text-sm text-stone-500">Checking…</p>}
          </div>
          <button onClick={() => { logout(); navigate("/"); }} className="btn-secondary w-full" data-testid="profile-logout-button"><LogOut size={18} /> Log out</button>
        </div>
      </div>

      {isFarmer && (
        <div className="oa-card mt-6 p-6" data-testid="alert-log">
          <h3 className="font-display text-lg font-bold">Alert Log</h3>
          <p className="text-sm text-stone-500">Every decline alert the system raised for your batches.</p>
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500" data-testid="alert-log-empty">No alerts yet. You will see one here the first time a batch starts declining in storage.</p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100">
              {alerts.map((a) => (
                <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4" data-testid={`alert-log-${a.id}`}>
                  <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SMS_STATUS[a.status] || SMS_STATUS.NO_PHONE}`}>{a.status === "MOCKED" ? "Mocked SMS" : a.status.replace("_", " ")}</span>
                    <span className="text-xs text-stone-500">{a.batch_id}</span>
                  </div>
                  <p className="text-sm text-stone-700 flex-1">{a.message}</p>
                  <span className="text-xs text-stone-500 whitespace-nowrap">{fmtDateTime(a.created_at)}{a.phone ? ` · ${a.phone}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
