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
  priority?: number | null;
  strategyType?: string | null;
  status?: string | null;
  note?: string | null;
};

export type ScoreTabKey = "schoolRecord" | "mockExam" | "studentRecord";

export type GradeYear = "1" | "2" | "3";

export type GradeTerm =
  | "1-midterm"
  | "1-final"
  | "2-midterm"
  | "2-final"
  | "mock-nat-3"
  | "mock-nat-4"
  | "mock-nat-6"
  | "mock-nat-7"
  | "mock-nat-9"
  | "mock-nat-10"
  | "mock-nat-11"
  | "mock-csat-6"
  | "mock-csat-9";

export type StudentRecordAcademicYear =
  | 2026
  | 2027
  | 2028
  | 2029
  | 2030
  | 2031
  | 2032
  | 2033
  | 2034
  | 2035
  | 2036;

export type StudentRecordSemester = 1 | 2;

export type StudentRecordType = "세특" | "동아리" | "봉사" | "진로" | "수상" | "독서" | "행동특성";

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
  /** 생기부 탭: TB_STUDENT_RECORD (학년도·학기·기록유형)과 동일 키로 필터 */
  studentAcademicYear?: StudentRecordAcademicYear;
  studentSemester?: StudentRecordSemester;
  studentRecordType?: StudentRecordType;
};

export type StudentRecordPeriod = {
  id: string;
  recordId?: number;
  year: GradeYear;
  term: GradeTerm;
  academicYear: StudentRecordAcademicYear;
  semester: StudentRecordSemester;
  recordType: StudentRecordType;
  subjectName?: string;
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
  selectedStudentAcademicYear: StudentRecordAcademicYear;
  selectedStudentSemester: StudentRecordSemester;
  selectedStudentRecordType: StudentRecordType;
  updatedAt: string;
  /** 성적 스키마 마이그레이션 (예: 고정 사탐·과탐 제거) */
  scoreSchemaVersion?: number;
};

export type StudentProfile = {
  name: string;
  gradeLabel: string;
  region?: string;
  district?: string;
  schoolName?: string;
  track: string;
  targetYear: number;
  profileImageUrl?: string;
  hasRequiredInfo: boolean;
  hasScores: boolean;
};

export type SimulationInput = {
  gpa: number;
  mock: number;
  minRequirementMet: boolean;
};
