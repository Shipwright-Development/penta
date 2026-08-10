import { create } from 'zustand';

export type Lang = 'en' | 'id';

interface Entry {
  en: string;
  id: string;
}

/**
 * Every user-facing string, keyed once and translated to both languages.
 * Game/concept proper nouns (batu, Rumpun, Capsa Banting, No-Trump) stay as-is
 * in both. `{name}`-style placeholders are filled by t()'s params argument.
 */
const STRINGS = {
  'app.name': { en: 'Penta', id: 'Penta' },
  'title.tagline': { en: 'Pass & play on one device', id: 'Main bergiliran di satu perangkat' },
  'title.new': { en: 'New batu', id: 'Batu baru' },
  'title.resume': { en: 'Resume saved batu', id: 'Lanjutkan batu tersimpan' },

  'setup.title': { en: 'Set up players', id: 'Atur pemain' },
  'setup.seatHint': { en: 'Seat order is clockwise', id: 'Urutan kursi searah jarum jam' },
  'setup.name': { en: 'Nickname', id: 'Nama panggilan' },
  'setup.player': { en: 'Player {n}', id: 'Pemain {n}' },
  'setup.language': { en: 'Language', id: 'Bahasa' },
  'setup.undo': { en: 'Allow undo', id: 'Izinkan urungkan' },
  'setup.on': { en: 'On', id: 'Nyala' },
  'setup.off': { en: 'Off', id: 'Mati' },
  'setup.start': { en: 'Start batu', id: 'Mulai batu' },
  'setup.fillAll': { en: 'Enter all four nicknames', id: 'Isi keempat nama' },

  'game.trump': { en: 'Trump', id: 'Trump' },
  'game.seven': { en: 'Seven', id: 'Seven' },
  'game.hearts': { en: 'Hearts', id: 'Hearts' },
  'game.rumpun': { en: 'Rumpun', id: 'Rumpun' },
  'game.capsa': { en: 'Capsa Banting', id: 'Capsa Banting' },

  'deal.next': { en: 'Next: {game} · Round {n}', id: 'Berikutnya: {game} · Ronde {n}' },
  'deal.dealer': { en: '{name} deals', id: '{name} membagi' },
  'deal.button': { en: 'Shuffle & deal', id: 'Kocok & bagikan' },

  'ritual.title': { en: 'Dealing', id: 'Membagikan' },
  'ritual.flip': { en: 'Middle card flipped', id: 'Kartu tengah dibuka' },
  'ritual.recipient': { en: '{name} receives the first card', id: '{name} menerima kartu pertama' },
  'ritual.continue': { en: 'Continue', id: 'Lanjut' },

  'handoff.pass': { en: 'Pass to {name}', id: 'Berikan ke {name}' },
  'handoff.lookAway': { en: 'Everyone else, look away', id: 'Yang lain, jangan melihat' },
  'handoff.reveal': { en: 'Tap to reveal', id: 'Ketuk untuk melihat' },

  'turn.turn': { en: '{name} to play', id: 'Giliran {name}' },
  'turn.done': { en: 'Confirm', id: 'Konfirmasi' },

  'bid.title': { en: 'Your secret bid', id: 'Tawaran rahasiamu' },
  'bid.hint': { en: 'Tap the bid you want to place', id: 'Ketuk tawaran yang ingin dipasang' },
  'bid.value': { en: 'bid {n}', id: 'tawar {n}' },
  'bid.shout': { en: 'shout {n}', id: 'seru {n}' },
  'bid.nt': { en: 'No-Trump', id: 'Tanpa Truf' },

  'reveal.title': { en: 'Bids revealed', id: 'Tawaran dibuka' },
  'reveal.highest': { en: 'Highest bidder: {name}', id: 'Penawar tertinggi: {name}' },
  'reveal.trump': { en: 'Trump: {suit}', id: 'Truf: {suit}' },
  'reveal.needAdjust': {
    en: 'Bids total 13 — an adjustment is needed',
    id: 'Total tawaran 13 — perlu penyesuaian',
  },
  'reveal.nt': { en: 'No-Trump', id: 'Tanpa Truf' },
  'reveal.continue': { en: 'Continue', id: 'Lanjut' },

  'adjust.title': { en: '{name}: adjust every bid', id: '{name}: sesuaikan semua tawaran' },
  'adjust.hint': {
    en: 'Pick a non-zero amount applied to all four bids',
    id: 'Pilih jumlah bukan nol untuk semua tawaran',
  },

  'trick.trumpIs': { en: 'Trump {suit}', id: 'Truf {suit}' },
  'trick.nt': { en: 'No-Trump', id: 'Tanpa Truf' },
  'trick.tricks': { en: 'Tricks', id: 'Trik' },
  'trick.target': { en: 'target {n}', id: 'target {n}' },
  'trick.hint': { en: 'Tap a highlighted card', id: 'Ketuk kartu yang menyala' },
  'trick.leads': { en: '{name} leads', id: '{name} memimpin' },
  'trick.wonBy': { en: 'Trick won by {name}', id: 'Trik dimenangkan {name}' },
  'trick.undo': { en: 'Undo', id: 'Urungkan' },
  'trick.undoConfirm': { en: 'Undo — sure?', id: 'Urungkan — yakin?' },

  'hearts.pass': { en: 'Pass 3 cards {dir}', id: 'Berikan 3 kartu {dir}' },
  'hearts.left': { en: 'left', id: 'ke kiri' },
  'hearts.right': { en: 'right', id: 'ke kanan' },
  'hearts.across': { en: 'across', id: 'ke seberang' },
  'hearts.selectHint': { en: 'Select exactly 3 cards', id: 'Pilih tepat 3 kartu' },
  'hearts.confirm': { en: 'Pass these 3', id: 'Berikan 3 ini' },
  'hearts.broken': { en: 'Hearts broken', id: 'Hati sudah pecah' },
  'hearts.taken': { en: 'Penalty taken', id: 'Penalti diambil' },

  'capsa.currentCombo': { en: 'To beat', id: 'Yang dikalahkan' },
  'capsa.freeLead': { en: 'Lead anything', id: 'Pimpin bebas' },
  'capsa.selectHint': {
    en: 'Tap cards to form a play',
    id: 'Ketuk kartu untuk membentuk permainan',
  },
  'capsa.play': { en: 'Play selected', id: 'Mainkan pilihan' },
  'capsa.pass': { en: 'Pass', id: 'Lewat' },
  'capsa.left': { en: '{n} left', id: 'sisa {n}' },
  'capsa.illegal': { en: 'Not a legal play', id: 'Bukan permainan sah' },

  'seven.board': { en: 'Board', id: 'Papan' },
  'seven.starting': { en: 'Starting suit {suit}', id: 'Suit awal {suit}' },
  'seven.aces': { en: 'Aces: {conv}', id: 'As: {conv}' },
  'seven.aceNone': { en: 'undecided', id: 'belum ditentukan' },
  'seven.aceUnder': { en: 'under 2s', id: 'di bawah 2' },
  'seven.aceAbove': { en: 'above Ks', id: 'di atas K' },
  'seven.playHint': {
    en: 'Tap a highlighted card to play',
    id: 'Ketuk kartu menyala untuk bermain',
  },
  'seven.mustDiscard': {
    en: 'No legal play — discard a card',
    id: 'Tak ada langkah — buang satu kartu',
  },
  'seven.aceWhich': { en: 'Place the ace at which end?', id: 'Taruh as di ujung mana?' },
  'seven.aceAboveBtn': { en: 'Above the King', id: 'Di atas King' },
  'seven.aceBelowBtn': { en: 'Below the 2', id: 'Di bawah 2' },
  'seven.discards': { en: 'Discards', id: 'Buangan' },

  'rumpun.trumpIs': { en: 'Trump {suit}', id: 'Truf {suit}' },
  'rumpun.piles': { en: 'Table piles', id: 'Tumpukan meja' },
  'rumpun.yourHand': { en: 'Your hand & pile tops', id: 'Tanganmu & atas tumpukan' },
  'rumpun.score': { en: 'Score', id: 'Skor' },

  'summary.title': { en: '{game} · Round {n}', id: '{game} · Ronde {n}' },
  'summary.roundScore': { en: 'Round', id: 'Ronde' },
  'summary.total': { en: 'Total', id: 'Total' },
  'summary.winners': { en: '□', id: '□' },
  'summary.losers': { en: '▼', id: '▼' },
  'summary.continue': { en: 'Continue', id: 'Lanjut' },

  'tally.title': { en: '{game} — penta tally', id: '{game} — hitung penta' },
  'tally.placement': { en: 'Placement', id: 'Peringkat' },
  'tally.markers': { en: 'Markers', id: 'Penanda' },
  'tally.penta': { en: 'Penta', id: 'Penta' },
  'tally.continue': { en: 'Continue', id: 'Lanjut' },

  'sheet.title': { en: 'Score sheet', id: 'Lembar skor' },
  'sheet.total': { en: 'Total', id: 'Total' },
  'sheet.close': { en: 'Close', id: 'Tutup' },
  'sheet.round': { en: 'R{n}', id: 'R{n}' },

  'standings.title': { en: 'Penta standings', id: 'Klasemen penta' },
  'standings.tallied': { en: '{n} of 5 games tallied', id: '{n} dari 5 game dihitung' },

  'champion.title': { en: 'Champion', id: 'Juara' },
  'champion.shared': { en: 'Shared victory', id: 'Kemenangan bersama' },
  'champion.newBatu': { en: 'New batu', id: 'Batu baru' },

  'pause.title': { en: 'Paused', id: 'Jeda' },
  'pause.resumeGame': { en: 'Resume', id: 'Lanjutkan' },
  'pause.scoreSheet': { en: 'Score sheet', id: 'Lembar skor' },
  'pause.standings': { en: 'Standings', id: 'Klasemen' },
  'pause.language': { en: 'Language', id: 'Bahasa' },
  'pause.abandon': { en: 'Abandon batu', id: 'Tinggalkan batu' },
  'pause.abandonConfirm': {
    en: 'Abandon? The save is discarded.',
    id: 'Tinggalkan? Simpanan dihapus.',
  },

  'common.menu': { en: 'Menu', id: 'Menu' },
  'common.scores': { en: 'Scores', id: 'Skor' },
  'common.close': { en: 'Close', id: 'Tutup' },
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
    for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
  }
  return out;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return (key: StringKey, params?: Params) => translate(key, lang, params);
}

/** i18n key for a game's display name. */
export function gameNameKey(gameId: string): StringKey {
  return `game.${gameId}` as StringKey;
}
