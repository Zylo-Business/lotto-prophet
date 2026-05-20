import React from 'react';
import { Composition } from 'remotion';
import { LessonVideo } from './compositions/LessonVideo';
import { LappingIntro } from './compositions/LappingIntro';
import { TwoLappingStrategy } from './compositions/TwoLappingStrategy';
import { ThreeLappingStrategy } from './compositions/ThreeLappingStrategy';
import { FourLappingAdvanced } from './compositions/FourLappingAdvanced';
import { ExpertFramework } from './compositions/ExpertFramework';
import { PracticalAnalytics } from './compositions/PracticalAnalytics';
import { LESSONS, type LessonData } from './data/lessons';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const Root: React.FC = () => {
  return (
    <>
      {/* ── Full course composition ── */}
      <Composition
        id="LappingCourse"
        component={LessonVideo as React.FC}
        durationInFrames={FPS * 60 * 6}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          lessonSlug: 'understanding-lapping',
        }}
      />

      {/* ── Individual lesson compositions ── */}
      <Composition
        id="Lesson-UnderstandingLapping"
        component={LappingIntro as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[0] as unknown as Record<string, unknown>}
      />
      <Composition
        id="Lesson-TwoLappingStrategy"
        component={TwoLappingStrategy as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[1] as unknown as Record<string, unknown>}
      />
      <Composition
        id="Lesson-ThreeLappingStrategy"
        component={ThreeLappingStrategy as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[2] as unknown as Record<string, unknown>}
      />
      <Composition
        id="Lesson-FourLappingAdvanced"
        component={FourLappingAdvanced as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[3] as unknown as Record<string, unknown>}
      />
      <Composition
        id="Lesson-ExpertFramework"
        component={ExpertFramework as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[4] as unknown as Record<string, unknown>}
      />
      <Composition
        id="Lesson-PracticalAnalytics"
        component={PracticalAnalytics as React.FC}
        durationInFrames={FPS * 60}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={LESSONS[5] as unknown as Record<string, unknown>}
      />
    </>
  );
};
