export function scoreToGradeLetter(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function computePercentage(marks: number, maxMarks: number): number {
  if (maxMarks <= 0) return 0;
  return Math.round((marks / maxMarks) * 100);
}

export type RankedResult = {
  studentId: string;
  marks: number;
  percentage: number;
  gradeLetter: string;
  rank: number;
};

/** Standard competition ranking (1, 2, 2, 4). */
export function computeRanks(
  entries: { studentId: string; marks: number }[],
  maxMarks: number
): RankedResult[] {
  const sorted = [...entries].sort((a, b) => b.marks - a.marks);
  const ranked: RankedResult[] = [];
  let rank = 0;
  let previousMarks: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]!;
    if (previousMarks === null || entry.marks < previousMarks) {
      rank = i + 1;
      previousMarks = entry.marks;
    }
    const percentage = computePercentage(entry.marks, maxMarks);
    ranked.push({
      studentId: entry.studentId,
      marks: entry.marks,
      percentage,
      gradeLetter: scoreToGradeLetter(percentage),
      rank,
    });
  }

  return ranked;
}
