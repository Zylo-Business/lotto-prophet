import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TitleSlide } from '../components/TitleSlide';
import { SectionSlide } from '../components/SectionSlide';
import { OutroSlide } from '../components/OutroSlide';
import { THEME } from '../styles/theme';
import type { LessonData } from '../data/lessons';

const FPS = 30;
const TITLE_DUR = FPS * 5;
const SECTION_DUR = FPS * 11;
const TOOL_DUR = FPS * 14;
const OUTRO_DUR = FPS * 5;

/**
 * Lesson 6: Practical Analytics with Tools
 * Includes animated UI mockup of the Lapping tools.
 */
export const PracticalAnalytics: React.FC<LessonData> = (lesson) => {
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

      <Sequence from={offset} durationInFrames={TOOL_DUR} name="Tool UI Mockup">
        <ToolMockup />
      </Sequence>
      {(offset += TOOL_DUR, null)}

      <Sequence from={offset} durationInFrames={OUTRO_DUR} name="Outro">
        <OutroSlide lessonTitle={lesson.title} lessonNumber={lesson.number} />
      </Sequence>
    </>
  );
};

/** Animated mockup of the Lapping 2 tool interface */
const ToolMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 14, stiffness: 150 } });
  const cardsOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' });
  const navOpacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: 'clamp' });

  const mockDraws = [
    { event: 1842, balls: [28, 75, 11, 53, 47], highlights: [false, true, false, false, false] },
    { event: 1841, balls: [63, 75, 89, 12, 34], highlights: [false, true, false, false, false] },
    { event: 1840, balls: [28, 41, 67, 53, 9], highlights: [false, false, false, false, false] },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgCard} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color: THEME.white, marginBottom: 40, fontFamily: THEME.fonts.heading }}>
        Lotto Prophet — Lapping 2 Tool
      </div>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Phone mockup */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            width: 380,
            backgroundColor: '#1a1a2e',
            borderRadius: 30,
            padding: 20,
            border: `2px solid ${THEME.border}`,
          }}
        >
          {/* Status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: THEME.textSecondary }}>9:41</span>
            <span style={{ fontSize: 14, color: THEME.textSecondary }}>⚡ 100%</span>
          </div>

          {/* Header */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: THEME.white,
              textAlign: 'center',
              marginBottom: 16,
              fontFamily: THEME.fonts.heading,
            }}
          >
            🔄 Lapping 2 Analysis
          </div>

          {/* Draw cards */}
          <div style={{ opacity: cardsOpacity, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mockDraws.map((draw) => (
              <div
                key={draw.event}
                style={{
                  backgroundColor: THEME.bgCard,
                  borderRadius: 12,
                  padding: 12,
                  borderLeft: draw.highlights.some(Boolean) ? `3px solid ${THEME.primary}` : 'none',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.textSecondary, marginBottom: 8 }}>
                  Draw #{draw.event}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {draw.balls.map((ball, i) => (
                    <div
                      key={i}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: draw.highlights[i] ? '#FCD34D' : `${THEME.primary}30`,
                        border: draw.highlights[i] ? '2px solid #F59E0B' : 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 16,
                        fontWeight: 700,
                        color: draw.highlights[i] ? '#78350F' : THEME.white,
                        fontFamily: THEME.fonts.heading,
                      }}
                    >
                      {ball}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side nav mockup */}
        <div
          style={{
            opacity: navOpacity,
            width: 60,
            backgroundColor: THEME.bgCard,
            borderRadius: 12,
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${THEME.border}`,
          }}
        >
          <div style={{ fontSize: 14, color: THEME.primary, fontWeight: 700, marginBottom: 4 }}>📌</div>
          {[1842, 1841].map((ev) => (
            <div
              key={ev}
              style={{
                fontSize: 11,
                color: THEME.textSecondary,
                fontWeight: 600,
                padding: '6px 4px',
                borderRadius: 6,
                backgroundColor: `${THEME.primary}20`,
                textAlign: 'center',
                width: '100%',
              }}
            >
              {ev}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
