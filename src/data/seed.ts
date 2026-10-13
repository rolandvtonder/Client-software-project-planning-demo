/**
 * Made-up clients and jobs for the demo. Every date is relative to today so the
 * demo always looks current: something goes out today, something comes back
 * today, quotes are waiting, and the last three months have orders to report on.
 */

import {addDays, today} from '../domain/dates';
import {rand} from '../domain/money';
import {suggestedDeposit, totals} from '../domain/totals';
import type {BranchId, Client, Item, Job, JobStatus, Line, Payment, Settings} from '../domain/types';
import {seedItems} from './catalogue';

export const DEMO_USERS = {
  owner: 'Elize (Owner)',
  office: 'Carmen (Office, PTA)',
  driver: 'Sipho (Driver)',
};

export const defaultSettings = (): Settings => ({
  vatRegistered: true,
  vatNo: '4000 000 000 (demo)',
  vatRate: 0.15,
  depositPct: 30,
  depositMin: rand(500),
  bankFeePct: 10,
  cancellationPct: 10,
  softHoldHours: 48,
  quoteValidDays: 14,
  bank: {name: 'Demo Bank', account: '0000 000 0000', branchCode: '000000', holder: 'Eastco CC'},
});

const c = (
  id: string,
  kind: Client['kind'],
  name: string,
  phone: string,
  branch: BranchId,
  tags: Client['tags'],
  extra: Partial<Client> = {},
): Client => ({
  id,
  kind,
  name,
  phone,
  email: `${name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}@example.co.za`,
  branch,
  tags,
  addresses: [],
  createdAt: addDays(today(), -200),
  consent: {at: addDays(today(), -200), via: 'WhatsApp'},
  ...extra,
});

export const seedClients = (): Client[] => [
  c('c-sarah', 'person', 'Sarah van der Merwe', '082 000 1101', 'pta', ['Private'], {notes: 'Wedding with Johan. Prefers WhatsApp.', addresses: [{label: 'Venue', line: 'Rustic Gem Venue, Hennops River Road, Centurion'}]}),
  c('c-bloom', 'company', 'Thandi Mokoena', '083 000 2202', 'pta', ['Wedding planner', 'Repeat'], {company: 'Bloom & Bough Events', vatNo: '4100 000 001', notes: '30-day account. Always wants a setup quote.'}),
  c('c-oaks', 'company', 'Ruan Pretorius', '084 000 3303', 'kdp', ['Venue', 'Repeat'], {company: 'The Oaks Venue, Muldersdrift', addresses: [{label: 'Venue', line: 'The Oaks, R114, Muldersdrift'}]}),
  c('c-nomsa', 'person', 'Nomsa Dlamini', '072 000 4404', 'pta', ['Private'], {addresses: [{label: 'Home', line: '14 Jasmyn Street, Rooihuiskraal, Centurion'}]}),
  c('c-kgosi', 'company', 'Lerato Kgosi', '011 000 5505', 'pta', ['Corporate', 'Repeat'], {company: 'Kgosi Holdings (Pty) Ltd', vatNo: '4200 000 002', addresses: [{label: 'Office', line: '3 Lenchen Ave North, Centurion'}]}),
  c('c-annelie', 'person', 'Annelie Botha', '076 000 6606', 'kdp', ['Private'], {notes: 'Turning 40 — gold & black theme.'}),
  c('c-ridge', 'company', 'Mrs J. Fourie', '011 000 7707', 'kdp', ['Corporate'], {company: 'Ridgeview Primary School PTA'}),
  c('c-michelle', 'person', 'Michelle Pillay', '081 000 8808', 'pta', ['Wedding planner'], {}),
  c('c-steyn', 'person', 'Marike Steyn', '079 000 9909', 'kdp', ['Private'], {notes: 'Wedding with Pieter, farm venue near Magaliesburg.'}),
  c('c-zanele', 'person', 'Zanele Khumalo', '073 000 1010', 'pta', ['Private'], {}),
  c('c-green', 'company', 'Events Desk', '012 000 1111', 'pta', ['Corporate', 'Venue', 'Repeat'], {company: 'Greenfield Conference Centre', vatNo: '4300 000 003', addresses: [{label: 'Venue', line: 'Greenfield Conference Centre, Hennopspark'}]}),
  c('c-david', 'person', 'David Naidoo', '082 000 1212', 'pta', ['Private'], {}),
];

/** A plausible handwritten-looking squiggle, used for seeded signatures. */
export const demoSignature = (seed: number) => {
  const r = rng(seed);
  let d = `M10 ${40 + r() * 10}`;
  for (let x = 20; x < 260; x += 14) d += ` Q${x} ${10 + r() * 50} ${x + 7} ${25 + r() * 30}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="80"><path d="${d}" fill="none" stroke="#1c2725" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Counters = Record<'Q' | 'INV' | 'DN' | 'RN' | 'CN', number>;

export type SeedState = {items: Item[]; clients: Client[]; jobs: Job[]; settings: Settings; counters: Counters};

export function seed(): SeedState {
  const T = today();
  const year = T.slice(0, 4);
  const items = seedItems();
  const clients = seedClients();
  const settings = defaultSettings();
  const price = (code: string) => items.find((i) => i.code === code)!.price;
  const L = (code: string, qty: number, discountPct = 0): Line => ({itemId: code.toLowerCase(), qty, unitPrice: price(code), discountPct});
  const counters: Counters = {Q: 0, INV: 0, DN: 0, RN: 0, CN: 0};
  const num = (k: keyof Counters) => `${k === 'Q' ? 'Q' : k}-${year}-${String(++counters[k]).padStart(4, '0')}`;
  const jobs: Job[] = [];
  let seq = 0;

  const PAST_STATES: JobStatus[] = ['confirmed', 'packing', 'out_for_delivery', 'on_hire', 'returned', 'issues', 'closed'];

  function job(p: {
    client: string;
    branch: BranchId;
    name: string;
    type: Job['eventType'];
    event: number;
    out?: number;
    back?: number;
    status: JobStatus;
    lines: Line[];
    delivery?: number;
    setup?: number;
    discount?: number;
    fulfilment?: Job['fulfilment'];
    venue?: string;
    window?: string;
    driver?: string;
    deposit?: Payment['method'] | false;
    hirePaid?: 'full' | 'none' | number;
    createdDaysAgo?: number;
    notes?: string;
  }): Job {
    const out = addDays(T, p.out ?? p.event - 1);
    const back = addDays(T, p.back ?? p.event + 1);
    const created = addDays(T, -(p.createdDaysAgo ?? Math.max(5, 20 - p.event)));
    const base = {lines: p.lines, discountPct: p.discount ?? 0, deliveryFee: rand(p.delivery ?? 450), setupFee: rand(p.setup ?? 0)};
    const t = totals(base, settings);
    const confirmedOrLater = PAST_STATES.includes(p.status);
    const j: Job = {
      id: `j${++seq}`,
      quoteNo: num('Q'),
      invoiceNo: confirmedOrLater ? num('INV') : undefined,
      clientId: p.client,
      branch: p.branch,
      eventName: p.name,
      eventType: p.type,
      eventDate: addDays(T, p.event),
      outDate: out,
      backDate: back,
      fulfilment: p.fulfilment ?? 'delivery',
      venue: p.venue ?? clients.find((x) => x.id === p.client)!.addresses[0]?.line ?? 'Venue to be confirmed',
      deliveryWindow: p.window ?? '08:00 – 10:00',
      ...base,
      depositDue: suggestedDeposit(t.total, settings),
      validUntil: addDays(created, settings.quoteValidDays),
      status: p.status,
      createdAt: created,
      createdBy: DEMO_USERS.office,
      driver: p.driver,
      notes: p.notes,
      payments: [],
      charges: [],
      history: [{at: `${created}T09:12:00`, by: DEMO_USERS.office, text: 'Quote created'}],
    };
    if (p.status !== 'draft') j.history.push({at: `${created}T09:40:00`, by: DEMO_USERS.office, text: 'Quote sent by WhatsApp'});
    if (confirmedOrLater || p.status === 'accepted') j.history.push({at: `${addDays(created, 1)}T14:05:00`, by: 'Client', text: 'Quote accepted online'});
    if (confirmedOrLater && p.deposit !== false) {
      const method = p.deposit || 'EFT';
      j.payments.push({id: `p${seq}a`, at: addDays(created, 2), amount: j.depositDue, method, kind: 'deposit'});
      j.history.push({at: `${addDays(created, 2)}T10:30:00`, by: DEMO_USERS.office, text: `Deposit received (${method}) — booking confirmed`});
    }
    const paid = p.hirePaid ?? (['on_hire', 'returned', 'issues', 'closed'].includes(p.status) ? 'full' : 'none');
    if (paid !== 'none') {
      const amount = paid === 'full' ? t.total : Math.round(t.total * paid);
      j.payments.push({id: `p${seq}b`, at: out, amount, method: 'Cash', kind: 'hire'});
    }
    if (['on_hire', 'returned', 'issues', 'closed'].includes(p.status)) {
      j.deliveryNote = {
        number: num('DN'),
        counts: Object.fromEntries(p.lines.map((l) => [l.itemId, l.qty])),
        shortReasons: {},
        signature: {
          signedBy: clients.find((x) => x.id === p.client)!.name,
          role: 'Client',
          signedAt: `${out}T09:${10 + (seq % 40)}:00`,
          image: demoSignature(seq),
          hash: (seq * 2654435761).toString(16).padStart(8, '0') + 'a3f19c0d7e',
        },
      };
      j.history.push({at: `${out}T09:20:00`, by: DEMO_USERS.driver, text: `Delivered — ${j.deliveryNote.number} signed by client`});
    }
    if (['returned', 'issues', 'closed'].includes(p.status)) {
      j.returnNote = {
        number: num('RN'),
        lines: Object.fromEntries(p.lines.map((l) => [l.itemId, {state: 'ok' as const, qty: 0}])),
        checkedAt: `${back}T11:00:00`,
      };
      j.history.push({at: `${back}T11:00:00`, by: DEMO_USERS.driver, text: `Collected and counted — ${j.returnNote.number}`});
    }
    if (p.status === 'closed' && j.payments.some((x) => x.kind === 'deposit')) {
      const dep = j.payments.find((x) => x.kind === 'deposit')!;
      const refund = dep.method === 'EFT' ? Math.round(dep.amount * 0.9) : dep.amount;
      j.payments.push({id: `p${seq}c`, at: addDays(back, 2), amount: refund, method: dep.method, kind: 'refund'});
      j.history.push({at: `${addDays(back, 2)}T10:00:00`, by: DEMO_USERS.owner, text: 'Deposit refunded — job closed'});
    }
    jobs.push(j);
    return j;
  }

  // ---- History: ~3 months of closed jobs, so reports have something to show.
  const r = rng(2026);
  const pool = items.filter((i) => i.stock.pta + i.stock.kdp >= 4);
  const types: Job['eventType'][] = ['Wedding', 'Birthday', 'Baby shower', 'Corporate', 'Conference', 'Private dinner'];
  const names: Record<Job['eventType'], string[]> = {
    Wedding: ['Garden wedding', 'Farm wedding', 'Winter wedding', 'Chapel reception'],
    Birthday: ['21st birthday', '50th birthday', 'Kids party', 'Sweet 16'],
    'Baby shower': ['Baby shower', 'Gender reveal'],
    Corporate: ['Year-end function', 'Product launch', 'Staff awards'],
    Conference: ['Strategy day', 'Training session'],
    'Private dinner': ['Anniversary dinner', 'Family lunch'],
    Other: ['Event'],
  };
  for (let n = 0; n < 32; n++) {
    const event = -9 - Math.floor(r() * 88);
    const branch: BranchId = r() < 0.6 ? 'pta' : 'kdp';
    const client = clients[Math.floor(r() * clients.length)].id;
    const type = types[Math.floor(r() * types.length)];
    const picks = new Set<Item>();
    const want = 3 + Math.floor(r() * 6);
    while (picks.size < want) picks.add(pool[Math.floor(r() * pool.length)]);
    const lines = [...picks].map((i) => {
      const max = Math.max(1, Math.min(i.stock[branch], i.category === 'Chairs' || i.category === 'Napkins' || i.collection === 'decor' ? 80 : 12));
      return L(i.code, Math.max(1, Math.round(max * (0.2 + r() * 0.5))));
    });
    job({
      client,
      branch,
      name: names[type][Math.floor(r() * names[type].length)],
      type,
      event,
      status: 'closed',
      lines,
      delivery: [0, 350, 450, 650][Math.floor(r() * 4)],
      fulfilment: r() < 0.3 ? 'collection' : 'delivery',
      deposit: r() < 0.5 ? 'Cash' : 'EFT',
      createdDaysAgo: -event + 10 + Math.floor(r() * 20),
    });
  }
  jobs.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  // Renumber history so numbers run in date order.
  counters.Q = counters.INV = counters.DN = counters.RN = 0;
  for (const j of jobs) {
    j.quoteNo = num('Q');
    if (j.invoiceNo) j.invoiceNo = num('INV');
    if (j.deliveryNote) j.deliveryNote.number = num('DN');
    if (j.returnNote) j.returnNote.number = num('RN');
  }

  // ---- The current, hand-made jobs.
  job({
    client: 'c-david', branch: 'pta', name: 'Anniversary dinner for 12', type: 'Private dinner', event: -8, status: 'closed', deposit: 'EFT',
    lines: [L('TAB13', 2), L('CHA14', 12), L('TBC08', 2), L('NAP84', 12), L('UND31', 12), L('CAN14', 2), L('VOT03', 10)],
    venue: '22 Eikenhof Close, Irene', createdDaysAgo: 30,
  });

  const ridge = job({
    client: 'c-ridge', branch: 'kdp', name: 'Spring fundraiser market', type: 'Other', event: -4, status: 'issues', deposit: 'Cash',
    lines: [L('TAB04', 12), L('CHA03', 80), L('MINI10', 8), L('NAP22', 40), L('GAME01', 1), L('GAME03', 1)],
    venue: 'Ridgeview Primary School hall, Krugersdorp', createdDaysAgo: 25,
  });
  ridge.returnNote!.lines['cha03'] = {state: 'damaged', qty: 2};
  ridge.returnNote!.lines['nap22'] = {state: 'short', qty: 3};
  ridge.returnNote!.lines['mini10'] = {state: 'dirty', qty: 1};
  const ridgeItem = (code: string) => items.find((i) => i.code === code)!;
  ridge.charges = [
    {id: 'ch1', label: '2 × Ancona chair – black, damaged (replacement)', amount: 2 * ridgeItem('CHA03').replacementCost, approved: false},
    {id: 'ch2', label: '3 × Napkin – mini matt black, missing (replacement)', amount: 3 * ridgeItem('NAP22').replacementCost, approved: false},
    {id: 'ch3', label: '1 × Standard cloth – black, wax stains (dry-cleaning)', amount: rand(120), approved: false},
  ];
  ridge.history.push({at: `${ridge.backDate}T11:05:00`, by: DEMO_USERS.driver, text: 'Return check found 3 issues — charges suggested for approval'});

  job({
    client: 'c-bloom', branch: 'pta', name: 'Mokoena–Smith wedding', type: 'Wedding', event: -21, status: 'closed', deposit: 'EFT', hirePaid: 0.4,
    lines: [L('TAB16', 5), L('CHA14', 50), L('MINI28', 8), L('NAP79', 50), L('UND18', 50), L('RUN146', 4), L('WED19', 1)],
    setup: 1200, notes: 'On 30-day account — balance still owing.', createdDaysAgo: 60,
  });

  job({
    client: 'c-kgosi', branch: 'pta', name: 'Quarterly strategy day', type: 'Conference', event: -1, out: -2, back: 0, status: 'on_hire', deposit: 'Cash',
    lines: [L('TAB04', 15), L('CHA03', 60), L('MINI10', 8), L('AIS06', 6), L('AIS02', 4)],
    venue: 'Kgosi Holdings, 3 Lenchen Ave North, Centurion', window: '14:00 – 16:00', driver: DEMO_USERS.driver, createdDaysAgo: 14,
  });

  job({
    client: 'c-nomsa', branch: 'pta', name: "Nomsa's baby shower", type: 'Baby shower', event: 0, out: 0, back: 1, status: 'packing', deposit: 'EFT',
    lines: [L('TAB05', 4), L('CHA10', 30), L('MINI11', 4), L('NAP60', 30), L('BAB01', 1), L('PROPS104', 1), L('CAKE31', 1), L('VAS197', 8)],
    window: '09:00 – 11:00', driver: DEMO_USERS.driver, notes: 'Gate code 2580. Set up under the lapa.', createdDaysAgo: 12,
  });

  job({
    client: 'c-green', branch: 'pta', name: 'Leadership breakfast', type: 'Corporate', event: 1, out: 1, back: 2, status: 'confirmed', deposit: 'EFT',
    lines: [L('TAB07', 6), L('CHA18', 40), L('MINI30', 6), L('NAP22', 40), L('CRO36', 40)],
    delivery: 350, window: '06:00 – 07:00', driver: DEMO_USERS.driver, createdDaysAgo: 9,
  });

  job({
    client: 'c-annelie', branch: 'kdp', name: "Annelie's 40th", type: 'Birthday', event: 3, status: 'quote_sent',
    lines: [L('TAB01', 5), L('CHA04', 24), L('TBC09', 6), L('UND15', 36), L('CAN14', 2), L('VOT06', 20), L('CAKE54', 1)],
    createdDaysAgo: 2,
  });

  const zanele = job({
    client: 'c-zanele', branch: 'pta', name: 'Lwazi turns 6', type: 'Birthday', event: 5, status: 'accepted',
    lines: [L('TAB10', 2), L('CHA05', 15), L('TBC14', 3), L('GAME02', 1), L('GAME05', 1)],
    fulfilment: 'collection', delivery: 0, createdDaysAgo: 6,
  });
  zanele.holdUntil = new Date(Date.now() - 6 * 3600_000).toISOString(); // hold has run out

  job({
    client: 'c-sarah', branch: 'pta', name: 'Van der Merwe wedding', type: 'Wedding', event: 10, status: 'confirmed', deposit: 'EFT',
    lines: [L('TAB16', 5), L('TAB13', 2), L('CHA10', 70), L('MINI28', 7), L('NAP79', 70), L('UND18', 70), L('RUN146', 5), L('CAN14', 3), L('VOT03', 16), L('AIS14', 1)],
    setup: 1500, delivery: 650, createdDaysAgo: 40, notes: 'Setup at 08:00 on the Friday. Florist arrives at 10:00.',
  });

  const bloomHold = job({
    client: 'c-bloom', branch: 'pta', name: 'Ndlovu–Jacobs wedding', type: 'Wedding', event: 10, status: 'accepted',
    lines: [L('TAB12', 2), L('CHA14', 40), L('MINI28', 3), L('NAP79', 40), L('UND31', 40), L('CAKE37', 1)],
    setup: 900, createdDaysAgo: 3,
  });
  bloomHold.holdUntil = new Date(Date.now() + 30 * 3600_000).toISOString();

  job({
    client: 'c-steyn', branch: 'kdp', name: 'Steyn wedding', type: 'Wedding', event: 17, status: 'confirmed', deposit: 'Cash',
    lines: [L('TAB16', 6), L('CHA14', 60), L('MINI63', 4), L('NAP59', 60), L('UND16', 60), L('RUN149', 6), L('FUR38', 2), L('WED18', 1)],
    setup: 1800, delivery: 850, venue: 'Bergsig farm, Magaliesburg', createdDaysAgo: 35,
  });

  job({
    client: 'c-michelle', branch: 'pta', name: 'Pillay engagement brunch', type: 'Private dinner', event: 24, status: 'draft',
    lines: [L('TAB45', 2), L('CHA12', 20), L('TBC23', 2), L('NAP60', 20)],
    createdDaysAgo: 1,
  });

  job({
    client: 'c-oaks', branch: 'kdp', name: 'Oaks open day', type: 'Corporate', event: 31, status: 'quote_sent',
    lines: [L('TAB07', 7), L('CHA04', 32), L('AIS03', 1), L('AIS06', 6), L('GAME01', 1), L('GAME09', 1)],
    createdDaysAgo: 4,
  });

  return {items, clients, jobs, settings, counters};
}
