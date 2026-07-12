export type SubjectKey = "Quant" | "LRDI" | "VARC";
export type ViewKey = "Dashboard" | "Today" | "Planner" | "History" | "Syllabus" | "Tracker" | "Important Questions" | "Important Links" | "Revision" | "Notes" | "Calendar" | "Settings";

export interface TrackerChecklist {
  theory?: boolean;
  read?: boolean;
  solvedProblems?: boolean;
  revised?: boolean;
  readyForExam?: boolean;
}

export interface TopicSubSection extends TrackerChecklist {
  id: string;
  title: string;
  finishedTheory?: boolean;
  solvedProblems?: boolean;
  revised?: boolean;
  readyForExam?: boolean;
  resourceLink?: string;
}

export interface Topic extends TrackerChecklist {
  id: string;
  subject: SubjectKey;
  name: string;
  progress: number;
  hours: number;
  problemsSolved: number;
  accuracy: number;
  status: "Planned" | "In progress" | "Done";
  notes: string;
  priority: "High" | "Medium" | "Low";
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedHours: number;
  weightage: number;
  revisionCount: number;
  bookmarks: boolean;
  theoryBook?: string;
  problemBook?: string;
  youtubeLink?: string;
  youtubeChannel?: string;
  resourceLink?: string;
  subSections: TopicSubSection[];
}

export interface StudySession extends TrackerChecklist {
  id: string;
  date: string;
  subject: SubjectKey;
  topic: string;
  hours: number;
  problemsSolved: number;
  readingMinutes: number;
  pagesRead: number;
  notes: string;
  productivity: number;
  mood: string;
  link?: string;
  status: "Completed" | "Partial" | "Not started";
}

export interface TaskItem extends TrackerChecklist {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  estimate: string;
  subject: SubjectKey;
  notes: string;
}

export interface WeeklySlot extends TrackerChecklist {
  id: string;
  day: string;
  time: string;
  title: string;
  subject: SubjectKey;
  duration: string;
  completed: boolean;
}

export interface MonthlyGoalItem extends TrackerChecklist {
  id: string;
  title: string;
  targetHours: number;
  completed: boolean;
  notes: string;
  subject: SubjectKey;
  priority: "High" | "Medium" | "Low";
}

export interface ImportantQuestion {
  id: string;
  title: string;
  link: string;
  subject: SubjectKey;
  notes: string;
  solved: boolean;
  createdAt: string;
  imageUrl?: string;
}

export interface ImportantLink {
  id: string;
  title: string;
  url: string;
  subject: SubjectKey;
  notes?: string;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  tags: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface RevisionTopic extends TrackerChecklist {
  id: string;
  title: string;
  subject: SubjectKey;
  importance: "High" | "Medium" | "Low";
  notes: string;
  createdAt: string;
  imageUrl?: string;
}

export interface CatAppState {
  profile: {
    name: string;
    registrationDate: string;
    examDate: string;
    weeklyTargetHours: number;
    monthlyTargetHours: number;
    dailyStudyHours: number;
    targetPercentile: number;
    workSchedule: string;
  };
  sessions: StudySession[];
  tasks: TaskItem[];
  topics: Topic[];
  notes: NoteItem[];
  weeklyPlan: WeeklySlot[];
  monthlyPlan: MonthlyGoalItem[];
  importantQuestions: ImportantQuestion[];
  importantLinks: ImportantLink[];
  revisionTopics: RevisionTopic[];
  activeView: ViewKey;
}

const buildSubSection = (title: string): TopicSubSection => ({
  id: `sub-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
  title,
  finishedTheory: false,
  solvedProblems: false,
  revised: false,
  readyForExam: false,
  resourceLink: "",
});

const buildTopic = (subject: SubjectKey, name: string, subSections: TopicSubSection[]): Topic => ({
  id: `topic-${subject.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
  subject,
  name,
  progress: 0,
  hours: 0,
  problemsSolved: 0,
  accuracy: 0,
  status: "Planned",
  notes: "",
  priority: "High",
  difficulty: "Medium",
  estimatedHours: 0,
  weightage: 0,
  revisionCount: 0,
  bookmarks: false,
  theoryBook: "",
  problemBook: "",
  youtubeLink: "",
  youtubeChannel: "",
  resourceLink: "",
  subSections,
});

export const seedTopics: Topic[] = [
  buildTopic("VARC", "Reading Comprehension (RC)", [
    buildSubSection("Philosophy"),
    buildSubSection("Psychology"),
    buildSubSection("Economics"),
    buildSubSection("Business"),
    buildSubSection("Technology"),
    buildSubSection("Science"),
    buildSubSection("Environment"),
    buildSubSection("History"),
    buildSubSection("Politics"),
    buildSubSection("Sociology"),
    buildSubSection("Anthropology"),
    buildSubSection("Linguistics"),
    buildSubSection("Literature"),
    buildSubSection("Education"),
    buildSubSection("Law"),
    buildSubSection("Medicine"),
    buildSubSection("Miscellaneous"),
  ]),
  buildTopic("VARC", "Verbal Ability (VA)", [
    buildSubSection("Para Summary"),
    buildSubSection("Para Jumbles"),
    buildSubSection("Odd Sentence Out"),
    buildSubSection("Sentence Placement"),
    buildSubSection("Paragraph Completion"),
    buildSubSection("Paragraph Flow"),
    buildSubSection("Sentence Rearrangement"),
    buildSubSection("Critical Reasoning"),
  ]),
  buildTopic("VARC", "Language Skills", [
    buildSubSection("Vocabulary"),
    buildSubSection("Grammar"),
    buildSubSection("Sentence Correction"),
    buildSubSection("Idioms"),
    buildSubSection("Phrases"),
    buildSubSection("Reading Speed"),
    buildSubSection("Reading Accuracy"),
    buildSubSection("Inference Ability"),
    buildSubSection("Critical Thinking"),
    buildSubSection("Argument Analysis"),
  ]),
  buildTopic("LRDI", "Logical Reasoning (LR)", [
    buildSubSection("Arrangements"),
    buildSubSection("Selection Problems"),
    buildSubSection("Distribution Problems"),
    buildSubSection("Grouping"),
    buildSubSection("Scheduling"),
    buildSubSection("Matching Problems"),
    buildSubSection("Games & Tournaments"),
    buildSubSection("Ranking & Ordering"),
    buildSubSection("Family Tree"),
    buildSubSection("Blood Relations"),
    buildSubSection("Direction Sense"),
    buildSubSection("Routes & Networks"),
    buildSubSection("Binary Logic"),
    buildSubSection("Truth & Lie"),
    buildSubSection("Puzzles"),
  ]),
  buildTopic("LRDI", "Data Interpretation (DI)", [
    buildSubSection("Tables"),
    buildSubSection("Bar Graphs"),
    buildSubSection("Line Graphs"),
    buildSubSection("Pie Charts"),
    buildSubSection("Mixed Graphs"),
    buildSubSection("Caselets"),
    buildSubSection("Missing Data"),
    buildSubSection("Financial DI"),
    buildSubSection("Business DI"),
    buildSubSection("Population DI"),
    buildSubSection("Election DI"),
    buildSubSection("Percentage Analysis"),
    buildSubSection("Ratio Analysis"),
    buildSubSection("Growth Rate Analysis"),
    buildSubSection("Profitability Analysis"),
  ]),
  buildTopic("Quant", "Arithmetic", [
    buildSubSection("Percentages"),
    buildSubSection("Ratio & Proportion"),
    buildSubSection("Average"),
    buildSubSection("Profit, Loss & Discount"),
    buildSubSection("Time & Work"),
    buildSubSection("Time, Speed & Distance"),
    buildSubSection("Simple Interest"),
    buildSubSection("Compound Interest"),
    buildSubSection("Ages"),
    buildSubSection("Clocks"),
    buildSubSection("Calendars"),
    buildSubSection("Races"),
  ]),
  buildTopic("Quant", "Algebra", [
    buildSubSection("Linear Equations"),
    buildSubSection("Quadratic Equations"),
    buildSubSection("Inequalities"),
    buildSubSection("Functions"),
    buildSubSection("Logarithms"),
    buildSubSection("Sequences"),
    buildSubSection("Progressions"),
    buildSubSection("Binomial Theorem"),
  ]),
  buildTopic("Quant", "Geometry", [
    buildSubSection("Lines & Angles"),
    buildSubSection("Triangles"),
    buildSubSection("Quadrilaterals"),
    buildSubSection("Circles"),
    buildSubSection("Coordinate Geometry"),
    buildSubSection("Mensuration 2D"),
    buildSubSection("Mensuration 3D"),
  ]),
  buildTopic("Quant", "Number System", [
    buildSubSection("Basics"),
    buildSubSection("Divisibility Rules"),
    buildSubSection("Prime Numbers"),
    buildSubSection("HCF & LCM"),
    buildSubSection("Remainders"),
    buildSubSection("Last Digit Problems"),
    buildSubSection("Trailing Zeroes"),
    buildSubSection("Factorials"),
    buildSubSection("Modular Arithmetic"),
  ]),
  buildTopic("Quant", "Modern Mathematics", [
    buildSubSection("Permutation"),
    buildSubSection("Combination"),
    buildSubSection("Probability"),
    buildSubSection("Set Theory"),
    buildSubSection("Venn Diagrams"),
    buildSubSection("Counting Principles"),
  ]),
];
export const seedSessions: StudySession[] = [];
export const seedTasks: TaskItem[] = [];
export const seedNotes: NoteItem[] = [];
export const seedWeeklyPlan: WeeklySlot[] = [];
export const seedMonthlyPlan: MonthlyGoalItem[] = [];
export const seedRevisionTopics: RevisionTopic[] = [];

export function buildInitialState(): CatAppState {
  const registrationDate = new Date();
  const examDate = new Date();
  examDate.setDate(examDate.getDate() + 120);

  return {
    profile: {
      name: "Your name",
      registrationDate: registrationDate.toISOString().slice(0, 10),
      examDate: examDate.toISOString().slice(0, 10),
      weeklyTargetHours: 0,
      monthlyTargetHours: 0,
      dailyStudyHours: 0,
      targetPercentile: 0,
      workSchedule: "",
    },
    sessions: seedSessions,
    tasks: seedTasks,
    topics: seedTopics,
    notes: seedNotes,
    weeklyPlan: seedWeeklyPlan,
    monthlyPlan: seedMonthlyPlan,
    importantQuestions: [],
    importantLinks: [],
    revisionTopics: seedRevisionTopics,
    activeView: "Dashboard",
  };
}
