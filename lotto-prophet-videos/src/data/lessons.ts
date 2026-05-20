/** Lesson data matching the DB-seeded lapping course content. */
export interface LessonData {
  title: string;
  slug: string;
  number: number;
  sections: Section[];
}

export interface Section {
  heading: string;
  body: string;
  /** Optional emoji for the section icon */
  icon?: string;
}

export const LESSONS: LessonData[] = [
  {
    title: 'Understanding Lapping',
    slug: 'understanding-lapping',
    number: 1,
    sections: [
      {
        heading: 'What is Lapping?',
        body: 'Lapping occurs when the same number appears directly under another in the same column across consecutive events.',
        icon: '🔍',
      },
      {
        heading: 'Visual Example',
        body: 'EV.1  →  75\nEV.2  →  75  ← Lapping!\n\nThe number 75 repeats in the same column position.',
        icon: '📊',
      },
      {
        heading: 'Types of Lapping',
        body: '🔹 Two Lapping — 2 consecutive vertical matches\n🔹 Three Lapping — 3 consecutive matches, stronger signal\n🔹 Four Lapping — Very rare, requires historical verification',
        icon: '📐',
      },
      {
        heading: 'Why It Matters',
        body: 'Lapping signals vertical continuation pressure — a tendency for that column to maintain or shift in a predictable way.',
        icon: '💡',
      },
    ],
  },
  {
    title: 'Two Lapping Strategy',
    slug: 'two-lapping-strategy',
    number: 2,
    sections: [
      {
        heading: 'Detection Steps',
        body: '1. Arrange draws vertically by event number\n2. Check each column (N1–N5 or M1–M5)\n3. Compare EV(n) with EV(n-1) in the same column\n4. If values match → Two Lapping found!',
        icon: '🔎',
      },
      {
        heading: 'Forecast Rule',
        body: '👉 The number that appears under a lapping position in the next event becomes a strong candidate for prediction.',
        icon: '🎯',
      },
      {
        heading: 'Practice Exercise',
        body: '• Pull the last 20 events from any draw source\n• Mark all two-lapping occurrences\n• Record the next number in that column\n• Track pattern accuracy',
        icon: '✏️',
      },
      {
        heading: 'Use the Tool',
        body: 'The Lapping 2 tool under Tools automates this detection across all your draw sources with visual highlighting.',
        icon: '🔧',
      },
    ],
  },
  {
    title: 'Three Lapping Strategy',
    slug: 'three-lapping-strategy',
    number: 3,
    sections: [
      {
        heading: 'What is Three Lapping?',
        body: 'Three Lapping occurs when the same column shows matching values across 3 consecutive events — a sustained signal.',
        icon: '🔄',
      },
      {
        heading: 'Why Is It Stronger?',
        body: '• Sustained vertical continuation pressure\n• The longer a pattern holds, the more significant\n• More reliable than two lapping for forecasting',
        icon: '📈',
      },
      {
        heading: 'Forecast Rule',
        body: '👉 Play the next event under the triple lapping position\n👉 Always verify with historical occurrence',
        icon: '🎯',
      },
      {
        heading: 'The Pattern Matrix',
        body: 'The Lapping 3 tool uses a specific pattern reference matrix to scan draws. When 3 consecutive rows match, those cells are highlighted.',
        icon: '📋',
      },
    ],
  },
  {
    title: 'Four Lapping (Advanced)',
    slug: 'four-lapping-advanced',
    number: 4,
    sections: [
      {
        heading: 'Characteristics',
        body: '• Extremely rare — only in unusual draw sequences\n• High attention event when detected\n• Must verify historical repetition',
        icon: '⚡',
      },
      {
        heading: 'Expert Rule',
        body: '⚠️ Do NOT auto-play based on four lapping alone\n✅ Confirm pattern history across multiple sources\n✅ Check if the same pattern has occurred before',
        icon: '🛡️',
      },
      {
        heading: 'High-Confidence Signal',
        body: 'Four lapping represents the strongest form of vertical continuation. It deserves extra analysis and careful position tracking.',
        icon: '🔥',
      },
    ],
  },
  {
    title: 'Expert Decision Framework',
    slug: 'expert-decision-framework',
    number: 5,
    sections: [
      {
        heading: 'Evaluation Criteria',
        body: 'Experts evaluate lapping using multiple dimensions for a confidence score.',
        icon: '🧠',
      },
      {
        heading: '1. Number of Lapping',
        body: 'Higher count = stronger signal\n2-lap → moderate, 3-lap → strong, 4-lap → very strong',
        icon: '📊',
      },
      {
        heading: '2. Historical Replay',
        body: 'Has this exact pattern occurred before? What happened next? Historical confirmation adds confidence.',
        icon: '📜',
      },
      {
        heading: '3. Column + Event Timing',
        body: 'Some columns are historically more predictable. Certain events within a cycle carry more weight.',
        icon: '⏱️',
      },
    ],
  },
  {
    title: 'Practical Analytics with Tools',
    slug: 'practical-analytics',
    number: 6,
    sections: [
      {
        heading: 'Lapping 2 Tool',
        body: '• Select source and column mode\n• Scans consecutive draws for identical values\n• Highlighted balls show lapping detection\n• Side navigation jumps to lapping rows',
        icon: '🔧',
      },
      {
        heading: 'Lapping 3 Tool',
        body: '• Works with a pattern reference matrix\n• Scans 3-row windows per column\n• Highlighted cells indicate pattern matches\n• Navigate matched rows via side nav',
        icon: '🔧',
      },
      {
        heading: 'Best Practices',
        body: '• Start with 200 draws for speed + coverage\n• Compare Main vs Machine columns\n• Use the lapping count in the stats bar\n• Cross-reference with your predictions',
        icon: '📊',
      },
    ],
  },
];
