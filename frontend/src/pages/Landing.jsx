import { Link } from "react-router-dom";
import { ArrowRight, Camera, ClipboardCheck, FileCheck2, LineChart, ScanEye, ShieldCheck, Sprout, Truck, Boxes, BadgeCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const HERO_IMG = "https://images.unsplash.com/photo-1561461623-87ca0ffc99d6?auto=format&fit=crop&w=1400&q=80";
const FIELD_IMG = "https://images.pexels.com/photos/16678079/pexels-photo-16678079.jpeg?auto=compress&cs=tinysrgb&w=1400";
const PILE_IMG = "https://images.unsplash.com/photo-1683355739329-cea18ba93f02?auto=format&fit=crop&w=1200&q=80";

const STEPS = [
  { icon: Boxes, title: "Create Onion Batch", text: "Register your lot with variety, quantity and procurement center in under a minute." },
  { icon: Camera, title: "Scan with Camera", text: "Point your phone at the onions. Capture, analyse, repeat for large batches." },
  { icon: ClipboardCheck, title: "Get Grade A & URS", text: "See Grade A, URS and defect percentages with a standardized digital report." },
  { icon: LineChart, title: "Monitor & Dispatch", text: "Re-check daily in storage, catch decline early and approve dispatch with evidence." },
];

const PROBLEMS = [
  "Grading varies between procurement centers and causes disputes",
  "Manual checks miss rot, sprouts, damage and undersized onions",
  "Day-wise storage deterioration is impossible to track by eye",
  "No standard report buyers can trust before payment",
];

export default function Landing() {
  const { user } = useAuth();
  const startTo = user ? "/dashboard" : "/register";
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-50 glass border-b border-stone-200/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-stone-600">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#why" className="hover:text-ink transition-colors">Why ONIONAI</a>
            <Link to="/verify" className="hover:text-ink transition-colors" data-testid="nav-verify-link">Verify a batch</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="btn-primary !py-2.5 !min-h-[44px]" data-testid="nav-dashboard-link">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:inline-flex btn-secondary !py-2.5 !min-h-[44px]" data-testid="nav-login-link">Log in</Link>
                <Link to="/register" className="btn-primary !py-2.5 !min-h-[44px]" data-testid="nav-register-link">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-14 md:grid-cols-12 md:px-8 md:pt-24 lg:pb-28">
          <div className="md:col-span-6 stagger">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-brand">
              <ScanEye size={14} /> AI-Assisted Onion Quality Assessment
            </p>
            <h1 className="font-display mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.05]">
              Know Your Onion Quality <span className="text-brand">Before You Sell.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-stone-600">
              AI-powered onion inspection that checks quality, tracks storage changes and creates a trusted digital quality report.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={user ? "/camera" : "/register"} className="btn-primary text-base" data-testid="hero-primary-cta">
                <Camera size={20} /> Check Onion Quality
              </Link>
              <a href="#how" className="btn-secondary text-base" data-testid="hero-secondary-cta">
                See How It Works <ArrowRight size={18} />
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-stone-200 pt-6 max-w-lg">
              {[["Grade A / URS", "estimation"], ["Day-wise", "storage monitoring"], ["Verified", "digital reports"]].map(([a, b]) => (
                <div key={a}>
                  <p className="font-display text-lg font-bold">{a}</p>
                  <p className="text-sm text-stone-500">{b}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-6 relative">
            <div className="relative overflow-hidden rounded-3xl bg-stone-900 shadow-lift aspect-[4/3]">
              <img src={PILE_IMG} alt="Red onions under AI camera inspection" className="h-full w-full object-cover opacity-95" />
              <div className="scan-corner tl" /><div className="scan-corner tr" /><div className="scan-corner bl" /><div className="scan-corner br" />
              <div className="absolute left-0 right-0 h-px bg-emerald-400/80 shadow-[0_0_16px_2px_rgba(16,185,129,0.6)] animate-scan-line" />
              {[["18%", "22%", "26%", "30%", "border-emerald-400", "good"], ["58%", "30%", "24%", "28%", "border-emerald-400", "good"], ["36%", "58%", "22%", "26%", "border-red-500", "damaged"]].map(([l, t, w, h, c, lb]) => (
                <div key={l + t} className={`absolute border-2 rounded-sm ${c}`} style={{ left: l, top: t, width: w, height: h }}>
                  <span className="absolute -top-5 left-0 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{lb}</span>
                </div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[["Grade A", "84%", "text-emerald-700"], ["URS", "9%", "text-amber-700"], ["Defective", "7%", "text-red-700"]].map(([k, v, c]) => (
                    <div key={k}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">{k}</p>
                      <p className={`font-display text-xl font-bold ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>
                <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">Pass</span>
              </div>
            </div>
            <div className="absolute -bottom-16 left-6 hidden lg:flex items-center gap-3 rounded-2xl bg-white border border-stone-200 p-4 shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand"><LineChart size={20} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Storage Day 3</p>
                <p className="font-display font-bold text-red-700">Grade A down 6 pts · Reinspect</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand text-white relative grain overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {[["One-time Inspection", "Camera or photo upload. Grade A, URS and defects in seconds."], ["Continuous Storage Monitoring", "Day-wise checks show exactly when quality starts to slip."], ["Standardized Digital Evidence", "One report format every buyer and procurement center can trust."]].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="font-display text-4xl font-bold text-white/40">0{i + 1}</span>
              <div>
                <h3 className="font-display text-lg font-bold">{t}</h3>
                <p className="mt-1 text-sm text-white/75 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <p className="eyebrow">How it works</p>
        <h2 className="font-display mt-3 text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">From onion pile to trusted report in four simple steps</h2>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="oa-card oa-card-hover p-6 relative">
              <span className="absolute right-5 top-5 font-display text-4xl font-bold text-stone-100">{i + 1}</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon size={22} /></span>
              <h3 className="font-display mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-subtle border-y border-stone-200">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <p className="eyebrow">Platform</p>
          <h2 className="font-display mt-3 text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">Everything between harvest and payment, in one place</h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 oa-card overflow-hidden flex flex-col">
              <div className="relative aspect-[16/9] bg-stone-900">
                <img src={HERO_IMG} alt="Close-up of red onion skin under inspection" className="h-full w-full object-cover" />
                <div className="absolute inset-4 rounded-2xl border-2 border-emerald-400/60" />
                <span className="absolute left-6 top-6 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">Scan 3 of 6 · 142 onions</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 text-brand"><Camera size={18} /><span className="eyebrow !text-brand">Camera AI Inspection</span></div>
                <h3 className="font-display mt-3 text-2xl font-bold">Scan straight from your phone</h3>
                <p className="mt-2 text-stone-600 leading-relaxed">Open the camera, capture, analyse. Detected onions are outlined and classified as good, damaged, rotten, sprouted, undersized or oversized. Repeat scans for large lots.</p>
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-6">
              <div className="oa-card p-6 md:p-8 flex-1">
                <div className="flex items-center gap-2 text-brand"><FileCheck2 size={18} /><span className="eyebrow !text-brand">Quality Reports</span></div>
                <h3 className="font-display mt-3 text-2xl font-bold">One standard report</h3>
                <p className="mt-2 text-stone-600 leading-relaxed">Grade A %, URS %, defect breakdown, inspection source, human verification and a unique Verification ID. Download as PDF or print.</p>
              </div>
              <div className="oa-card p-6 md:p-8 flex-1">
                <div className="flex items-center gap-2 text-brand"><LineChart size={18} /><span className="eyebrow !text-brand">Storage Monitoring</span></div>
                <h3 className="font-display mt-3 text-2xl font-bold">See decline before buyers do</h3>
                <div className="mt-4 flex items-end gap-2 h-20">
                  {[84, 82, 78, 71].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-stone-600">{v}%</span>
                      <div className={`w-full rounded-t-lg ${i > 1 ? "bg-red-400" : "bg-emerald-500"}`} style={{ height: `${v * 0.7}%` }} />
                      <span className="text-[10px] text-stone-500">Day {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="md:col-span-5 oa-card p-6 md:p-8">
              <div className="flex items-center gap-2 text-brand"><ShieldCheck size={18} /><span className="eyebrow !text-brand">Buyer Verification</span></div>
              <h3 className="font-display mt-3 text-2xl font-bold">Trust, verified by ID</h3>
              <p className="mt-2 text-stone-600 leading-relaxed">Buyers enter a Batch ID or Verification ID and instantly see the verified quality record, storage history and dispatch status.</p>
              <Link to="/verify" className="btn-secondary mt-6" data-testid="feature-verify-link">Try verification <ArrowRight size={16} /></Link>
            </div>
            <div className="md:col-span-7 oa-card overflow-hidden grid grid-cols-1 sm:grid-cols-2">
              <img src={FIELD_IMG} alt="Farmer checking crop quality on a smartphone" className="h-56 sm:h-full w-full object-cover" />
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 text-brand"><Truck size={18} /><span className="eyebrow !text-brand">Pre-Dispatch Verification</span></div>
                <h3 className="font-display mt-3 text-2xl font-bold">Approve with confidence</h3>
                <p className="mt-2 text-stone-600 leading-relaxed">Compare the latest check with earlier results, then approve for dispatch or request reinspection. Every decision is saved to the batch passport.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="eyebrow">Why ONIONAI?</p>
          <h2 className="font-display mt-3 text-3xl md:text-4xl font-bold tracking-tight">ONIONAI transforms one-time manual grading into continuous digital quality intelligence.</h2>
          <ul className="mt-8 space-y-4">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex gap-3 text-stone-600"><span className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">✕</span>{p}</li>
            ))}
          </ul>
        </div>
        <div className="oa-card p-8 md:p-10">
          <p className="eyebrow">The ONIONAI way</p>
          <ul className="mt-6 space-y-5">
            {[[BadgeCheck, "Objective, measurable quality data for every batch"], [ScanEye, "AI camera inspection with detection overlays"], [LineChart, "Day-wise storage trend and early deterioration alerts"], [FileCheck2, "Standardized digital report with Verification ID"], [Sprout, "Farmer-friendly language, buyer-grade evidence"]].map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-accentSoft text-brand-accent"><Icon size={20} /></span>
                <span className="font-semibold text-ink">{t}</span>
              </li>
            ))}
          </ul>
          <Link to={startTo} className="btn-primary mt-8 w-full" data-testid="why-cta">Start free · Create your first batch</Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-stone-500">Smart Quality. Trusted Trade. · AI-powered Onion Quality Intelligence & Traceability Platform</p>
        </div>
      </footer>
    </div>
  );
}
