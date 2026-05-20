import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../styles/theme';

interface Props {
  title: string;
  lessonNumber: number;
  courseTitle?: string;
}

/**
 * Animated title slide shown at the beginning of each lesson video.
 * Features: logo pulse, title fade-in, subtitle slide-up, gradient background.
 */
export const TitleSlide: React.FC<Props> = ({
  title,
  lessonNumber,
  courseTitle = 'Lapping Course',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });

  const titleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [20, 40], [40, 0], { extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [35, 55], [30, 0], { extrapolateRight: 'clamp' });

  const badgeScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 10, stiffness: 180 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${THEME.bg} 0%, ${THEME.bgAccent} 50%, ${THEME.bg} 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          border: `2px solid ${THEME.primary}30`,
          top: -100,
          right: -100,
          transform: `scale(${logoScale})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          borderRadius: '50%',
          border: `2px solid ${THEME.secondary}30`,
          bottom: -50,
          left: -50,
          transform: `scale(${logoScale})`,
        }}
      />

      {/* Logo / Brand */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          fontSize: 64,
          marginBottom: 20,
        }}
      >
        🔄
      </div>

      {/* Lesson number badge */}
      <div
        style={{
          transform: `scale(${badgeScale})`,
          backgroundColor: THEME.primary,
          color: THEME.white,
          padding: '8px 28px',
          borderRadius: 30,
          fontSize: 20,
          fontWeight: 600,
          fontFamily: THEME.fonts.heading,
          letterSpacing: 2,
          marginBottom: 24,
        }}
      >
        LESSON {lessonNumber} · {courseTitle.toUpperCase()}
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 72,
          fontWeight: 800,
          color: THEME.white,
          fontFamily: THEME.fonts.heading,
          textAlign: 'center',
          maxWidth: '80%',
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 28,
          color: THEME.textSecondary,
          fontFamily: THEME.fonts.body,
          marginTop: 20,
          textAlign: 'center',
        }}
      >
        Lotto Prophet University
      </div>
    </AbsoluteFill>
  );
};
