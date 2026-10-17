# The arithmetic

Everything is measured in **days**, except where a unit is counted. That is the
whole vocabulary: a household says "a bottle lasts a month, a shop run takes
three days, I want a week spare", and the screen turns those three sentences into
two numbers and a headline.

All of it happens in one place, `planStock()` in
[`src/domain/stock-plan.ts`](../src/domain/stock-plan.ts). Nothing in the domain
layer reads a file, a browser or a clock.

## One unit, as time

`usageDays` is *how long one unit lasts*: a bottle that takes thirty days to get
through has `usageDays = 30`. The daily rate is the reciprocal of that — one unit
over thirty days — so the number the app asks for is already the rate you would
type, and nothing has to be converted by hand.

A thing that goes off before it is finished is gone when it goes off, not when it
is eaten. The plan therefore counts the shorter of use and shelf life:

$$
L = \max\left(1,\ \min(\text{usageDays},\ \text{freshDays})\right)
$$

The floor of a day is there so that something which will not keep at all is a
day's worth of use rather than a division by zero. The freshness slider's top
end, 365 days, means **never spoils** rather than a shelf life of exactly a year:
a shelf life longer than a unit lasts changes nothing, so the plan uses
`usageDays` as it is.

## From days to whole units

Four days of waiting at a roll every two days is two rolls, so days divided by
days-per-unit *is* the number of units — and it is rounded up, because a shelf is
counted in whole things:

$$
\text{waitUnits} = \left\lceil \frac{\text{leadDays}}{L} \right\rceil
\qquad
\text{reserveUnits} = \left\lceil \frac{\text{extraDays}}{L} \right\rceil
$$

The code divides rather than multiplying by $1/L$. The two are the same
arithmetic, but the reciprocal form rounds twice, and on some pairs it crosses a
whole unit: 273 days at 91 days a unit is exactly three units, while
$1/91 \times 273$ is `3.0000000000000004`, which the ceiling turns into four.

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
\text{days of cover} = \text{shelfAfterFetch} \times L
$$

`reorderPoint`, `fetchQuantity` and `shelfAfterFetch` are all whole numbers of
units, so the property tests can say so for any household's numbers.

## What each number is called on screen

| the plan's name | where it appears |
| --------------- | ---------------- |
| `waitUnits` | inside the **Fetch more at** caption — *"… for the wait"* |
| `reserveUnits` | **Keep at least** — the reserve, when there is one |
| `reorderPoint` | **Fetch more at** — the shelf level to shop at |
| `packsPerFetch` | *"a 10-pack"*, or *"3 packs of 10"* |
| `fetchQuantity` | *"Bring home …"* in the headline |
| `shelfAfterFetch` | *"you're at a level of N"*, and **N units ≈ M days of cover** |
| `packSize` | **Sold in packs of** — `1` is sold one at a time |

With no reserve the two cards both fall back to the level the shelf must not drop
below, and say that nothing is kept spare: there is no counter to watch when the
reserve is zero.

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

## When a thing goes off before it is finished

Butter eaten over a fortnight that turns sour a week after opening is a *weekly*
thing, not a fortnightly one: with `freshDays = 7` and `usageDays = 14`, each unit
is counted as gone in seven days. A household that eats two units a week and buys
them two at a time wastes one of them, and a plan that pretended otherwise would
be worse than no plan.

When `freshDays` is shorter than `usageDays`, the screen says so out loud, in the
same slot the days-of-cover line would otherwise fill, so the warning costs no
height of its own. The cover figure itself only appears from 640 px up: on a
phone that line is there for the warning, and for nothing else.

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
| *Down to 5 units? Bring home a 10-pack and you're at a level of 15, safe for emergencies.* | packs $= \max(1, \lceil 3 \div 10 \rceil) = 1$; level $= 5 + 10$ |
| `15 units ≈ 30 days of cover.` | $15 \times 2$ days |

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
