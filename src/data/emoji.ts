/**
 * The emoji a household can put in front of a thing's name, with the words
 * people actually type when looking for them.
 *
 * Curated rather than complete: the emoji keyboards built into phones are the
 * complete ones, and searching four thousand of them is slower than searching
 * the hundred and thirty things a shelf actually holds. Everything here is a
 * single code point (or a code point plus a variation selector), because the
 * joined-up sequences look broken wherever the fonts disagree.
 */
export interface EmojiOption {
  readonly symbol: string;
  readonly keywords: readonly string[];
}

const CATALOGUE: readonly EmojiOption[] = [
  // Cleaning, the bathroom, and the medicine shelf
  { symbol: '🧽', keywords: ['sponge', 'scourer', 'washing up', 'dishwasher'] },
  { symbol: '🧼', keywords: ['soap', 'bar soap', 'hand wash'] },
  { symbol: '🧴', keywords: ['detergent', 'lotion', 'shampoo', 'bottle', 'laundry'] },
  { symbol: '🧻', keywords: ['toilet paper', 'loo roll', 'kitchen roll', 'tissues'] },
  { symbol: '🧺', keywords: ['laundry basket', 'hamper', 'washing'] },
  { symbol: '🧹', keywords: ['broom', 'sweeping', 'dustpan', 'brush'] },
  { symbol: '🪣', keywords: ['bucket', 'mop', 'pail'] },
  { symbol: '🗑️', keywords: ['bin', 'bin bags', 'rubbish', 'trash'] },
  { symbol: '🫧', keywords: ['bubbles', 'dishwasher', 'washing up liquid'] },
  { symbol: '🧯', keywords: ['fire extinguisher', 'extinguisher'] },
  { symbol: '🪒', keywords: ['razor', 'shaving', 'blades'] },
  { symbol: '🪥', keywords: ['toothbrush', 'toothpaste', 'teeth'] },
  { symbol: '🧷', keywords: ['safety pins', 'nappy pins', 'pins'] },
  { symbol: '💄', keywords: ['makeup', 'lipstick', 'cosmetics'] },
  { symbol: '😷', keywords: ['face masks', 'masks', 'sanitiser'] },
  { symbol: '🩹', keywords: ['plasters', 'bandage', 'first aid'] },
  { symbol: '💊', keywords: ['medicine', 'tablets', 'painkillers', 'vitamins'] },
  { symbol: '🌡️', keywords: ['thermometer', 'fever', 'temperature'] },
  { symbol: '🚿', keywords: ['shower gel', 'shampoo', 'rinse'] },
  { symbol: '🛁', keywords: ['bath', 'bubble bath', 'bathtub'] },
  { symbol: '🚽', keywords: ['toilet', 'loo', 'wc'] },

  // The kitchen cupboard
  { symbol: '🥛', keywords: ['milk', 'carton', 'cream'] },
  { symbol: '🧈', keywords: ['butter', 'margarine', 'spread'] },
  { symbol: '🧀', keywords: ['cheese', 'cheddar', 'parmesan'] },
  { symbol: '🥚', keywords: ['eggs', 'egg box'] },
  { symbol: '🍞', keywords: ['bread', 'loaf', 'toast'] },
  { symbol: '🥐', keywords: ['croissants', 'pastry', 'bakery'] },
  { symbol: '🥣', keywords: ['cereal', 'oats', 'muesli', 'porridge'] },
  { symbol: '🍝', keywords: ['pasta', 'spaghetti', 'noodles'] },
  { symbol: '🍚', keywords: ['rice', 'grains', 'couscous'] },
  { symbol: '🥫', keywords: ['tinned tomatoes', 'cans', 'canned food', 'beans'] },
  { symbol: '🧂', keywords: ['salt', 'seasoning', 'spices', 'pepper'] },
  { symbol: '🍯', keywords: ['honey', 'syrup', 'jam', 'preserve'] },
  { symbol: '🍫', keywords: ['chocolate', 'cocoa', 'snacks'] },
  { symbol: '🍪', keywords: ['biscuits', 'cookies', 'crackers'] },
  { symbol: '🥜', keywords: ['nuts', 'peanuts', 'peanut butter'] },
  { symbol: '🥔', keywords: ['potatoes', 'chips', 'crisps'] },
  { symbol: '🥕', keywords: ['carrots', 'vegetables', 'veg'] },
  { symbol: '🧄', keywords: ['garlic', 'bulbs'] },
  { symbol: '🧅', keywords: ['onions', 'shallots'] },
  { symbol: '🍅', keywords: ['tomatoes', 'tomato sauce', 'passata'] },
  { symbol: '🥬', keywords: ['lettuce', 'salad', 'greens', 'spinach'] },
  { symbol: '🥦', keywords: ['broccoli', 'vegetables', 'greens'] },
  { symbol: '🥑', keywords: ['avocado', 'avocados'] },
  { symbol: '🍋', keywords: ['lemons', 'citrus', 'lemon juice'] },
  { symbol: '🍌', keywords: ['bananas', 'fruit'] },
  { symbol: '🍎', keywords: ['apples', 'fruit'] },
  { symbol: '🍇', keywords: ['grapes', 'fruit'] },
  { symbol: '🍓', keywords: ['strawberries', 'berries', 'fruit'] },
  { symbol: '🍗', keywords: ['chicken', 'meat', 'poultry'] },
  { symbol: '🥩', keywords: ['steak', 'beef', 'mince', 'meat'] },
  { symbol: '🥓', keywords: ['bacon', 'ham', 'sausages'] },
  { symbol: '🐟', keywords: ['fish', 'seafood', 'tuna'] },
  { symbol: '🌭', keywords: ['hot dogs', 'sausages', 'frankfurters'] },
  { symbol: '🍳', keywords: ['oil', 'frying pan', 'cooking'] },
  { symbol: '🥘', keywords: ['pan', 'casserole', 'wok', 'dish'] },
  { symbol: '🧊', keywords: ['ice', 'ice cubes', 'freezer bags'] },
  { symbol: '☕', keywords: ['coffee', 'coffee beans', 'ground coffee'] },
  { symbol: '🍵', keywords: ['tea', 'tea bags', 'green tea'] },
  { symbol: '🫖', keywords: ['teapot', 'kettle', 'loose tea'] },
  { symbol: '🥤', keywords: ['juice', 'soft drinks', 'squash'] },
  { symbol: '💧', keywords: ['water', 'bottled water', 'filter'] },
  { symbol: '🍷', keywords: ['wine', 'bottle', 'vinegar'] },
  { symbol: '🍺', keywords: ['beer', 'lager', 'drinks'] },

  // Paper, parcels, and the shelf itself
  { symbol: '📦', keywords: ['box', 'parcels', 'cardboard', 'packaging'] },
  { symbol: '📄', keywords: ['paper', 'printing paper', 'printer', 'documents'] },
  { symbol: '✉️', keywords: ['envelopes', 'letters', 'mail', 'post'] },
  { symbol: '🏷️', keywords: ['labels', 'price tags', 'sticky labels'] },
  { symbol: '📝', keywords: ['notepad', 'list', 'notes', 'shopping list'] },
  { symbol: '✏️', keywords: ['pencil', 'pens', 'stationery'] },
  { symbol: '✂️', keywords: ['scissors', 'cutting', 'craft'] },
  { symbol: '📏', keywords: ['ruler', 'measuring tape', 'tape measure'] },
  { symbol: '🔋', keywords: ['batteries', 'rechargeable', 'battery'] },
  { symbol: '🔌', keywords: ['plug', 'charger', 'adaptor', 'extension lead'] },
  { symbol: '💡', keywords: ['light bulbs', 'lamp', 'fuse'] },
  { symbol: '🕯️', keywords: ['candles', 'matches', 'lighters'] },
  { symbol: '📚', keywords: ['books', 'reading', 'notebooks'] },

  // Pets, plants, and everything else a household fetches
  { symbol: '🐾', keywords: ['cat litter', 'pets', 'dog food', 'pet food'] },
  { symbol: '🐱', keywords: ['cat', 'kitten', 'cat food'] },
  { symbol: '🐶', keywords: ['dog', 'puppy', 'dog food'] },
  { symbol: '🐦', keywords: ['bird seed', 'birds', 'wildlife'] },
  { symbol: '🐠', keywords: ['fish food', 'aquarium', 'pond'] },
  { symbol: '🪴', keywords: ['plant pots', 'houseplant', 'compost'] },
  { symbol: '🌱', keywords: ['seeds', 'seedlings', 'garden'] },
  { symbol: '🌸', keywords: ['flowers', 'bouquet', 'gift'] },
  { symbol: '🧸', keywords: ['teddy', 'toys', 'children'] },
  { symbol: '🎈', keywords: ['balloons', 'party', 'birthday'] },
  { symbol: '🧩', keywords: ['puzzles', 'games', 'jigsaws'] },
  { symbol: '🎲', keywords: ['dice', 'board games', 'games'] },
  { symbol: '⚽', keywords: ['football', 'ball', 'sports'] },
  { symbol: '🎾', keywords: ['tennis balls', 'tennis', 'ball games'] },
  { symbol: '🎨', keywords: ['paints', 'art supplies', 'craft'] },
  { symbol: '🖌️', keywords: ['paintbrush', 'paint', 'decorating'] },
  { symbol: '👕', keywords: ['clothes', 't-shirt', 'washing powder'] },
  { symbol: '🧦', keywords: ['socks', 'clothes', 'tights'] },
  { symbol: '🧤', keywords: ['gloves', 'clothes', 'rubber gloves'] },
  { symbol: '👟', keywords: ['shoes', 'trainers', 'laces', 'insoles'] },
  { symbol: '🧢', keywords: ['cap', 'hat', 'sun hat'] },
  { symbol: '🕶️', keywords: ['sunglasses', 'sun cream', 'summer'] },
  { symbol: '☂️', keywords: ['umbrella', 'rain', 'brolly'] },
  { symbol: '🎒', keywords: ['backpack', 'school bag', 'rucksack'] },
  { symbol: '🔑', keywords: ['keys', 'keyring', 'spare key'] },
  { symbol: '🔒', keywords: ['padlock', 'locks', 'security'] },
  { symbol: '🔨', keywords: ['hammer', 'nails', 'tools'] },
  { symbol: '🔧', keywords: ['spanner', 'wrench', 'tools'] },
  { symbol: '🚗', keywords: ['car', 'windscreen wash', 'motoring'] },
  { symbol: '⛽', keywords: ['petrol', 'fuel', 'diesel'] },
  { symbol: '📱', keywords: ['phone', 'mobile', 'sim card'] },
  { symbol: '💻', keywords: ['laptop', 'computer', 'printer ink'] },
  { symbol: '🎧', keywords: ['headphones', 'earphones', 'earbuds'] },
  { symbol: '⌚', keywords: ['watch', 'smartwatch', 'watch battery'] },
  { symbol: '💳', keywords: ['card', 'credit card', 'gift card'] },
  { symbol: '💰', keywords: ['money', 'cash', 'savings'] },
  { symbol: '🧾', keywords: ['receipt', 'bill', 'invoice'] },
  { symbol: '📅', keywords: ['calendar', 'dates', 'planner'] },
  { symbol: '⏰', keywords: ['timer', 'clock', 'alarm'] },
  { symbol: '🛒', keywords: ['shopping', 'trolley', 'groceries'] },
  { symbol: '🛍️', keywords: ['shopping bags', 'carrier bags', 'bags'] },
  { symbol: '🎁', keywords: ['gift', 'present', 'wrapping paper'] },
];

/** What a shelf shows when nobody has typed anything yet. */
const BROWSE_LIMIT = 24;

/**
 * The emoji worth offering for what was typed, best match first. Words are
 * matched anywhere in a keyword, so "paper" finds both the roll and the tray,
 * and every word has to match, so "cat food" is narrower than "food".
 */
export function searchEmoji(query: string, limit = BROWSE_LIMIT): readonly EmojiOption[] {
  const words = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((word) => word !== '');

  if (words.length === 0) {
    return CATALOGUE.slice(0, limit);
  }

  return CATALOGUE.filter((option) => scoreOf(option, words) > 0)
    .sort((left, right) => scoreOf(right, words) - scoreOf(left, words))
    .slice(0, limit);
}

/**
 * How well the words fit, or zero for no fit at all. A keyword that begins
 * with what was typed counts double: somebody typing "mil" wants milk before
 * they want toothpaste.
 */
function scoreOf(option: EmojiOption, words: readonly string[]): number {
  let total = 0;

  for (const word of words) {
    const keyword = option.keywords.find((candidate) => candidate.includes(word));
    if (keyword === undefined) {
      return 0;
    }
    total += keyword.startsWith(word) ? 2 : 1;
  }

  return total;
}

/**
 * The prefix a name already has: one pictograph, plus any variation selector
 * or zero-width joiner that trails it.
 */
const LEADING_EMOJI = /^\p{Extended_Pictographic}(?:\u200d|\ufe0f)*\s*/u;

/** The name with `symbol` in front of it, replacing any emoji already there. */
export function withEmoji(name: string, symbol: string): string {
  const bare = name.replace(LEADING_EMOJI, '');
  return bare === '' ? symbol : `${symbol} ${bare}`;
}
