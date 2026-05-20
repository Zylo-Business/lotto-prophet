import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { LappingColumn } from '../components/LappingColumn';
import { OutroSlide } from '../components/OutroSlide';
import { THEME } from '../styles/theme';
import type { LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 5;
const SECTION_DUR = FPS * 11;
const DEMO_DUR = FPS * 12;
const OUTRO_DUR = FPS * 5;

/**
 * Lesson 3: Three Lapping Strategy
 * Includes 3-row window scanning animation.
 */
export const ThreeLappingStrategy: React.FC<LessonData> = (lesson) => {
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

      <Sequence from={offset} durationInFrames={DEMO_DUR} name="3-Row Window Demo">
        <ThreeRowDemo />
      </Sequence>
      {(offset += DEMO_DUR, null)}

      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} nextTitle="Four Lapping (Advanced)" />
      </Sequence>
    </>
  );
};

const ThreeRowDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const windowY = interpolate(frame, [0, 180], [0, 160], { extrapolateRight: 'clamp' });
  const matchOpacity = interpolate(frame, [100, 130], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgCard} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color: THEME.white, marginBottom: 50, fontFamily: THEME.fonts.heading }}>
        Scanning 3-Row Windows
      </div>

      <div style={{ position: 'relative' }}>
        {/* Sliding window indicator */}
        <div
          style={{
            position: 'absolute',
            top: windowY,
            left: -20,
            right: -20,
            height: 280,
            border: `3px solid ${THEME.success}`,
            borderRadius: 16,
            backgroundColor: `${THEME.success}10`,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 50, position: 'relative', zIndex: 2 }}>
          {/* N1 shows a 3-match */}
          <LappingColumn values={[42, 75, 75, 75, 31, 88]} highlightIndex={3} columnLabel="N1" />
          <LappingColumn values={[18, 53, 89, 27, 53, 11]} columnLabel="N2" />
          <LappingColumn values={[67, 11, 22, 33, 44, 55]} columnLabel="N3" />
        </div>
      </div>

      {/* Match label */}
      <div
        style={{
          opacity: matchOpacity,
          marginTop: 40,
          backgroundColor: `${THEME.success}20`,
          border: `2px solid ${THEME.success}`,
          borderRadius: 12,
          padding: '12px 32px',
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 700, color: THEME.success, fontFamily: THEME.fonts.heading }}>
          Three Lapping found in N1: 75 → 75 → 75
        </span>
      </div>
    </AbsoluteFill>
  );
};
