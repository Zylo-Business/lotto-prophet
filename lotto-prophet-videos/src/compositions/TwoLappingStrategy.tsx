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
 * Lesson 2: Two Lapping Strategy
 * Includes step-by-step detection animation.
 */
export const TwoLappingStrategy: React.FC<LessonData> = (lesson) => {
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

      {/* Detection demo — shows EV comparison */}
      <Sequence from={offset} durationInFrames={DEMO_DUR} name="Detection Demo">
        <DetectionDemo />
      </Sequence>
      {(offset += DEMO_DUR, null)}

      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} nextTitle="Three Lapping Strategy" />
      </Sequence>
    </>
  );
};

/** Animated side-by-side comparison of two consecutive draws */
const DetectionDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const arrowOpacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: 'clamp' });
  const labelOpacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: 'clamp' });

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
        Step-by-Step: Detecting Two Lapping
      </div>

      <div style={{ display: 'flex', gap: 80, alignItems: 'center' }}>
        {/* Draw grid */}
        <div style={{ display: 'flex', gap: 40 }}>
          <LappingColumn values={[28, 28]} highlightIndex={1} columnLabel="N1" />
          <LappingColumn values={[45, 12]} columnLabel="N2" />
          <LappingColumn values={[67, 67]} highlightIndex={1} columnLabel="N3" />
          <LappingColumn values={[83, 5]} columnLabel="N4" />
          <LappingColumn values={[11, 90]} columnLabel="N5" />
        </div>

        {/* Arrow + label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: arrowOpacity }}>
          <div style={{ fontSize: 60, color: THEME.secondary }}>→</div>
          <div style={{ opacity: labelOpacity, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: THEME.secondary, fontFamily: THEME.fonts.heading }}>
              Lapping Detected!
            </div>
            <div style={{ fontSize: 18, color: THEME.textSecondary, marginTop: 8 }}>
              N1: 28 → 28
            </div>
            <div style={{ fontSize: 18, color: THEME.textSecondary }}>
              N3: 67 → 67
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
