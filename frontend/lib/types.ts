export type AdmissionCategory = "안정" | "적정" | "도전";

export type Evidence = {
  title: string;
  source: string;
  page: number | null;
  snippet: string;
  status: "verified" | "unverified";
};

export type Recommendation = {
  id: string;
  university: string;
  major: string;
  category: AdmissionCategory;
  fitScore: number;
  notes: string;
  evidence: Evidence;
};

export type ChecklistItem = {
  id: string;
  title: string;
  due: string;
  done: boolean;
};

export type GoalChoice = {
  university: string;
  major: string;
};

export type ScoreTabKey = "schoolRecord" | "mockExam" | "studentRecord";

export type GradeYear = "1" | "2" | "3";

export type GradeTerm =
  | "1-midterm"
  | "1-final"
  | "2-midterm"
  | "2-final"
  | "march"
  | "june"
  | "september"
  | "august-csat";

export type SubjectScoreEntry = {
  id: string;
  subject: string;
  score: string;
  isCustom?: boolean;
};

export type GradePeriodRecord = {
  id: string;
  year: GradeYear;
  term: GradeTerm;
  subjects: SubjectScoreEntry[];
  overallAverage: string;
  updatedAt: string;
};

export type UploadedRecordFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  sourceTab: ScoreTabKey;
  year: GradeYear;
  term: GradeTerm;
  uploadedAt: string;
};

export type StudentRecordPeriod = {
  id: string;
  year: GradeYear;
  term: GradeTerm;
  title: string;
  description: string;
  files: UploadedRecordFile[];
  updatedAt: string;
};

export type ScoreMemoryStore = {
  schoolRecords: GradePeriodRecord[];
  mockExams: GradePeriodRecord[];
  studentRecords: StudentRecordPeriod[];
  uploads: UploadedRecordFile[];
  activeTab: ScoreTabKey;
  selectedYear: GradeYear;
  selectedTerm: GradeTerm;
  updatedAt: string;
};

export type StudentProfile = {
  name: string;
  gradeLabel: string;
  region?: string;
  district?: string;
  schoolName?: string;
  track: string;
  targetYear: number;
  hasRequiredInfo: boolean;
  hasScores: boolean;
};

export type SimulationInput = {
  gpa: number;
  mock: number;
  minRequirementMet: boolean;
};
