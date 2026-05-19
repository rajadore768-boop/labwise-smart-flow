import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "SmartLab Allocator — Intelligent Lab Optimization System" },
      { name: "description", content: "Maximize seat utilization and eliminate scheduling conflicts using a Best Fit allocation engine designed for academic institutions." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-6 rounded-sm bg-primary" />
            <span className="font-display text-lg">SmartLab</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#stats" className="hover:text-foreground">Why it works</a>
            <a href="#about" className="hover:text-foreground">About</a>
            <a href="#contact" className="hover:text-foreground">Contact</a>
          </nav>
          <Link to="/login" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-in-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="size-1.5 rounded-full bg-accent" /> Best Fit Optimization
          </span>
          <h1 className="mt-6 text-5xl md:text-6xl font-display leading-[1.05] text-balance">
            Intelligent lab optimization for every section, every slot.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-[58ch]">
            SmartLab Allocator pairs a Best Fit greedy algorithm with conflict-aware scheduling
            so every classroom hour runs at maximum capacity efficiency.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-5 py-3 text-sm font-medium hover:opacity-90">
              Launch Console <ArrowRight className="size-4" />
            </Link>
            <a href="#features" className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-surface-muted">
              How it works
            </a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[["94%", "Utilization"], ["02", "Avg waste"], ["0", "Conflicts"]].map(([v, l]) => (
              <div key={l} className="border-l-2 border-primary pl-3">
                <div className="text-2xl font-display">{v}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative animate-in-up">
          <img
            src={heroImg}
            alt="Isometric illustration of laboratory layout"
            width={1600}
            height={1000}
            className="rounded-2xl border border-border shadow-sm"
          />
        </div>
      </section>

      <section id="features" className="border-t border-border bg-surface-muted/50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Capabilities</p>
            <h2 className="mt-2 text-3xl font-display">Built for institutional optimization.</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { i: Sparkles, t: "Best Fit Engine", d: "Greedy algorithm picks the smallest lab whose capacity matches your section." },
              { i: ShieldCheck, t: "Conflict-aware", d: "Filters out double-booked labs before assignment — no false alarms after." },
              { i: Gauge, t: "Live utilization", d: "Track seat efficiency and wastage trends across every department." },
              { i: Boxes, t: "Role-based access", d: "Admins manage resources; faculty see only what they need." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-border bg-card p-6">
                <Icon className="size-5 text-primary" />
                <div className="mt-4 font-semibold">{t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stats" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Methodology</p>
            <h2 className="mt-2 text-3xl font-display max-w-[20ch]">Mathematical precision in academic space management.</h2>
            <p className="mt-6 text-muted-foreground max-w-[58ch]">
              Inspired by the Best Fit algorithm from operating systems memory allocation,
              SmartLab assigns every section to the smallest lab that fits — minimizing wasted
              seats and avoiding fragmented schedules.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Allocation Pseudocode</div>
            <pre className="mt-4 text-sm font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap">
{`1. filter labs by availability
2. remove conflicting allocations
3. sort labs by capacity ascending
4. pick first lab with capacity >= students
5. compute unused seats
6. persist allocation, update status`}
            </pre>
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-6 py-20 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h2 className="text-3xl font-display">An ERP-grade scheduling layer for the modern campus.</h2>
            <p className="mt-4 text-background/70 max-w-[60ch]">
              SmartLab unifies labs, sections, faculty, and timetables into one optimization
              surface. Administrators command resource allocation; faculty get a clean,
              productivity-first workspace.
            </p>
          </div>
          <div id="contact" className="border-l border-white/10 pl-8">
            <div className="text-[10px] font-mono uppercase tracking-widest text-background/50">Contact</div>
            <p className="mt-2 text-sm">smartlab@institute.edu</p>
            <p className="mt-1 text-sm text-background/60">Mon–Fri · 9:00–18:00</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SmartLab Allocator</span>
          <span className="font-mono">v 1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
