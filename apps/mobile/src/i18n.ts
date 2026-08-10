import { create } from 'zustand';

export type Lang = 'en' | 'id';

interface Entry {
  en: string;
  id: string;
}

/**
 * Every user-facing string lives here, keyed once and translated to both
 * languages. Game/concept proper nouns (batu, Trump, No-Trump) stay as-is.
 * `{name}`-style placeholders are filled by t()'s params argument.
 */
const STRINGS = {
  'app.name': { en: 'Penta', id: 'Penta' },
  'title.tagline': {
    en: 'Pass & play on one device',
    id: 'Main bergiliran di satu perangkat',
  },
  'title.new': { en: 'New Trump round', id: 'Ronde Trump baru' },

  'setup.title': { en: 'Set up players', id: 'Atur pemain' },
  'setup.seatHint': {
    en: 'Seat order is clockwise',
    id: 'Urutan kursi searah jarum jam',
  },
  'setup.name': { en: 'Nickname', id: 'Nama panggilan' },
  'setup.player': { en: 'Player {n}', id: 'Pemain {n}' },
  'setup.language': { en: 'Language', id: 'Bahasa' },
  'setup.undo': { en: 'Allow undo', id: 'Izinkan urungkan' },
  'setup.on': { en: 'On', id: 'Nyala' },
  'setup.off': { en: 'Off', id: 'Mati' },
  'setup.start': { en: 'Start', id: 'Mulai' },
  'setup.fillAll': { en: 'Enter all four nicknames', id: 'Isi keempat nama' },

  'dealing.title': { en: 'Dealing', id: 'Membagikan' },
  'dealing.dealer': { en: '{name} deals', id: '{name} membagi' },
  'dealing.deal': { en: 'Deal cards', id: 'Bagikan kartu' },

  'handoff.pass': { en: 'Pass to {name}', id: 'Berikan ke {name}' },
  'handoff.lookAway': {
    en: 'Everyone else, look away',
    id: 'Yang lain, jangan melihat',
  },
  'handoff.reveal': { en: 'Tap to reveal', id: 'Ketuk untuk melihat' },

  'bid.title': { en: 'Your secret bid', id: 'Tawaran rahasiamu' },
  'bid.hint': {
    en: 'Tap the bid you want to place',
    id: 'Ketuk tawaran yang ingin dipasang',
  },
  'bid.value': { en: 'bid {n}', id: 'tawar {n}' },
  'bid.shout': { en: 'shout {n}', id: 'seru {n}' },
  'bid.nt': { en: 'No-Trump', id: 'Tanpa Truf' },

  'reveal.title': { en: 'Bids revealed', id: 'Tawaran dibuka' },
  'reveal.highest': {
    en: 'Highest bidder: {name}',
    id: 'Penawar tertinggi: {name}',
  },
  'reveal.trump': { en: 'Trump: {suit}', id: 'Truf: {suit}' },
  'reveal.nt': { en: 'No-Trump', id: 'Tanpa Truf' },
  'reveal.needAdjust': {
    en: 'Bids total 13 — an adjustment is needed',
    id: 'Total tawaran 13 — perlu penyesuaian',
  },
  'reveal.continue': { en: 'Continue', id: 'Lanjut' },

  'adjust.title': {
    en: '{name}: adjust every bid',
    id: '{name}: sesuaikan semua tawaran',
  },
  'adjust.hint': {
    en: 'Pick a non-zero amount applied to all four bids',
    id: 'Pilih jumlah bukan nol untuk semua tawaran',
  },

  'trick.trumpIs': { en: 'Trump {suit}', id: 'Truf {suit}' },
  'trick.nt': { en: 'No-Trump', id: 'Tanpa Truf' },
  'trick.turn': { en: '{name} to play', id: 'Giliran {name}' },
  'trick.leads': { en: '{name} leads', id: '{name} memimpin' },
  'trick.tricks': { en: 'Tricks won', id: 'Trik dimenangkan' },
  'trick.target': { en: 'target {n}', id: 'target {n}' },
  'trick.hint': {
    en: 'Tap a highlighted card',
    id: 'Ketuk kartu yang menyala',
  },
  'trick.undo': { en: 'Undo', id: 'Urungkan' },
  'trick.undoConfirm': { en: 'Undo — sure?', id: 'Urungkan — yakin?' },

  'trickResult.title': {
    en: 'Trick won by {name}',
    id: 'Trik dimenangkan {name}',
  },

  'summary.title': { en: 'Trump round complete', id: 'Ronde Trump selesai' },
  'summary.winners': { en: '□ Winner(s)', id: '□ Pemenang' },
  'summary.losers': { en: '▼ Loser(s)', id: '▼ Kalah' },
  'summary.none': { en: 'none', id: 'tidak ada' },
  'summary.note': {
    en: 'Vertical slice ends here — the other four games arrive in later stages.',
    id: 'Irisan vertikal berakhir di sini — empat game lain menyusul nanti.',
  },
  'summary.again': { en: 'Play again', id: 'Main lagi' },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
export type Params = Record<string, string | number>;

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLang = create<LangStore>((set) => ({
  lang: 'en',
  setLang: (lang) => set({ lang }),
}));

export function translate(key: StringKey, lang: Lang, params?: Params): string {
  let out = STRINGS[key][lang];
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

/** Hook returning a translate function bound to the current language. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: StringKey, params?: Params) => translate(key, lang, params);
}
