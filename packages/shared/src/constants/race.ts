/** Total ticks per race */
export const TICKS_PER_RACE = 24;

/** Minutes between ticks */
export const TICK_INTERVAL_MINUTES = 30;

/** Race duration in hours */
export const RACE_DURATION_HOURS = 12;

/** Number of racers per race */
export const RACERS_PER_RACE = 6;

/** Finish line position */
export const FINISH_LINE = 100.0;

/** Minimum speed (even with debuffs) */
export const MIN_SPEED = 0.5;

/** Race slots and their start hours (UTC) */
export const RACE_SCHEDULE = {
  A: { startHour: 0, endHour: 12 },
  B: { startHour: 12, endHour: 24 },
} as const;

/** Number of intents per racer (back + 5 actions) */
export const INTENTS_PER_RACER = 6;

/** Total addresses per race (6 racers × 6 intents) */
export const ADDRESSES_PER_RACE = 36;
