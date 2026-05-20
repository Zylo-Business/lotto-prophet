MODULE 1: Understanding Ghana Lottery 5/90
Objective:

Understand how the 5/90 system works.

Key Concepts:

5 numbers drawn from 1–90

Organized by events (EV.1, EV.2, EV.3…)

Numbers arranged in vertical columns

Machine vs Source tracking

Practical Exercise:

Create a vertical grid of past 10 events

Align numbers by position (1–5)

MODULE 2: Understanding Lapping
What is Lapping?

Lapping occurs when:

The same number appears directly under another in the same column across consecutive events.

Example:
EV.1   →  75
EV.2   →  75  ← Lapping
Types of Lapping:

🔹 Two Lapping (2 consecutive vertical matches)

🔹 Three Lapping (3 vertical matches)

🔹 Four Lapping (Rare)

MODULE 3: Two Lapping Strategy
How to Detect:

Check column alignment.

Compare EV(n) with EV(n-1).

Look for identical vertical values.

Forecast Rule:

👉 The number under the lapping position in the next event becomes a strong candidate.

Practice:

Analyze 20 past events

Mark all two-lapping cases

Record what happened next

MODULE 4: Three Lapping Strategy
Example:

81
37
84

Three numbers aligned vertically across events.

Why Stronger?

Indicates vertical continuation pressure

More reliable than two lapping

Forecast Rule:

Play the next event under the triple lapping

Check historical occurrence

MODULE 5: Four Lapping (Advanced)
Characteristics:

Rare

High attention event

Must verify history before playing

Expert Rule:

Do NOT auto-play

Confirm pattern repetition history

MODULE 6: Expert Decision Framework

Experts evaluate:

Number of lapping (2, 3, 4)

Historical replay of pattern

Column position (machine alignment)

Event timing (which EV)

🧠 PRACTICAL ANALYTICS IMPLEMENTATION (Using Your Schema)

Now let's implement the logic using your database schema.

We will:

Use DrawFlat

Detect vertical lapping

Forecast next event candidates

💻 JavaScript Function: Detect Lapping & Forecast

Assumptions:

Data is ordered by event_number

We compare by number positions (N1–N5)

/**
 * Detect lapping patterns in DrawFlat data
 * @param {DrawFlat[]} draws - ordered by event_number ascending
 * @returns {Object} lapping report
 */
function analyzeLapping(draws) {
  const results = [];

  for (let i = 1; i < draws.length; i++) {
    const previous = draws[i - 1];
    const current = draws[i];

    const lappingPositions = [];

    for (let pos = 1; pos <= 5; pos++) {
      const prevValue = previous[`N${pos}`];
      const currValue = current[`N${pos}`];

      if (prevValue === currValue) {
        lappingPositions.push({
          position: pos,
          value: currValue
        });
      }
    }

    if (lappingPositions.length > 0) {
      results.push({
        event_number: current.event_number,
        lapping_count: lappingPositions.length,
        details: lappingPositions
      });
    }
  }

  return results;
}
🔮 Forecast Next Event Based on Lapping
/**
 * Forecast strong candidates for next event
 * @param {DrawFlat[]} draws
 */
function forecastNext(draws) {
  const lapping = analyzeLapping(draws);

  if (lapping.length === 0) return [];

  const lastLapping = lapping[lapping.length - 1];
  const nextEvent = draws.find(d => d.event_number === lastLapping.event_number + 1);

  if (!nextEvent) return [];

  return lastLapping.details.map(lap => ({
    position: lap.position,
    predicted_number: nextEvent[`N${lap.position}`]
  }));
}
🧮 Detect Three Lapping (Advanced)
function detectTripleLapping(draws) {
  const triples = [];

  for (let i = 2; i < draws.length; i++) {
    const d1 = draws[i - 2];
    const d2 = draws[i - 1];
    const d3 = draws[i];

    for (let pos = 1; pos <= 5; pos++) {
      if (
        d1[`N${pos}`] === d2[`N${pos}`] &&
        d2[`N${pos}`] === d3[`N${pos}`]
      ) {
        triples.push({
          event_number: d3.event_number,
          position: pos,
          value: d3[`N${pos}`]
        });
      }
    }
  }

  return triples;
}
🏗 How This Fits Your Schema

DrawFlat → Used for analysis

Draw → Event tracking

NumberSet → N vs M separation

Prediction → Store forecast results

User → Personal forecast history

🚀 Lotto Prophet 2 — Implementation Status

All lapping analysis features are now fully implemented across the stack:

### Server API (`server/routes/tools.ts`)

| Route | Description |
|---|---|
| `GET /api/tools/lapping-2/:source` | Two-lapping analysis. Query: `columns`, `limit`, `row1`, `row2` |
| `GET /api/tools/lapping-3/:source` | Three-lapping analysis. Query: `columns`, `limit`, `row1`, `row2`, `row3` |

- Draws returned in **latest-first** order (`ORDER BY event_number DESC`)
- Column modes: `main` (N1–N5), `machine` (M1–M5), `all` (N1–N5, M1–M5)
- Pattern values: 1–90 = exact match, 0 = wildcard
- Response includes: `draws`, `grid`, `columnNames`, `highlights`, `lappingRows`, `patternRows`

### Desktop (Next.js — `lotto-prophet/`)

| Page | Features |
|---|---|
| `/tools/lapping-2` | Source/columns/limit selectors, 2-row pattern grid (N1–N5 or M1–M5 headers), fill from draw dropdown (latest first), Clear / Search Pattern buttons, results table with indigo highlight, stats badges |
| `/tools/lapping-3` | Same as above but with 3-row grid, default pattern, amber highlight theme, Defaults button |

### Mobile (Expo — `Lotto-Prophet-Mobile/`)

| Screen | Features |
|---|---|
| `lapping-2` | Horizontal chip selectors, 2-row pattern grid, fill from draw chips (latest first), Clear / Search buttons, FlatList with indigo highlights, floating side nav rail |
| `lapping-3` | Same as above but with 3-row grid, default pattern, amber theme, Defaults button |

### Fill from Draw Feature

Users can populate the pattern grid from actual draw data:
- A "Fill from draw" selector shows event numbers from the loaded draws (latest first)
- Selecting an event fills all pattern rows from consecutive draws starting at that event index
- Available on both web (dropdown) and mobile (horizontal chip scroll)
### Cross-Game Search

Users can search the same pattern across multiple lottery games simultaneously:
- An “Also search in” multi-select allows checking additional game sources (e.g. Lucky Tuesday when viewing Alpha Lotto)
- When searching, the pattern is run against all selected sources in parallel
- A **Cross-Game Results** summary appears below the pattern grid showing per-source statistics (draws, hits, rate)
- **Desktop:** Summary cards are clickable — clicking scrolls to the full cross-game detail table for that source
- **Mobile:** Summary cards are tappable — tapping switches the primary source to view its full results
- Cross-game detail tables (desktop) show the same full results format as the primary source
### Pattern Matching Logic

**Two-lapping (with pattern):** For each column c, slides a 2-row window through the data. Checks if `data[r][c]` matches `pattern[0][c]` AND `data[r+1][c]` matches `pattern[1][c]`.

**Two-lapping (default / no pattern):** Detects any identical value in the same column across two consecutive draws.

**Three-lapping:** For each column c, slides a 3-row window. Checks all three rows against the 3-row pattern. Default pattern: `[61,60,17,8,75], [55,28,11,6,47], [53,29,22,75,82]`.