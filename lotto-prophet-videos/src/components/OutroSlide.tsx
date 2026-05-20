import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../styles/theme';

interface Props {
  lessonTitle: string;
  lessonNumber: number;
  nextTitle?: string;
}

/**
 * Outro slide with call-to-action.
 */
export const OutroSlide: React.FC<Props> = ({ lessonTitle, lessonNumber, nextTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkScale = spring({ frame, fps, config: { damping: 10, stiffness: 180 } });
  const textOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' });
  const ctaOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' });
  const ctaY = interpolate(frame, [40, 60], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${THEME.bg} 0%, ${THEME.bgAccent} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Checkmark */}
      <div
        style={{
          transform: `scale(${checkScale})`,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: `${THEME.success}20`,
          border: `3px solid ${THEME.success}`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 56,
          marginBottom: 30,
        }}
      >
        ✅
      </div>

      {/* Completion text */}
      <div
        style={{
          opacity: textOpacity,
          fontSize: 40,
          fontWeight: 700,
          color: THEME.white,
          fontFamily: THEME.fonts.heading,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        Lesson {lessonNumber} Complete
      </div>
      <div
        style={{
          opacity: textOpacity,
          fontSize: 28,
          color: THEME.textSecondary,
          fontFamily: THEME.fonts.body,
          marginBottom: 50,
        }}
      >
        {lessonTitle}
      </div>

      {/* CTA / Next */}
      {nextTitle && (
        <div
          style={{
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
            backgroundColor: THEME.primary,
            borderRadius: 16,
            padding: '16px 40px',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: THEME.white,
              fontFamily: THEME.fonts.heading,
            }}
          >
            Up Next → {nextTitle}
          </div>
        </div>
      )}

      {/* Brand */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          fontSize: 22,
          color: `${THEME.textSecondary}80`,
          fontFamily: THEME.fonts.body,
        }}
      >
        🔄 Lotto Prophet University
      </div>
    </AbsoluteFill>
  );
};
