import React from 'react';
import { Sequence } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { OutroSlide } from '../components/OutroSlide';
import type { LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 5;
const SECTION_DUR = FPS * 13;
const OUTRO_DUR = FPS * 5;

/**
 * Lesson 4: Four Lapping (Advanced)
 */
export const FourLappingAdvanced: React.FC<LessonData> = (lesson) => {
  let offset = 0;

  return (
    <>
      <Sequence from={offset} durationInFrames={TITLE_DUR} name="Title">
        <TitleSlide title={lesson.title} lessonNumber={lesson.number} />
      </Sequence>
      {(offset += TITLE_DUR, null)}

      {lesson.sections.map((sec, i) => {
        const from = offset + i * SECTION_DUR;
        return (
          <Sequence key={i} from={from} durationInFrames={SECTION_DUR} name={sec.heading}>
            <SectionSlide section={sec} index={i} />
          </Sequence>
        );
      })}
      {(offset += lesson.sections.length * SECTION_DUR, null)}

      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} nextTitle="Expert Decision Framework" />
      </Sequence>
    </>
  );
};
