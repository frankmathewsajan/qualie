import { useState, useEffect, useCallback, useRef } from 'react';

export type OpState = 'armed' | 'active' | 'breach' | 'dispatched';

export interface TranscriptLine {
  id: number;
  speaker: 'OFFICER' | 'SUBJECT' | 'SYS';
  text: string;
  ts: string;
}

export interface ActionEntry {
  id: number;
  text: string;
  flash?: boolean;
}

const EVENTS = [
  { delay: 0,     speaker: 'OFFICER', text: 'Good evening, sir. Routine traffic stop.',               threat: 5  },
  { delay: 2800,  speaker: 'OFFICER', text: 'License and registration, please.',                       threat: 12 },
  { delay: 5200,  speaker: 'SUBJECT', text: 'What? For what?! I wasn\'t doing anything wrong!',        threat: 28 },
  { delay: 8000,  speaker: 'OFFICER', text: 'Sir, I clocked you at 67 in a 45 zone.',                  threat: 36 },
  { delay: 10500, speaker: 'SUBJECT', text: 'That\'s ridiculous. Your equipment is broken.',           threat: 48 },
  { delay: 13000, speaker: 'OFFICER', text: 'I need you to remain calm, sir.',                         threat: 57 },
  { delay: 15500, speaker: 'SUBJECT', text: 'Don\'t tell me to calm down! You people target me!',     threat: 69 },
  { delay: 17800, speaker: 'OFFICER', text: 'Sir — hands visible on the wheel. Now.',                  threat: 77 },
  { delay: 20200, speaker: 'SUBJECT', text: 'I know my rights! This is clear harassment!',             threat: 85 },
  { delay: 22500, speaker: 'SUBJECT', text: 'Get your hands off my window! I will have your badge!',  threat: 97 },
] as const;

const ACTION_SEQUENCE = [
  { text: '[SYS] Threat Threshold Breached.', flash: true },
  { text: '[SYS] Analyzing vocal stress pattern... agitation index: 0.94' },
  { text: '[SYS] Generating Contextual De-escalation Protocol...' },
  { text: '[SYS] Subject profile: Escalation pattern class-3 detected.' },
  { text: '[SYS] Recommended response: Passive non-escalation + backup.' },
  { text: '[SYS] Bypassing manual override.' },
  { text: '[SYS] Executing Twilio Voice API to Target Device...', flash: true },
  { text: '[SYS] CALL DISPATCHED — device +91-98765-XXXXX', flash: true },
];

const fmtTs = () => new Date().toISOString().slice(11, 23);

export function useCommandSimulation() {
  const [opState, setOpState] = useState<OpState>('armed');
  const [threat, setThreat] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const initiate = useCallback(() => {
    if (opState !== 'armed') return;
    setOpState('active');

    EVENTS.forEach((ev, i) => {
      const t = setTimeout(() => {
        setThreat(ev.threat);
        setTranscript(prev => [...prev, { id: Date.now() + i, speaker: ev.speaker as 'OFFICER'|'SUBJECT', text: ev.text, ts: fmtTs() }]);

        if (ev.threat >= 85) {
          setOpState('breach');
          ACTION_SEQUENCE.forEach((a, j) => {
            const at = setTimeout(() => {
              setActions(prev => [...prev, { id: Date.now() + j, ...a }]);
              if (j === ACTION_SEQUENCE.length - 1) setOpState('dispatched');
            }, j * 900);
            timers.current.push(at);
          });
        }
      }, ev.delay);
      timers.current.push(t);
    });
  }, [opState]);

  const reset = useCallback(() => {
    clearTimers();
    setOpState('armed');
    setThreat(0);
    setTranscript([]);
    setActions([]);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return { opState, threat, transcript, actions, initiate, reset };
}
