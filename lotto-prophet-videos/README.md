# Lotto Prophet Videos

Remotion-powered animated explainer videos for the **Lotto Prophet University** lapping course.

## Structure

```
src/
  Root.tsx              ← Registers all compositions
  index.ts              ← Remotion entry point
  data/lessons.ts       ← Lesson content matching DB seeds
  styles/theme.ts       ← Shared design tokens
  components/
    TitleSlide.tsx       ← Animated title screen
    SectionSlide.tsx     ← Content section with line-by-line reveal
    LappingColumn.tsx    ← Animated lottery ball column
    OutroSlide.tsx       ← Completion / CTA screen
  compositions/
    LessonVideo.tsx      ← Generic lesson renderer (by slug)
    LappingIntro.tsx     ← Lesson 1: Understanding Lapping
    TwoLappingStrategy   ← Lesson 2: Two Lapping Strategy
    ThreeLappingStrategy ← Lesson 3: Three Lapping Strategy
    FourLappingAdvanced  ← Lesson 4: Four Lapping (Advanced)
    ExpertFramework      ← Lesson 5: Expert Decision Framework
    PracticalAnalytics   ← Lesson 6: Practical Analytics with Tools
scripts/
  render-all.ts          ← Batch render all lessons to MP4
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Open Remotion Studio (preview all compositions)
pnpm start

# Render a single lesson
npx remotion render Lesson-UnderstandingLapping out/lesson-1.mp4

# Render all lessons
pnpm build:all
```

## Compositions

| ID | Lesson | Duration |
|----|--------|----------|
| `Lesson-UnderstandingLapping` | Understanding Lapping | ~60s |
| `Lesson-TwoLappingStrategy` | Two Lapping Strategy | ~60s |
| `Lesson-ThreeLappingStrategy` | Three Lapping Strategy | ~60s |
| `Lesson-FourLappingAdvanced` | Four Lapping (Advanced) | ~60s |
| `Lesson-ExpertFramework` | Expert Decision Framework | ~60s |
| `Lesson-PracticalAnalytics` | Practical Analytics with Tools | ~60s |
| `LappingCourse` | Full course (all sections) | ~6min |

## Customization

- **Theme**: Edit `src/styles/theme.ts` for colors, fonts
- **Content**: Edit `src/data/lessons.ts` to update section text
- **Animations**: Each composition in `src/compositions/` has its own demo sequences
- **Duration**: Adjust `FPS * N` constants in each composition file
