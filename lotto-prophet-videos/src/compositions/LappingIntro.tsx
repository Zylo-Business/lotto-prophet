import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { LappingColumn } from '../components/LappingColumn';
import { OutroSlide } from '../components/OutroSlide';
import { THEME } from '../styles/theme';
import type { LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 6;
const SECTION_DUR = FPS * 11;
const DEMO_DUR = FPS * 10;
const OUTRO_DUR = FPS * 5;

/**
 * Lesson 1: Understanding Lapping
 * Includes an animated demo showing lapping in action.
 */
export const LappingIntro: React.FC<LessonData> = (lesson) => {
  let offset = 0;

  return (
    <>
      {/* Title */}
      <Sequence from={offset} durationInFrames={TITLE_DUR} name="Title">
        <TitleSlide title={lesson.title} lessonNumber={lesson.number} />
      </Sequence>
      {(offset += TITLE_DUR, null)}

      {/* Content sections */}
      {lesson.sections.map((sec, i) => {
        const from = offset + i * SECTION_DUR;
        return (
          <Sequence key={i} from={from} durationInFrames={SECTION_DUR} name={sec.heading}>
            <SectionSlide section={sec} index={i} />
          </Sequence>
        );
      })}
      {(offset += lesson.sections.length * SECTION_DUR, null)}

      {/* Animated lapping demo */}
      <Sequence from={offset} durationInFrames={DEMO_DUR} name="Lapping Demo">
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgCard} 100%)`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: THEME.white, marginBottom: 40, fontFamily: THEME.fonts.heading }}>
            Two Lapping Example
          </div>
          <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>
            <LappingColumn values={[42, 75, 75, 31]} highlightIndex={2} columnLabel="N1" />
            <LappingColumn values={[18, 53, 89, 53]} columnLabel="N2" />
            <LappingColumn values={[67, 11, 11, 44]} highlightIndex={2} columnLabel="N3" />
            <LappingColumn values={[90, 22, 35, 61]} columnLabel="N4" />
            <LappingColumn values={[5, 48, 72, 48]} columnLabel="N5" />
          </div>
        </AbsoluteFill>
      </Sequence>
      {(offset += DEMO_DUR, null)}

      {/* Outro */}
      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} nextTitle="Two Lapping Strategy" />
      </Sequence>
    </>
  );
};
