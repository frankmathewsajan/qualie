import Link from 'next/link';
import { ShieldAlert, Globe, Radio, Zap, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const FEATURES = [
  { icon: Globe,    title: 'Omni-Lingual',       desc: 'Auto-translates alerts into EN, Telugu, Spanish — instantly.' },
  { icon: Radio,    title: 'One-Click Broadcast', desc: 'A single trigger dispatches localized audio alerts to every node.' },
  { icon: Activity, title: 'Live Telemetry',      desc: 'Routing logs stream in ms, confirming delivery to every district.' },
  { icon: Zap,      title: 'Zero-Latency Audio',  desc: 'ElevenLabs speech synthesis delivered before the next heartbeat.' },
];

export default function LandingPage() {
  return (
    <div className='min-h-screen bg-white text-slate-900 flex flex-col'>
      <nav className='border-b border-slate-200 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full'>
        <div className='flex items-center gap-2'>
          <ShieldAlert className='w-5 h-5 text-blue-600' />
          <span className='font-semibold'>CrisisComm</span>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='sm' asChild><Link href='/login'>Sign in</Link></Button>
          <Button size='sm' asChild><Link href='/register'>Get started</Link></Button>
        </div>
      </nav>

      <section className='flex-1 flex flex-col items-center justify-center text-center px-6 py-24 max-w-4xl mx-auto w-full'>
        <Badge variant='secondary' className='mb-6 gap-1.5 text-xs'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block' />
          Live · India Emergency Services
        </Badge>
        <h1 className='text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6'>
          Crisis communication,{' '}
          <span className='text-blue-600'>in every language</span>
        </h1>
        <p className='text-lg text-slate-500 max-w-xl mb-10 leading-relaxed'>
          Broadcast real-time emergency alerts across Andhra Pradesh —
          translated and audio-rendered in milliseconds.
        </p>
        <div className='flex items-center gap-4 flex-wrap justify-center'>
          <Button size='lg' asChild className='gap-2'>
            <Link href='/dashboard'>Open Dashboard <ArrowRight className='w-4 h-4' /></Link>
          </Button>
          <Button size='lg' variant='outline' asChild>
            <Link href='/register'>Create account</Link>
          </Button>
        </div>
      </section>

      <Separator />

      <section className='py-20 px-6 max-w-6xl mx-auto w-full'>
        <p className='text-xs font-semibold uppercase tracking-widest text-slate-400 text-center mb-10'>
          Platform capabilities
        </p>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className='border-slate-200 hover:border-blue-300 transition-colors'>
              <CardContent className='pt-5'>
                <div className='w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3'>
                  <Icon className='w-4 h-4 text-blue-600' />
                </div>
                <p className='font-semibold text-sm mb-1'>{title}</p>
                <p className='text-xs text-slate-500 leading-relaxed'>{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className='border-t border-slate-200 py-6 px-6 text-center'>
        <p className='text-xs text-slate-400'>© 2026 CrisisComm · Andhra Pradesh Emergency Services</p>
      </footer>
    </div>
  );
}