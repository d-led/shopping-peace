# The arithmetic

Everything is measured in **days**, except where a unit is counted. That is the
whole vocabulary: a household says "a bottle lasts a month, a shop run takes
three days, I want a week spare", and the screen turns those three sentences into
two numbers and a headline.

All of it happens in one place, `planStock()` in
[`src/domain/stock-plan.ts`](../src/domain/stock-plan.ts). Nothing in the domain
layer reads a file, a browser or a clock.

## How fast a thing goes, as two whole numbers

The app asks how fast a thing is used, and a household answers in one of two
ways: *a bottle lasts thirty days* (`usageUnits = 1`, `usageDays = 30`) or *two
tablets a day* (`usageUnits = 2`, `usageDays = 1`). Both are the same quantity —
`usageUnits` units every `usageDays` days — and neither number is ever a part of
a day. One a day is the edge the two answers share; nothing a household can say
falls between them.

The rate is kept as that pair rather than as the life of one unit, because the
life is not a number a machine holds for the interesting cases. A third of a day
is `0.333…`, and a quotient rounded up by it gains a whole unit: forty-five days
at three a day is exactly 135 units, and dividing by a third of a day gives 136.
Multiplied out by whole units over whole days, every comparison and every
round-up is exact.

A thing that goes off before it is finished is gone when it goes off, not when it
is eaten, so the plan uses whichever is the **faster**: the household's own rate,
or one unit per day of shelf life — and never anything slower than one unit a
day.

$$
R = \max\left(\min\left(\frac{\text{usageUnits}}{\text{usageDays}},\ \frac{1}{1}\right),\ \frac{1}{\text{freshDays}}\right)
\quad\text{and}\quad R = \frac{\text{usageUnits}}{\text{usageDays}}\ \text{when nothing spoils}
$$

The floor of a day is there so that something which will not keep at all is a
day's worth of use rather than a division by zero — and it is the *faster of the
two*, so a thing used twice a day is still planned at twice a day. The freshness
slider's top end, 365 days, means **never spoils** rather than a shelf life of
exactly a year: a shelf life longer than a unit lasts changes nothing.

## From days to whole units

Four days of waiting at a roll every two days is two rolls, so days multiplied by
the rate *is* the number of units — and it is rounded up, because a shelf is
counted in whole things:

$$
\text{waitUnits} = \left\lceil \frac{\text{leadDays} \times \text{usageUnits}}{\text{usageDays}} \right\rceil
\qquad
\text{reserveUnits} = \left\lceil \frac{\text{extraDays} \times \text{usageUnits}}{\text{usageDays}} \right\rceil
$$

This is where the rounding lives, and it is the reason the rate is a pair. The
two numbers chosen so far — four days of waiting, a roll every two days — cannot
cross a whole unit by accident, because the arithmetic is a product of integers
divided once. Written the other way round, as days divided by the life of a unit,
the divisor is the number that cannot be held: 273 days at 91 days a unit is
exactly three units, while $1/91 \times 273$ is `3.0000000000000004`, which the
ceiling turns into four.

## The plan

$$
\text{reorderPoint} = \text{waitUnits} + \text{reserveUnits}
$$

$$
\text{packsPerFetch} = \max\left(1,\ \left\lceil \frac{\text{reserveUnits}}{\text{packSize}} \right\rceil\right)
\qquad
\text{fetchQuantity} = \text{packsPerFetch} \times \text{packSize}
$$

$$
\text{shelfAfterFetch} = \text{reorderPoint} + \text{fetchQuantity}
\qquad
\text{days of cover} = \frac{\text{shelfAfterFetch} \times \text{usageDays}}{\text{usageUnits}}
$$

$$
\text{reservePacks} = \left\lfloor \frac{\text{reserveUnits}}{\text{packSize}} \right\rfloor
\qquad
\text{reserveLooseUnits} = \text{reserveUnits} - \text{reservePacks} \times \text{packSize}
$$

The last two are the reserve as it sits on the shelf rather than as it is bought:
whole packs, then the units outside one. With ten to a pack and 23 kept, a
cupboard holds *2 packs of 10 + 3 units*; where a shop sells one at a time there
is nothing to hold in packs, and the card simply says *3 units*.

`reorderPoint`, `fetchQuantity` and `shelfAfterFetch` are all whole numbers of
units, so the property tests can say so for any household's numbers.

## What each number is called on screen

| the plan's name | where it appears |
| --------------- | ---------------- |
| `waitUnits` | inside the **Fetch more at** caption — *"… for the wait"* |
| `reserveUnits` | **Keep at least** — the reserve, when there is one |
| `reservePacks`, `reserveLooseUnits` | **In reserve** — *"2 packs of 10 + 3 units"* |
| `reorderPoint` | **Fetch more at** — the shelf level to shop at |
| `packsPerFetch` | *"a 10-pack"*, or *"3 packs of 10"* |
| `fetchQuantity` | *"🛒 Fetch …"* in the headline |
| `shelfAfterFetch` | *"✓ you're at a level of N"*, and **N units × M days each ≈ K days of cover** |
| `reviewDays` | *"👀 Check the shelf every N days"*, the last clause of the headline |
| `packSize` | **Sold in packs of** — `1` is sold one at a time |

With no reserve the two cards both fall back to the level the shelf must not drop
below, and say there is no reserve: there is no counter to watch when the
reserve is zero.

## How often the shelf has to be looked at

The order point is only worth what it is checked against. A household does not
watch a shelf continuously, so between two looks the level can slip *past* the
point — and nothing is ordered until somebody looks. The reserve is what absorbs
that slip, and how much slip it absorbs is a length of time:

$$
r \cdot C \;\le\; \text{reserveUnits}
\qquad\Longrightarrow\qquad
C \;\le\; \frac{\text{reserveUnits}}{r} \;\approx\; \text{extraDays}
$$

where $r$ is the rate the shelf really goes down at and $C$ is the time between
looks. The worst case is the look that sees the shelf smallest without having
ordered: an order point plus a look's worth of use minus one interval of
consumption has to cover the wait, and the reserve is exactly what is left over
by the time the order lands.

So **the reserve in days is the review period**: a week of reserve means a look a
week, and no reserve means none at all — a look every day, which is the whole
reason a reserve is worth keeping. The figure on screen is
$\left\lfloor \text{reserveUnits} \cdot \frac{d}{u} \right\rfloor$ days, rounded
down so the promise is a length of time the reserve really covers; a roll every
two days with a week spare is four rolls, which is eight days of slack rather
than seven.

It holds through spoilage and through a thing used several times a day, because
the reserve is already counted at the rate the shelf really goes down at.

What it promises, and what it does not: **a look on time**. Skip a look and the
slip is twice the reserve, so the household is into the reserve itself — which is
what a reserve is for, once. It is not a statistical figure: nothing here has a
standard deviation, and the rate is whatever the household said it was.

## Three decisions

- **The reserve sits inside the order point.** That is what an order point means:
  shop when the shelf is down to the wait *plus* the safety stock, so the safety
  stock is still there when the order lands. Shopping at the wait alone would eat
  into the reserve while the order travels, and a reserve that gets eaten is not a
  reserve.
- **Each half is rounded on its own**: $\lceil \text{wait} \rceil + \lceil \text{reserve} \rceil$,
  not $\lceil \text{wait} + \text{reserve} \rceil$. A household can then see which
  part is the wait and which is the reserve — the **Fetch more at** caption adds
  them up out loud — and the rounding can put one extra unit on the shelf, where
  it is visible as reserve instead of hidden inside a single figure.
- **A fetch is whole packs covering the reserve**, at least one pack, because one
  pack is the smallest thing a shop will sell. It is not an economic order
  quantity: nothing here knows what a unit costs, and the question is when to
  shop, not how much money to tie up in a cupboard.

## The reserve is stock, not shopping

`reserveUnits` is a floor, not a quantity the plan spends. It sits inside the
order point, so it is what is left when the order lands, and nothing counts it as
stock that will be eaten. That is why it gets a card of its own, in plain
colours, away from the two numbers a household acts on.

Using the reserve is the abnormal case. When it happens, buying it back is a
separate shop from the usual top-up, and *how much to buy* is a different
question from *how much must be there* — which is why the reserve gets a card of
its own, in the packages a cupboard holds it in, away from the two numbers a
household acts on.

## When a thing goes off before it is finished

Butter eaten over a fortnight that turns sour a week after opening is a *weekly*
thing, not a fortnightly one: with `freshDays = 7` and `usageDays = 14`, each unit
is counted as gone in seven days. A household that eats two units a week and buys
them two at a time wastes one of them, and a plan that pretended otherwise would
be worse than no plan.

When `freshDays` is shorter than the time one unit takes to use up, the screen
says so out loud, in the same slot the days-of-cover line would otherwise fill,
so the warning costs no height of its own. The cover figure itself only appears
from 640 px up: on a phone that line is there for the warning, and for nothing
else.

A thing used faster than once a day has nothing to fear from a shelf life of a
day or more: two tablets a day means a unit is gone in half a day, so a three-day
shelf life never gets a chance to matter, and no warning is shown.

## When the shop only sells packs

A shop sells packages: ten rolls of toilet paper, twenty-four tins, six bottles.
Nothing about that changes how the thing is *used*, so it does not touch the level
kept at home — the cards stay in single units, because that is what a shelf is
counted in. It changes the fetching, since nobody sells three quarters of a pack:

$$
\text{packs to fetch} = \max\left(1,\ \left\lceil \frac{\text{reserve units}}{\text{pack size}} \right\rceil\right)
\qquad
\text{fetch} = \text{packs} \times \text{pack size}
$$

At least one pack, because one pack is the smallest thing a shop will sell: a
household that keeps no reserve still comes home with a pack, and the headline
says so rather than asking for a tenth of one.

## Ten rolls, worked through

A roll lasts two days, fetching takes four days, six days of reserve — three
rolls — and the shop sells tens.

| what the screen says | the numbers behind it |
| -------------------- | --------------------- |
| **Keep at least** `3` units spare | reserve $= \lceil 6 \div 2 \rceil = 3$ |
| **Fetch more at** `5` — *"3 spare + 2 for the wait"* | wait $= \lceil 4 \div 2 \rceil = 2$; reorder point $= 3 + 2$ |
| *🗄️ Down to 5 units? 🛒 Fetch a 10-pack and you're at a level of 15 ✓, safe for emergencies. 👀 Check the shelf every 6 days.* | packs $= \max(1, \lceil 3 \div 10 \rceil) = 1$; level $= 5 + 10$; looks $= \lfloor 3 \times 2 \rfloor$ |
| `15 units × 2 days each ≈ 30 days of cover.` | $15 \times 2$ days |

A shop will not sell three spare rolls, so the household comes home with ten —
seven more spare than it asked for — and the plan says so rather than pretending
the reserve came out exactly right. The level the headline quotes is the one a
fetch aims at: the shelf level you shop at, plus the pack that arrives. Days of
cover counts from that level, which is why the pack shows up as cupboard space in
the figure the household can picture.

## Compared with the textbook

The classic order point is

$$
ROP = \left\lceil \text{rate} \times \text{lead time} + \text{buffer stock} \right\rceil
$$

which folds the buffer into the rate and rounds once. This app keeps the same
shape in whole units — wait plus reserve — with two differences worth naming:

- the two halves are rounded separately, so the shop-at level can sit one unit
  above the textbook figure, and that unit is visible as wait or as reserve;
- the order quantity is not modelled. A fetch is the reserve in whole packs, at
  least one, of whatever size the shop sells, so a household that keeps no reserve
  still comes home with a pack.
