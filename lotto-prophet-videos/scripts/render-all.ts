/**
 * Batch render all lesson compositions to MP4.
 * Usage: pnpm tsx scripts/render-all.ts
 */
import { execSync } from 'child_process';

const compositions = [
  'Lesson-UnderstandingLapping',
  'Lesson-TwoLappingStrategy',
  'Lesson-ThreeLappingStrategy',
  'Lesson-FourLappingAdvanced',
  'Lesson-ExpertFramework',
  'Lesson-PracticalAnalytics',
];

for (const id of compositions) {
  const outFile = `out/${id}.mp4`;
  console.log(`\n🎬 Rendering ${id}...`);
  try {
    execSync(`npx remotion render ${id} ${outFile}`, { stdio: 'inherit' });
    console.log(`✅ ${id} → ${outFile}`);
  } catch (err) {
    console.error(`❌ Failed to render ${id}`);
    process.exit(1);
  }
}

console.log('\n🎉 All lessons rendered successfully!');
