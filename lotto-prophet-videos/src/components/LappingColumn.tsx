import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { THEME } from '../styles/theme';

interface Props {
  values: number[];
  highlightIndex?: number;
  columnLabel?: string;
}

/**
 * Animated vertical column of lottery balls showing lapping.
 * Balls drop in sequentially; the highlight ball pulses.
 */
export const LappingColumn: React.FC<Props> = ({
  values,
  highlightIndex,
  columnLabel = 'N1',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Column header */}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: THEME.textSecondary,
          fontFamily: THEME.fonts.mono,
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        {columnLabel}
      </div>

      {values.map((val, i) => {
        const dropDelay = i * 8;
        const y = spring({
          frame: Math.max(0, frame - dropDelay),
          fps,
          config: { damping: 14, stiffness: 150 },
        });
        const opacity = interpolate(frame, [dropDelay, dropDelay + 10], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const isHighlighted = i === highlightIndex;
        const pulse = isHighlighted
          ? 1 + 0.08 * Math.sin((frame - 20) * 0.15)
          : 1;

        return (
          <div
            key={i}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isHighlighted ? THEME.secondary : `${THEME.primary}40`,
              border: isHighlighted ? `3px solid ${THEME.secondary}` : `2px solid ${THEME.primary}60`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              opacity,
              transform: `translateY(${(1 - y) * 40}px) scale(${pulse})`,
              boxShadow: isHighlighted ? `0 0 20px ${THEME.secondary}80` : 'none',
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: isHighlighted ? '#78350F' : THEME.white,
                fontFamily: THEME.fonts.heading,
              }}
            >
              {val}
            </span>
          </div>
        );
      })}
    </div>
  );
};
