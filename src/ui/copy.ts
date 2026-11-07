import { InvalidPresetFileError } from '../data/presets-file';
import {
  effectiveRate,
  effectiveUsageDays,
  type PlanTrouble,
  type Rate,
  type StockPlan,
} from '../domain/stock-plan';
import { UNNAMED_ITEM, type StockItem } from '../domain/stock-item';

/** What to call a thing on screen, even when it has not been named yet. */
export function itemName(item: StockItem): string {
  return item.name.trim() === '' ? UNNAMED_ITEM : item.name;
}

/** The name with its picture in front, which is how the shelf reads. */
export function itemLabel(item: StockItem): string {
  return item.emoji === '' ? itemName(item) : `${item.emoji} ${itemName(item)}`;
}

/** The picture a thing has, or a face to stand for having none yet. */
export function pictureOf(item: StockItem): string {
  return item.emoji === '' ? '🙂' : item.emoji;
}

/**
 * What the picture button reads. The same words are its accessible name, with
 * what pressing it does said beside them: a screen reader should hear the
 * label a household can see, not a word that is not on the button.
 */
export function pictureButtonLabel(item: StockItem): string {
  return `${pictureOf(item)} Picture`;
}

/**
 * The instruction a busy person reads from across the kitchen, in one paragraph
 * so it costs one block of height: the level to shop at, what to fetch, the level
 * that lands, and how often the shelf has to be looked at — which is what the
 * reserve is for.
 *
 * The marks are the household's own landmarks, one per fact: the shelf, the cart,
 * the tick for a level that holds, and eyes for a look at the shelf. The tick sits
 * straight after the number it is about, where it reads as "this one holds".
 *
 * With no reserve there is nothing on the shelf but the wait itself, so there is
 * no quantity to name: the household tops up as the shelf reaches that level, and
 * looks every day because nothing is there to absorb a missed look.
 *
 * With a reserve, the level a fetch lands on is named for what it is: a shelf that
 * still carries the whole emergency reserve, a pack's worth above the floor the
 * household asked for. A bigger pack leaves a bigger surplus, and saying so out
 * loud is what stops those extra units reading as stock that appeared from
 * nowhere.
 */
export function planHeadline(plan: StockPlan): string {
  return headlineParts(plan)
    .map((part) => part.text)
    .join('');
}

/**
 * A piece of the instruction: words, or one figure with the meaning it carries.
 *
 * The parts exist so that a figure can be explained where it stands — the words
 * have one home, and a number's meaning is fixed by the sentence rather than by
 * counting how many numbers came before it.
 */
export interface HeadlinePart {
  readonly text: string;
  /** What this part's figure means, when it is a figure worth explaining. */
  readonly hint?: string;
}

/**
 * The instruction, in pieces, the figures carrying the sum they came from.
 *
 * Nothing here is said inline, and nothing is a sentence: a household that points
 * at a number wants to check it, not to read, so each explanation is the two
 * numbers that make it, each named for what it counts. The names are what makes
 * a sum checkable — a bare pair of numbers only says that two numbers exist —
 * and the words stop at naming: "2 days of slack" says what the figure is, not
 * how a household should feel about it.
 */
export function headlineParts(plan: StockPlan): readonly HeadlinePart[] {
  const look = lookClause(plan);
  const shelf: HeadlinePart = {
    text: units(plan.reorderPoint),
    hint: `${plan.waitUnits} for the wait + ${plan.reserveUnits} spare`,
  };

  if (plan.reserveUnits === 0) {
    return [
      { text: '🗄️ Down to ' },
      shelf,
      { text: '? No reserve, so 🛒 fetch ' },
      fetchPart(plan),
      { text: ' as this one runs out. ' },
      ...look,
    ];
  }

  return [
    { text: '🗄️ Down to ' },
    shelf,
    { text: '? 🛒 Fetch ' },
    fetchPart(plan),
    { text: " and you're at a level of " },
    {
      text: `${plan.shelfAfterFetch} ✓,`,
      hint: `if you buy ${plan.fetchQuantity} at ${plan.reorderPoint} left`,
    },
    ...safetyClause(plan),
    ...look,
  ];
}

/**
 * What the level a fetch lands on is safe against.
 *
 * "Safe for emergencies" is a claim, and the reserve is what has to make it
 * good: a spare of two days answers a shop that slips by two days and no more.
 * When the spare is thinner than the wait — which is most household plans, since
 * nobody keeps three weeks of coffee — the words say how much slack there really
 * is, in the same length of time the look interval is measured in. The two
 * figures coming out the same number is the point: the spare is what the looking
 * and the waiting are both paid out of.
 */
function safetyClause(plan: StockPlan): readonly HeadlinePart[] {
  if (plan.reserveUnits >= plan.waitUnits) {
    return [{ text: ' safe for emergencies. ' }];
  }

  const spare = spareDays(plan);
  return [
    { text: ' safe for ' },
    { text: String(spare), hint: slackHint(plan) },
    { text: ` ${dayWord(spare)} of slack. ` },
  ];
}

/** The spare as a length of time: never less than a day, since a day is the unit. */
function spareDays(plan: StockPlan): number {
  return Math.max(1, plan.reviewDays);
}

/**
 * What to fetch, and why it is that size. A pack is what a fetch brings home,
 * whichever way the shop is counted, so the pack is the reason the number is
 * bigger than the reserve — worth one line of words, and not worth saying when
 * things are fetched one at a time.
 */
function fetchPart(plan: StockPlan): HeadlinePart {
  return plan.packSize > 1
    ? { text: packed(plan), hint: `fetched in packs of ${plan.packSize}` }
    : { text: packed(plan) };
}

/**
 * How often the shelf has to be looked at, in the one currency a household has
 * for it: a length of time.
 *
 * A whole day is the shortest interval the sentence can ask for, so a reserve
 * thinner than a day's use — or none at all — falls back to "every day" rather
 * than to "never": the cure for a thin reserve is a bigger reserve.
 */
function lookClause(plan: StockPlan): readonly HeadlinePart[] {
  if (plan.reviewDays <= 1) {
    return [{ text: '👀 Check the shelf every day.' }];
  }

  return [
    { text: '👀 Check the shelf every ' },
    { text: String(plan.reviewDays), hint: slackHint(plan) },
    { text: ' days.' },
  ];
}

/**
 * Where the look interval comes from: the spare, counted at the rate it goes.
 *
 * Two days is not two days because two days was typed anywhere — it is six units
 * of spare at three a day, and the words say which number is which. What the
 * spare cannot reach is a slow shop; that is said in the sentence, where it
 * belongs, because it is a fact about the plan and not about this figure.
 */
function slackHint(plan: StockPlan): string {
  return `${plan.reserveUnits} spare${daysPerUnitStep(plan.daysPerUnit)} ≈ ${days(plan.reviewDays)}`;
}

/**
 * How the fetching is asked for: in single units, or in whole packages when the
 * shop does not sell them one at a time. A shop will not sell three quarters of
 * a pack, and coming home with more of something that keeps is better than
 * coming home with less than the household wanted.
 */
function packed(plan: StockPlan): string {
  const { packSize, packsPerFetch, reserveUnits } = plan;
  if (packSize === 1) {
    return reserveUnits === 0 ? 'the next unit' : `${plan.fetchQuantity} more`;
  }
  return packsPerFetch === 1 ? `a ${packSize}-pack` : `${packsPerFetch} packs of ${packSize}`;
}

/**
 * How long the shelf lasts once a fetch has landed — the number a household can
 * picture, and the one that says how much cupboard space this needs. It counts
 * the packages, so it can be higher than the reserve.
 *
 * The working is shown rather than just the answer, because a figure a household
 * cannot check is a figure it has to take on trust: thirty-two units at three a
 * day is thirty-two divided by three, and saying so is what makes eleven days
 * believable. A unit that lasts longer than a day is counted the other way round,
 * because that is how a household holds it.
 */
export function planCover(item: StockItem, plan: StockPlan): string {
  const rate = effectiveRate(item);
  const everyUnit = rate.days / rate.units;
  const cover = Math.round(plan.shelfAfterFetch * everyUnit);

  return `${units(plan.shelfAfterFetch)}${countedAt(rate)} ≈ ${days(cover)} of cover.`;
}

/** The rate the units are counted at, or nothing when it is one a day. */
function countedAt(rate: Rate): string {
  return daysPerUnitStep(rate.days / rate.units);
}

/**
 * Units turned into days in one step a household can follow: "÷ 3 a day" for a
 * thing used several times a day, "× 30 days each" for a slow one.
 */
function daysPerUnitStep(daysPerUnit: number): string {
  if (daysPerUnit === 1) {
    return '';
  }
  return daysPerUnit > 1
    ? ` × ${oneDecimal(daysPerUnit)} days each`
    : ` ÷ ${oneDecimal(1 / daysPerUnit)} a day`;
}

/** A rate as a household would say it: 3, or 1.5, and never 1.5000000001. */
function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * Said out loud when a thing turns before the household gets through a unit,
 * because the numbers below then count a unit shorter than its own use would.
 */
export function spoilsWarning(item: StockItem): string {
  const turns = item.freshDays === 0 ? 'at once' : `${days(item.freshDays)} after opening`;
  return `It turns ${turns}, so a unit is really gone in ${days(effectiveUsageDays(item))}, not the ${days(oneUnitLasts(item))} it takes to use up.`;
}

/**
 * Each way a plan cannot work, said in one line a household can act on.
 *
 * Kept beside the spoilage sentence they replace or accompany, and deliberately
 * short: these appear in the one alert slot the screen has, and a warning nobody
 * finishes reading is not a warning.
 */
const TROUBLE_WORDING: Readonly<Record<PlanTrouble, (item: StockItem) => string>> = {
  'nothing-keeps': (item) =>
    `It keeps for no time at all, and fetching takes ${days(item.leadDays)}: nothing fetched can still be good.`,
  'no-reserve': () => 'Nothing spare: the shelf is empty exactly as a fetch lands.',
  'spoils-before-used': (item) => spoilsWarning(item),
};

/** What is wrong with a plan, as the sentence the alert slot shows. */
export function troubleWords(trouble: PlanTrouble, item: StockItem): string {
  return TROUBLE_WORDING[trouble](item);
}

/** One of the two plan cards: the number, and what the number counts. */
export interface PlanCard {
  readonly value: number;
  readonly caption: string;
}

/**
 * The reserve, as the counter a household watches: the units kept above what a
 * wait eats. It is not spent while an order travels — that is the whole point
 * of a reserve — so this number stays true from one fetch to the next.
 *
 * With no reserve there is no counter to watch, so the card falls back to the
 * level the shelf must not drop below and says that nothing is spare.
 */
export function keepCard(plan: StockPlan): PlanCard {
  if (plan.reserveUnits === 0) {
    return { value: plan.reorderPoint, caption: `${unitWord(plan.reorderPoint)} — no reserve` };
  }
  return { value: plan.reserveUnits, caption: `${unitWord(plan.reserveUnits)} spare` };
}

/**
 * Where the reserve figure comes from, as the two numbers that make it: how fast
 * the thing goes, and how many days of it the household wants spare.
 *
 * The rate is said the way the usage row says it — "3/day" for a thing used
 * several times a day, "1 every 30 days" for a slow one — because that is the
 * phrasing the household typed a moment ago.
 */
export function reserveCalculation(item: StockItem, plan: StockPlan): string {
  return `${rateLabel(plan.daysPerUnit)} × ${item.extraDays} days reserve`;
}

/** The rate in the words the usage row uses, for the sums a pointer asks about. */
function rateLabel(daysPerUnit: number): string {
  return daysPerUnit > 1
    ? `1 every ${oneDecimal(daysPerUnit)} days`
    : `${oneDecimal(1 / daysPerUnit)}/day`;
}

/**
 * When to shop: the level the shelf is allowed to fall to, which is the wait
 * plus the reserve. The caption adds the two up out loud, because a household
 * counting bottles should not have to work out where the number came from.
 */
export function fetchCard(plan: StockPlan): PlanCard {
  const { reorderPoint, reserveUnits, waitUnits } = plan;
  if (reserveUnits === 0 || waitUnits === 0) {
    return { value: reorderPoint, caption: `${unitWord(reorderPoint)} left` };
  }
  return {
    value: reorderPoint,
    caption: `${reserveUnits} spare + ${waitUnits} for the wait`,
  };
}

/**
 * The reserve as it sits on the shelf, rather than as it is bought: whole
 * packs, then the units outside one. `2 packs of 10 + 3 units` is a cupboard a
 * household can look at and check; `23 units` is only a sum.
 */
export function reserveHolding(plan: StockPlan): string {
  const { packSize, reservePacks, reserveLooseUnits } = plan;
  if (packSize === 1) {
    return units(plan.reserveUnits);
  }
  if (reservePacks === 0) {
    return onTheirOwn(reserveLooseUnits);
  }
  const whole = packCount(reservePacks, packSize);
  return reserveLooseUnits === 0 ? whole : `${whole} + ${units(reserveLooseUnits)}`;
}

/** The subtitle under each thing in the picker. */
export function itemSummary(item: StockItem): string {
  const sold = item.packSize > 1 ? ` · ${item.packSize} per pack` : '';
  return `${rateOfUse(item)} · ${days(item.leadDays)} to fetch${sold}`;
}

/**
 * How fast a thing goes, in the words a household would use for it: a bottle
 * that lasts a month is not described as "0.03 a day", and a thing used twice a
 * day is not described as "one unit lasts half a day". Quicker than a unit a day
 * is said in units; anything else is said in how long one lasts.
 */
function rateOfUse(item: StockItem): string {
  return oneUnitLasts(item) < 1
    ? `${perDay(item)} a day`
    : `1 unit lasts ${days(oneUnitLasts(item))}`;
}

/** Days one unit lasts, which is what a household reads for a slow thing. */
function oneUnitLasts(item: StockItem): number {
  return item.usageDays / item.usageUnits;
}

/** Units a day, for the things that go quicker than that. */
function perDay(item: StockItem): number {
  return item.usageUnits / item.usageDays;
}

/** "1 thing" / "3 things", for the export and import messages. */
export function countThings(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'}`;
}

/** The question before a thing disappears, naming it so there is no doubt. */
export function deleteQuestion(item: StockItem): string {
  return `Delete ${item.name.trim() === '' ? 'this thing' : itemLabel(item)}?`;
}

/** What to say when the file somebody picked was not a presets file. */
export function importFailed(error: unknown): string {
  return error instanceof InvalidPresetFileError ? error.message : 'That file could not be read.';
}

/** Asking to replace the shelf, naming where the replacement is coming from. */
export function replaceQuestion(here: number, incoming: number, source: string): string {
  return `Replace the ${countThings(here)} here with the ${countThings(incoming)} in ${source}?`;
}

/**
 * Importing replaces the shelf, so it asks first and says what is at stake —
 * including how many things are about to be replaced.
 */
export function importQuestion(here: number, incoming: number): string {
  return replaceQuestion(here, incoming, 'this file');
}

/** The same question for a shelf that arrived in a link, which is not a file. */
export function sharedShelfQuestion(here: number, incoming: number): string {
  return replaceQuestion(here, incoming, 'this link');
}

export function exportedNotice(count: number): string {
  return `Exported ${countThings(count)}.`;
}

export function importedNotice(count: number): string {
  return `Imported ${countThings(count)}.`;
}

/** The shelf in a link has replaced what was here, which is worth saying. */
export function openedSharedShelfNotice(count: number): string {
  return `Opened the shelf in the link: ${countThings(count)}.`;
}

/**
 * A link goes to the clipboard on anything that is not a phone. The household
 * still has to be told, because copying leaves nothing on the screen to see.
 */
export function linkCopiedNotice(): string {
  return 'Link copied — paste it wherever it is going.';
}

/** No share sheet, and no clipboard either: that is worth complaining about. */
export function linkNotSharedNotice(): string {
  return 'The link could not be shared.';
}

/** Nothing to lose is worth saying: a reset on an empty shelf loses nothing. */
export function resetNotice(discarded: number): string {
  return discarded === 0
    ? 'Back to the starter things.'
    : `Back to the starter things — ${countThings(discarded)} of yours deleted.`;
}

/**
 * A notice says its piece and goes. Three words a second is a household reading
 * over the sink rather than a novel, and the two seconds before that are for
 * noticing that something appeared at all. Nothing says less than three seconds
 * or longer than ten, however long the sentence is: a line that will not go
 * away is a line in the way.
 */
const WORDS_PER_SECOND = 3;
const NOTICING_SECONDS = 2;
const LEAST_SECONDS = 3;
const MOST_SECONDS = 10;

export function readingTime(text: string): number {
  const words = text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  const seconds = Math.ceil(NOTICING_SECONDS + words / WORDS_PER_SECOND);

  return Math.min(MOST_SECONDS, Math.max(LEAST_SECONDS, seconds)) * 1000;
}

/** What a reset throws away is everything, so it asks first. */
export function resetQuestion(count: number): string {
  return `Delete all ${countThings(count)} and start again from the starter ones?`;
}

function days(count: number): string {
  return `${count} ${dayWord(count)}`;
}

/** The word alone, for figures a caller has already written out. */
function dayWord(count: number): string {
  return count === 1 ? 'day' : 'days';
}

/** The word on its own, for captions that already have a number above them. */
function unitWord(count: number): string {
  return count === 1 ? 'unit' : 'units';
}

function units(count: number): string {
  return `${count} ${unitWord(count)}`;
}

/** "1 pack of 10", "2 packs of 10": a shop's unit, as a shelf reads it. */
function packCount(count: number, size: number): string {
  return `${count} ${count === 1 ? 'pack' : 'packs'} of ${size}`;
}

/** Units that are not inside a whole package, out on the shelf. */
function onTheirOwn(count: number): string {
  return `${units(count)} on ${count === 1 ? 'its' : 'their'} own`;
}
