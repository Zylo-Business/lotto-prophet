import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { OutroSlide } from '../components/OutroSlide';
import { THEME } from '../styles/theme';
import type { LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 5;
const SECTION_DUR = FPS * 12;
const MATRIX_DUR = FPS * 14;
const OUTRO_DUR = FPS * 5;

/**
 * Lesson 5: Expert Decision Framework
 * Includes animated confidence matrix.
 */
export const ExpertFramework: React.FC<LessonData> = (lesson) => {
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

      <Sequence from={offset} durationInFrames={MATRIX_DUR} name="Confidence Matrix">
        <ConfidenceMatrix />
      </Sequence>
      {(offset += MATRIX_DUR, null)}

      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} nextTitle="Practical Analytics with Tools" />
      </Sequence>
    </>
  );
};

const CRITERIA = [
  { label: 'Lapping Count', values: ['2-lap', '3-lap', '4-lap'], weights: [0.3, 0.7, 1.0], colors: ['#F59E0B', '#10B981', '#EF4444'] },
  { label: 'Historical Match', values: ['None', 'Partial', 'Exact'], weights: [0.1, 0.5, 0.9], colors: ['#6B7280', '#3B82F6', '#10B981'] },
  { label: 'Column Strength', values: ['Low', 'Medium', 'High'], weights: [0.2, 0.5, 0.8], colors: ['#6B7280', '#F59E0B', '#10B981'] },
];

const ConfidenceMatrix: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgCard} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 700, color: THEME.white, marginBottom: 50, fontFamily: THEME.fonts.heading }}>
        Confidence Scoring Matrix
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '80%' }}>
        {CRITERIA.map((row, ri) => {
          const rowDelay = ri * 30;
          const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div key={ri} style={{ opacity: rowOpacity }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: THEME.textSecondary, marginBottom: 12, fontFamily: THEME.fonts.heading }}>
                {row.label}
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {row.values.map((val, vi) => {
                  const barDelay = rowDelay + 15 + vi * 10;
                  const barWidth = interpolate(frame, [barDelay, barDelay + 30], [0, row.weights[vi] * 100], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  });

                  return (
                    <div key={vi} style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, color: THEME.text, marginBottom: 6, fontFamily: THEME.fonts.body }}>
                        {val}
                      </div>
                      <div style={{ height: 16, borderRadius: 8, backgroundColor: `${THEME.border}` }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${barWidth}%`,
                            borderRadius: 8,
                            backgroundColor: row.colors[vi],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
