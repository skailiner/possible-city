'use client';

import { FormEvent, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Droplets,
  Leaf,
  MapPin,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const visions = [
  {
    id: 'ecological',
    label: 'Ecological',
    icon: Leaf,
    kicker: 'Cool the hard edge',
    title: 'A rain garden that gives the street back its shade.',
    description:
      'Trade a strip of heat-trapping pavement for layered tropical planting, slow stormwater, and a narrow place to pause beneath the viaduct.',
    principle: 'Let water shape the public realm instead of hiding it underground.',
    image: '/visions/ecological.png',
    alt: 'Conceptual viaduct-edge rain garden with tropical planting and permeable paving',
    accent: '#a8c978',
    firstMove: 'Mark the runoff path after one heavy rain.',
    stewards: '6–12 people',
    cost: 'Low',
    steps: [
      ['Notice', 'Map shade, runoff, and the paths people already take.'],
      ['Prototype', 'Place a short row of reversible planters for four weeks.'],
      ['Steward', 'Pair nearby residents with one landscape advisor.'],
      ['Learn', 'Measure surface heat, standing water, and time spent nearby.'],
    ],
  },
  {
    id: 'communal',
    label: 'Communal',
    icon: Users,
    kicker: 'Make room for encounters',
    title: 'A long table for the neighbourhood’s unfinished conversations.',
    description:
      'A robust shared table, practical evening light, and a tiny lending shelf turn leftover infrastructure into a place people can claim together.',
    principle: 'Begin with a reason to linger, then let the programme be negotiated in public.',
    image: '/visions/communal.png',
    alt: 'Conceptual shared table and modest neighbourhood gathering space beneath a viaduct',
    accent: '#e99a54',
    firstMove: 'Host one table for one evening.',
    stewards: '8–16 people',
    cost: 'Low–mid',
    steps: [
      ['Notice', 'Ask who already pauses here and what would make them stay.'],
      ['Prototype', 'Borrow tables, add warm task lights, and host a shared meal.'],
      ['Steward', 'Test a four-week rota with nearby groups and merchants.'],
      ['Learn', 'Track who participates, who feels excluded, and what gets cared for.'],
    ],
  },
  {
    id: 'contemplative',
    label: 'Contemplative',
    icon: Sparkles,
    kicker: 'Slow the crossing',
    title: 'A quiet threshold inside the city’s constant movement.',
    description:
      'Soft permeable ground, a single rain chain, and framed views offer commuters two unhurried minutes without asking them to leave their route.',
    principle: 'Treat stillness as civic infrastructure, not as leftover time.',
    image: '/visions/contemplative.png',
    alt: 'Conceptual quiet pause space with a rain chain and sparse seating beneath a viaduct',
    accent: '#82adbf',
    firstMove: 'Place two movable seats at the quietest edge.',
    stewards: '3–6 people',
    cost: 'Low',
    steps: [
      ['Notice', 'Record noise, wind, glare, and the moments people naturally pause.'],
      ['Prototype', 'Test movable seats and one framed view without blocking flow.'],
      ['Steward', 'Invite commuters and cleaners to shape a simple care routine.'],
      ['Learn', 'Observe dwell time, comfort, obstruction, and unintended use.'],
    ],
  },
] as const;

type VisionId = (typeof visions)[number]['id'];

export default function Home() {
  const [activeVision, setActiveVision] = useState<VisionId>('ecological');
  const [shareStatus, setShareStatus] = useState('Share this vision');
  const [proposalSaved, setProposalSaved] = useState(false);
  const active =
    visions.find((vision) => vision.id === activeVision) ?? visions[0];

  const scrollToProposal = () => {
    document.querySelector('#propose')?.scrollIntoView({ behavior: 'smooth' });
  };

  const shareVision = async () => {
    const shareData = {
      title: `Possible City — ${active.label} vision`,
      text: active.title,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus('Shared');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus('Link copied');
      }
    } catch {
      setShareStatus('Share cancelled');
    }
  };

  const saveProposal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proposal = {
      place: form.get('place'),
      friction: form.get('friction'),
      possibility: form.get('possibility'),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      'possible-city-place-proposal',
      JSON.stringify(proposal),
    );
    setProposalSaved(true);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="site-header">
        <a href="#top" className="brand-lockup" aria-label="Possible City home">
          <span className="brand-mark">PC</span>
          <span className="font-heading text-base font-semibold tracking-[-0.02em]">
            Possible City
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-xs md:flex" aria-label="Primary navigation">
          <a className="nav-link" href="#vision">Explore</a>
          <a className="nav-link" href="#first-move">First move</a>
          <a className="nav-link" href="#method">Method</a>
        </nav>
        <Button
          variant="outline"
          className="h-9 rounded-full border-foreground/25 bg-background/70 px-4"
          onClick={scrollToProposal}
        >
          Propose a place
          <ArrowDown className="size-3.5" />
        </Button>
      </header>

      <section id="top" className="hero-grid">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">A civic imagination instrument</p>
            <h1 className="hero-title">See what a place could become.</h1>
            <p className="hero-deck">
              Explore three grounded futures for an ordinary urban space—then find the first small action that could make one real.
            </p>
          </div>
          <div className="field-meta">
            <div>
              <p className="metric-label">Field study 001</p>
              <p className="mt-2 text-sm font-medium">The viaduct edge</p>
            </div>
            <div className="text-right">
              <p className="metric-label">Status</p>
              <p className="mt-2 text-xs text-muted-foreground">Composite study · Singapore</p>
            </div>
          </div>
        </div>

        <div id="vision" className="vision-stage">
          <div className="place-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="vision-toolbar" role="tablist" aria-label="Choose a vision lens">
            {visions.map((vision) => {
              const Icon = vision.icon;
              const selected = vision.id === active.id;
              return (
                <button
                  key={vision.id}
                  type="button"
                  id={`tab-${vision.id}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls="vision-panel"
                  onClick={() => setActiveVision(vision.id)}
                  className="lens-button"
                  data-active={selected}
                >
                  <Icon className="size-3.5" />
                  {vision.label}
                </button>
              );
            })}
          </div>

          <article
            key={active.id}
            id="vision-panel"
            role="tabpanel"
            aria-labelledby={`tab-${active.id}`}
            className="vision-card"
          >
            <div className="vision-image-wrap">
              <img src={active.image} alt={active.alt} className="vision-image" />
              <div className="image-label">
                <span className="size-2 rounded-full" style={{ background: active.accent }} />
                Imagined future · Not an approved plan
              </div>
            </div>
            <div className="vision-copy">
              <div className="mb-6 flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ background: active.accent }} />
                <p className="eyebrow">{active.kicker}</p>
              </div>
              <h2 className="font-heading text-3xl font-medium leading-[1.02] tracking-[-0.045em] md:text-[2.7rem]">
                {active.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                {active.description}
              </p>
              <div className="mt-6 grid grid-cols-3 border-t border-border pt-5 text-xs">
                <div>
                  <p className="metric-label">First move</p>
                  <p className="mt-2 font-medium">1 weekend</p>
                </div>
                <div>
                  <p className="metric-label">Stewards</p>
                  <p className="mt-2 font-medium">{active.stewards}</p>
                </div>
                <div>
                  <p className="metric-label">Cost band</p>
                  <p className="mt-2 font-medium">{active.cost}</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="first-move" className="section-shell border-t border-border">
        <div className="section-intro">
          <p className="eyebrow">From image to agency</p>
          <h2 className="section-title">A future is only useful when it suggests a first move.</h2>
          <p className="section-deck">
            Possible City pairs every speculative view with a reversible experiment, a stewardship question, and something worth measuring.
          </p>
        </div>

        <div className="move-grid">
          <div className="move-callout">
            <p className="eyebrow">Begin here</p>
            <p className="mt-5 font-heading text-3xl leading-tight tracking-[-0.04em]">
              {active.firstMove}
            </p>
            <p className="mt-5 border-t border-foreground/15 pt-5 text-sm leading-6 text-foreground/70">
              “{active.principle}”
            </p>
          </div>
          <ol className="step-list">
            {active.steps.map(([label, description], index) => (
              <li key={label} className="step-item">
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="method" className="method-section">
        <div className="method-heading">
          <p className="eyebrow text-foreground/55">The method</p>
          <h2 className="mt-6 max-w-3xl font-heading text-4xl font-medium leading-[0.98] tracking-[-0.055em] md:text-6xl">
            Not a masterplan. A better question, made visible.
          </h2>
        </div>
        <div className="principle-grid">
          <article className="principle-card">
            <Droplets />
            <p className="eyebrow mt-10 text-foreground/55">01 · Ground it</p>
            <h3 className="mt-4 font-heading text-2xl tracking-[-0.035em]">Start with what the place already does.</h3>
            <p className="mt-4 text-sm leading-6 text-foreground/65">Shade, water, movement, memory, informal use, and daily care are design material.</p>
          </article>
          <article className="principle-card">
            <MapPin />
            <p className="eyebrow mt-10 text-foreground/55">02 · Keep it reversible</p>
            <h3 className="mt-4 font-heading text-2xl tracking-[-0.035em]">Test the relationship before the object.</h3>
            <p className="mt-4 text-sm leading-6 text-foreground/65">The first move should reveal more about a place than it permanently changes.</p>
          </article>
          <article className="principle-card">
            <Users />
            <p className="eyebrow mt-10 text-foreground/55">03 · Name the steward</p>
            <h3 className="mt-4 font-heading text-2xl tracking-[-0.035em]">A place is sustained by people, not renderings.</h3>
            <p className="mt-4 text-sm leading-6 text-foreground/65">Every proposal must make care, consent, exclusion, and maintenance visible.</p>
          </article>
        </div>
      </section>

      <section id="propose" className="proposal-section">
        <div className="proposal-copy">
          <p className="eyebrow">Field note 002</p>
          <h2 className="mt-7 max-w-xl font-heading text-5xl font-medium leading-[0.94] tracking-[-0.06em] md:text-7xl">
            What place keeps asking for your attention?
          </h2>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
            Frame a place without uploading a photo or sharing your precise location. This first release saves the note only on your device.
          </p>
        </div>

        <form className="proposal-form" onSubmit={saveProposal}>
          {proposalSaved ? (
            <div className="saved-state" role="status">
              <span className="grid size-12 place-items-center rounded-full bg-accent"><Check /></span>
              <p className="mt-6 font-heading text-3xl tracking-[-0.04em]">Field note saved.</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                It stays on this device. Community submissions will only open after a moderation and consent system exists.
              </p>
              <Button className="mt-7 rounded-full px-5" type="button" onClick={() => setProposalSaved(false)}>
                Edit the note
              </Button>
            </div>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="place">Name the place</FieldLabel>
                <Input id="place" name="place" required className="form-control" placeholder="The sheltered edge beside…" />
              </Field>
              <Field>
                <FieldLabel htmlFor="friction">What feels unresolved there?</FieldLabel>
                <Textarea id="friction" name="friction" required className="form-control min-h-28" placeholder="People pass through, but…" />
              </Field>
              <Field>
                <FieldLabel htmlFor="possibility">What quality should the place make possible?</FieldLabel>
                <Textarea id="possibility" name="possibility" required className="form-control min-h-28" placeholder="Coolness, encounter, quiet, play…" />
              </Field>
              <Button type="submit" className="mt-2 h-11 rounded-full px-5">
                Save field note on this device
                <ArrowRight />
              </Button>
            </FieldGroup>
          )}
        </form>
      </section>

      <footer className="site-footer">
        <div>
          <p className="font-heading text-lg font-semibold">Possible City</p>
          <p className="mt-2 text-xs text-muted-foreground">Portfolio build 001 · An experiment in grounded civic imagination.</p>
        </div>
        <Button variant="ghost" className="rounded-full" onClick={shareVision}>
          <Share2 />
          {shareStatus}
        </Button>
      </footer>
    </main>
  );
}
