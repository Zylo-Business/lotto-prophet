import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../styles/theme';
import type { Section } from '../data/lessons';

interface Props {
  section: Section;
  index: number;
}

/**
 * Animated content section — heading + body with line-by-line reveal.
 */
export const SectionSlide: React.FC<Props> = ({ section, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const headingOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const headingX = interpolate(frame, [10, 30], [-60, 0], { extrapolateRight: 'clamp' });

  const lines = section.body.split('\n').filter(Boolean);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${THEME.bg} 0%, ${THEME.bgCard} 100%)`,
        padding: 100,
        justifyContent: 'center',
      }}
    >
      {/* Top bar accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})`,
        }}
      />

      {/* Section number indicator */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 60,
          fontSize: 120,
          fontWeight: 900,
          color: `${THEME.primary}15`,
          fontFamily: THEME.fonts.heading,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Icon */}
      <div
        style={{
          fontSize: 56,
          transform: `scale(${iconScale})`,
          marginBottom: 20,
        }}
      >
        {section.icon ?? '📝'}
      </div>

      {/* Heading */}
      <div
        style={{
          opacity: headingOpacity,
          transform: `translateX(${headingX}px)`,
          fontSize: 52,
          fontWeight: 700,
          color: THEME.white,
          fontFamily: THEME.fonts.heading,
          marginBottom: 40,
          lineHeight: 1.2,
        }}
      >
        {section.heading}
      </div>

      {/* Body lines — staggered reveal */}
      <div style={{ maxWidth: '80%' }}>
        {lines.map((line, i) => {
          const delay = 30 + i * 12;
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const y = interpolate(frame, [delay, delay + 15], [25, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isHighlight = line.startsWith('👉') || line.startsWith('⚠️') || line.startsWith('✅');

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                fontSize: 32,
                color: isHighlight ? THEME.secondary : THEME.text,
                fontFamily: isHighlight ? THEME.fonts.heading : THEME.fonts.body,
                fontWeight: isHighlight ? 700 : 400,
                lineHeight: 1.7,
                marginBottom: 8,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
