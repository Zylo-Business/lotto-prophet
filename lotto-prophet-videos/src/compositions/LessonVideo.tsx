import React from 'react';
import { Sequence } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { OutroSlide } from '../components/OutroSlide';
import { LESSONS, type LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 5;        // 5 seconds
const SECTION_DUR = FPS * 12;     // 12 seconds per section
const OUTRO_DUR = FPS * 5;        // 5 seconds

interface Props {
  lessonSlug: string;
}

/**
 * Generic lesson video — looks up lesson by slug and renders
 * TitleSlide → SectionSlides → OutroSlide as a sequence.
 */
export const LessonVideo: React.FC<Props> = ({ lessonSlug }) => {
  const lesson = LESSONS.find((l) => l.slug === lessonSlug) ?? LESSONS[0];
  const lessonIndex = LESSONS.findIndex((l) => l.slug === lesson.slug);
  const nextTitle = lessonIndex < LESSONS.length - 1 ? LESSONS[lessonIndex + 1].title : undefined;

  let offset = 0;

  return (
    <>
      <Sequence from={offset} durationInFrames={TITLE_DUR} name="Title">
        <TitleSlide title={lesson.title} lessonNumber={lesson.number} />
      </Sequence>
      {(() => {
        offset += TITLE_DUR;
        return null;
      })()}

      {lesson.sections.map((sec, i) => {
        const from = TITLE_DUR + i * SECTION_DUR;
        return (
          <Sequence key={i} from={from} durationInFrames={SECTION_DUR} name={sec.heading}>
            <SectionSlide section={sec} index={i} />
          </Sequence>
        );
      })}

      <Sequence
        from={TITLE_DUR + lesson.sections.length * SECTION_DUR}
        durationInFrames={OUTRO_DUR}
        name="Outro"
      >
        <OutroSlide
          lessonTitle={lesson.title}
          lessonNumber={lesson.number}
          nextTitle={nextTitle}
        />
      </Sequence>
    </>
  );
};
