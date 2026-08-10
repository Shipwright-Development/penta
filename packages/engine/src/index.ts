export type { Suit, Rank, Card, PlayerId, GameId } from './types/card';
export { PLAYER_IDS } from './types/card';
export type { DealContext, RoundResult, GameModule, RankingDirection } from './types/game';
export {
  STANDARD_DECK,
  shuffle,
  middleCardValue,
  firstCardRecipient,
  dealClockwise,
  dealForGame,
} from './card/deck';
export type { DealOutcome } from './card/deck';
export type { Rng } from './rng';
export { makeRng, pick } from './rng';
export {
  STANDARD_SUIT_RANK,
  CAPSA_SUIT_RANK,
  STANDARD_CARD_RANK,
  CAPSA_CARD_RANK,
  RUMPUN_CARD_VALUE,
  SEVEN_DISCARD_VALUE,
  SEVEN_ACE_VALUE,
} from './card/ordering';
export type { AceConvention } from './card/ordering';

export type { PlayerScores, MarkerTally, PentaBreakdown } from './scoring';
export {
  zeroScores,
  cumulativeScores,
  markerTally,
  placementPoints,
  PLACEMENT_POOL,
  pentaTally,
  pentaStandings,
  champion,
  roundMarkers,
  roundTo2dp,
} from './scoring';

export { GAME_ORDER, nextDealer, createEngine, BATU_SCHEMA_VERSION } from './flow';
export type {
  BatuState,
  BatuSettings,
  ActiveGame,
  Phase,
  ModuleRegistry,
  AnyGameModule,
  Engine,
  EngineOptions,
  SerializedBatu,
} from './flow';

export {
  newTrick,
  ledSuit,
  nextToPlay,
  isTrickComplete,
  trickWinner,
  followSuitMoves,
  leadMoves,
} from './trick/trick';
export type { PlayedCard, TrickState } from './trick/trick';

export {
  createTrumpModule,
  trumpDealValid,
  trumpScores,
  cardBidValue,
  bidValue,
  bidSuit,
  trumpFromBid,
  highestBidder,
  legalBids,
  isValidBid,
  isNumberCard,
  isFaceCard,
  MIN_TWO_CARD_BID,
  MAX_SHOUT,
} from './games/trump';
export type {
  TrumpState,
  TrumpMove,
  TrumpPhase,
  TrumpScoringInput,
  Bid,
  BidSuit,
} from './games/trump';

export { createCapsaModule, classify, beats, allCombos } from './games/capsa';
export type { CapsaState, CapsaMove, Combo, ComboType } from './games/capsa';

export { createHeartsModule } from './games/hearts';
export type { HeartsState, HeartsMove, HeartsPhase } from './games/hearts';

export { createRumpunModule } from './games/rumpun';
export type { RumpunState, RumpunMove, Pile } from './games/rumpun';
