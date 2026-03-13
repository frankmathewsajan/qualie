'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Mic, PhoneCall, ArrowRight, Shield, Zap, Sun, Moon } from 'lucide-react';

const STATS = [
  { value: 85,  suffix: 'dB',   label: 'Breach threshold' },
  { value: 12,  suffix: 'kbps', label: 'Compressed audio' },
  { value: 200, suffix: 'ms',   label: 'Location fix'     },
];

const FEATURES = [
  {
    icon: Mic,
    tag: '01 — Sense',
    title: 'Always listening.',
    desc: 'Real-time RMS volume analysis via the Web Audio API. No cloud, no latency, zero idle cost.',
  },
  {
    icon: Zap,
    tag: '02 — Trigger',
    title: 'Threshold breach.',
    desc: 'The moment ambient noise crosses 85 dB, Aegis fires — before you can think to ask for help.',
  },
  {
    icon: PhoneCall,
    tag: '03 — Reach',
    title: 'Guardian notified.',
    desc: "12 kbps compressed audio + exact GPS coordinates land in your guardian's hands within seconds.",
  },
];

export default function Home() {
  const [dark, setDark] = useState(false);

  const navRef      = useRef<HTMLElement>(null);
  const heroRef     = useRef<HTMLDivElement>(null);
  const orbRef      = useRef<HTMLDivElement>(null);
  const statsRef    = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef      = useRef<HTMLDivElement>(null);

  const c = (l: string, d: string) => dark ? d : l;

  useEffect(() => {
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.fromTo(
          Array.from(heroRef.current!.children),
          { opacity: 0, y: 40, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.13, duration: 1.1, ease: 'power4.out', delay: 0.15 }
        );

        const orbs = orbRef.current!.querySelectorAll('.orb');
        orbs.forEach((orb, i) => {
          gsap.to(orb, {
            y: i % 2 === 0 ? -130 : -70,
            x: i % 2 === 0 ? 25 : -25,
            ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom top', scrub: 1.4 + i * 0.4 },
          });
        });

        ScrollTrigger.create({
          onUpdate(self: { direction: number }) {
            if (window.scrollY < 80) {
              gsap.to(navRef.current, { yPercent: 0, duration: 0.25, ease: 'power2.out' });
            } else {
              gsap.to(navRef.current, {
                yPercent: self.direction === 1 ? -100 : 0,
                duration: 0.3,
                ease: 'power2.out',
              });
            }
          },
        });

        statsRef.current!.querySelectorAll('.stat-val').forEach((el) => {
          const htmlEl = el as HTMLElement;
          const target = parseFloat(htmlEl.dataset.target ?? '0');
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.8, ease: 'power2.out',
            onUpdate() { htmlEl.textContent = Math.round(obj.v).toString(); },
            scrollTrigger: { trigger: htmlEl, start: 'top 88%', once: true },
          });
        });

        gsap.fromTo(
          featuresRef.current!.querySelectorAll('.feat-card'),
          { opacity: 0, y: 52, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1, stagger: 0.14, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' },
          }
        );

        gsap.fromTo(
          ctaRef.current,
          { opacity: 0, y: 30, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' },
          }
        );
      }
    );
  }, []);

  return (
    <main className={`min-h-screen font-sans overflow-x-hidden selection:bg-indigo-500/30 transition-colors duration-500 ${c('bg-white text-slate-900', 'bg-[#080810] text-white')}`}>

      {/* nav */}
      <nav ref={navRef} className={`fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 sm:px-10 py-4 backdrop-blur-xl border-b transition-colors duration-500 ${c('bg-white/85 border-slate-100', 'bg-[#080810]/75 border-white/5')}`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${c('text-slate-700', 'text-indigo-400')}`} />
          <span className={`font-black text-base tracking-tight ${c('text-slate-900', 'text-white')}`}>aegis</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/login" className={`text-sm font-medium transition-colors px-3 py-1.5 ${c('text-slate-500 hover:text-slate-800', 'text-white/40 hover:text-white')}`}>
            Sign in
          </Link>
          <button
            onClick={() => setDark(d => !d)}
            aria-label="Toggle theme"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors mx-1 ${c('text-slate-400 hover:bg-slate-100 hover:text-slate-700', 'text-white/30 hover:bg-white/10 hover:text-white/60')}`}>
            {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Link href="/listen" className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors ${c('bg-slate-900 hover:bg-slate-700 text-white', 'bg-indigo-500 hover:bg-indigo-400 text-white')}`}>
            Try now
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 sm:px-8 text-center overflow-hidden">
        <div ref={orbRef} className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${c('opacity-0', 'opacity-100')}`} aria-hidden="true">
          <div className="orb absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="orb absolute top-1/2 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-[90px]" />
          <div className="orb absolute bottom-1/4 left-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />
        </div>

        <div ref={heroRef} className="relative z-10 flex flex-col items-center">
          <span className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase px-4 py-1.5 rounded-full mb-10 border ${c('text-emerald-600 bg-emerald-50 border-emerald-100', 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20')}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${c('bg-emerald-500', 'bg-indigo-400')}`} />
            Live acoustic monitoring
          </span>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tight leading-[0.95] mb-6">
            <span className={c('text-slate-900', 'text-white')}>Your voice,</span><br />
            {dark
              ? <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-violet-400">always heard.</span>
              : <span className="text-slate-400">always heard.</span>
            }
          </h1>

          <p className={`text-base sm:text-lg leading-relaxed max-w-sm sm:max-w-md mb-12 ${c('text-slate-500', 'text-white/40')}`}>
            Aegis listens in the background. When stress levels spike,
            it sends a compressed audio clip and your exact location
            to your guardian — instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link href="/listen"
              className={`group flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-full transition-all w-full sm:w-auto justify-center ${c('bg-slate-900 hover:bg-slate-700 text-white', 'bg-indigo-500 hover:bg-indigo-400 text-white hover:shadow-lg hover:shadow-indigo-500/25')}`}>
              Begin listening
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/dashboard"
              className={`text-sm font-medium transition-colors px-7 py-3.5 rounded-full border w-full sm:w-auto text-center ${c('text-slate-500 border-slate-200 hover:text-slate-800 hover:border-slate-400', 'text-white/40 border-white/10 hover:text-white hover:border-white/25')}`}>
              View dashboard
            </Link>
          </div>
        </div>

        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-colors ${c('text-slate-300', 'text-white/20')}`}>
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
          <div className={`w-px h-8 bg-linear-to-b to-transparent ${c('from-slate-300', 'from-white/20')}`} />
        </div>
      </section>

      {/* stats */}
      <section className={`border-y transition-colors duration-500 ${c('border-slate-100 bg-slate-50/60', 'border-white/5 bg-white/2')}`}>
        <div ref={statsRef} className="max-w-3xl mx-auto px-5 py-14 grid grid-cols-3 gap-4">
          {STATS.map(({ value, suffix, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <p className={`text-3xl sm:text-4xl font-black tabular-nums ${c('text-slate-900', 'text-white')}`}>
                <span className="stat-val" data-target={value}>0</span>
                <span className={c('text-slate-400', 'text-indigo-400')}>{suffix}</span>
              </p>
              <p className={`text-[11px] uppercase tracking-wider mt-1 ${c('text-slate-400', 'text-white/30')}`}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section ref={featuresRef} className="py-28 px-5 sm:px-8 max-w-4xl mx-auto">
        <p className={`text-[11px] font-bold tracking-[0.18em] uppercase text-center mb-16 ${c('text-slate-400', 'text-white/20')}`}>
          How it works
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, tag, title, desc }) => (
            <div key={tag} className={`feat-card rounded-2xl border p-6 transition-all duration-500 ${c('border-slate-100 bg-slate-50 hover:bg-slate-100 hover:border-slate-200', 'border-white/10 bg-white/3 hover:border-indigo-500/30 hover:bg-indigo-500/5')}`}>
              <div className={`mb-5 w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${c('bg-slate-100 ring-slate-200', 'bg-indigo-500/10 ring-indigo-500/20')}`}>
                <Icon className={`w-4 h-4 ${c('text-slate-700', 'text-indigo-400')}`} />
              </div>
              <p className={`text-[10px] font-bold tracking-[0.15em] uppercase mb-2 ${c('text-slate-400', 'text-white/20')}`}>{tag}</p>
              <p className={`font-bold mb-2 text-base ${c('text-slate-900', 'text-white')}`}>{title}</p>
              <p className={`text-[13px] leading-relaxed ${c('text-slate-500', 'text-white/40')}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32 px-5">
        <div ref={ctaRef} className={`max-w-2xl mx-auto rounded-3xl border p-12 sm:p-16 text-center transition-colors duration-500 ${c('bg-slate-50 border-slate-200', 'bg-linear-to-br from-indigo-950/80 to-violet-950/80 border-indigo-500/15')}`}>
          <div className="inline-flex items-center gap-2 mb-6">
            <Shield className={`w-5 h-5 ${c('text-slate-600', 'text-indigo-400')}`} />
            <span className={`font-black tracking-tight ${c('text-slate-700', 'text-indigo-400')}`}>aegis</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-black tracking-tight mb-4 ${c('text-slate-900', 'text-white')}`}>
            Ready when you are.
          </h2>
          <p className={`text-sm mb-10 max-w-xs mx-auto leading-relaxed ${c('text-slate-400', 'text-white/40')}`}>
            No account needed. Just tap, and Aegis has your back.
          </p>
          <Link href="/listen"
            className={`inline-flex items-center gap-2 text-sm font-bold px-8 py-3.5 rounded-full transition-all ${c('bg-slate-900 text-white hover:bg-slate-700', 'bg-white text-slate-900 hover:bg-white/90 hover:shadow-xl hover:shadow-white/10')}`}>
            <Mic className="w-4 h-4" /> Open listener
          </Link>
        </div>
      </section>

      <footer className={`border-t py-6 text-center transition-colors duration-500 ${c('border-slate-100', 'border-white/5')}`}>
        <p className={`text-xs ${c('text-slate-400', 'text-white/15')}`}>© 2026 Aegis</p>
      </footer>
    </main>
  );
}
