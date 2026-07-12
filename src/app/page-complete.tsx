"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  CalendarDays,
  Clock3,
  Link2,
  NotebookPen,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  buildInitialState,
  type CatAppState,
  type ImportantQuestion,
  type MonthlyGoalItem,
  type NoteItem,
  type RevisionTopic,
  type StudySession,
  type SubjectKey,
  type TaskItem,
  type Topic,
  type WeeklySlot,
} from "@/lib/cat-data";

const STORAGE_KEY = "cat-os-state-v2";
const viewOptions = [
  "Dashboard",
  "Today",
  "Planner",
  "History",
  "Syllabus",
  "Important Questions",
  "Revision",
  "Notes",
  "Calendar",
  "Settings",
] as const;
type ViewOption = (typeof viewOptions)[number];

function formatDaysLeft(date: string) {
  if (!date) return "Set exam date";
  const target = new Date(date);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? `${diff} days` : diff === 0 ? "Exam day" : "Exam passed";
}

function formatCountdown(date: string) {
  if (!date) return "Not set";
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return "Invalid date";
  const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? `${diffDays} day${diffDays === 1 ? "" : "s"} left` : "Already due";
}

function calculateStreak(sessions: CatAppState["sessions"]) {
  const uniqueDays = Array.from(new Set(sessions.map((session) => session.date))).sort();
  if (uniqueDays.length === 0) return 0;
  let streak = 1;
  const latest = new Date(uniqueDays[uniqueDays.length - 1]);
  const today = new Date();
  if (latest.getTime() < new Date(today.toDateString()).getTime()) return 0;

  for (let index = uniqueDays.length - 2; index >= 0; index -= 1) {
    const current = new Date(uniqueDays[index]);
    const prev = new Date(uniqueDays[index + 1]);
    const diff = (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak += 1;
    else break;
  }

  return streak;
}

function getSubjectBadge(subject: SubjectKey) {
  switch (subject) {
    case "Quant":
      return "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300";
    case "LRDI":
      return "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300";
    default:
      return "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
}

function formatExamCountdown(examDate: string) {
  if (!examDate) return "Exam date not set";
  const target = new Date(examDate);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "Exam day is here!";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function normalizeStoredState(input: Partial<CatAppState> | null | undefined): CatAppState {
  const fallback = buildInitialState();
  return {
    ...fallback,
    ...input,
    profile: {
      ...fallback.profile,
      ...(input?.profile ?? {}),
    },
    sessions: Array.isArray(input?.sessions) ? input.sessions : fallback.sessions,
    tasks: Array.isArray(input?.tasks) ? input.tasks : fallback.tasks,
    topics: Array.isArray(input?.topics) ? input.topics : fallback.topics,
    notes: Array.isArray(input?.notes) ? input.notes : fallback.notes,
    weeklyPlan: Array.isArray(input?.weeklyPlan) ? input.weeklyPlan : fallback.weeklyPlan,
    monthlyPlan: Array.isArray(input?.monthlyPlan) ? input.monthlyPlan : fallback.monthlyPlan,
    importantQuestions: Array.isArray(input?.importantQuestions) ? input.importantQuestions : fallback.importantQuestions,
    revisionTopics: Array.isArray(input?.revisionTopics) ? input.revisionTopics : fallback.revisionTopics,
    activeView: input?.activeView ?? fallback.activeView,
  };
}

function readFileAsDataUrl(file: File, onReady: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onReady(String(reader.result));
  reader.readAsDataURL(file);
}

export default function Home() {
  const [state, setState] = useState<CatAppState>(() => buildInitialState());
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState<Date | null>(null);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    subject: "Quant" as SubjectKey,
    topic: "",
    hours: "0",
    problemsSolved: "0",
    readingMinutes: "0",
    pagesRead: "0",
    notes: "",
    link: "",
  });
  const [taskForm, setTaskForm] = useState({ title: "", subject: "Quant" as SubjectKey, estimate: "45 min", notes: "" });
  const [slotForm, setSlotForm] = useState({ day: "Monday", time: "19:00", title: "", subject: "Quant" as SubjectKey, duration: "60 min" });
  const [monthlyForm, setMonthlyForm] = useState({ title: "", targetHours: "0", notes: "", subject: "Quant" as SubjectKey, priority: "Medium" as MonthlyGoalItem["priority"] });
  const [topicForm, setTopicForm] = useState({
    subject: "Quant" as SubjectKey,
    name: "",
    hours: "0",
    notes: "",
    priority: "High" as Topic["priority"],
    difficulty: "Medium" as Topic["difficulty"],
    weightage: "0",
    theoryBook: "",
    problemBook: "",
    youtubeLink: "",
    youtubeChannel: "",
    resourceLink: "",
  });
  const [questionForm, setQuestionForm] = useState({ title: "", link: "", subject: "Quant" as SubjectKey, notes: "", imageUrl: "" });
  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: "", imageUrl: "" });
  const [revisionForm, setRevisionForm] = useState({ title: "", subject: "Quant" as SubjectKey, importance: "Medium" as RevisionTopic["importance"], notes: "" });
  const [noteQuery, setNoteQuery] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState({ title: "", subject: "Quant" as SubjectKey, estimate: "", notes: "" });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotDraft, setSlotDraft] = useState({ day: "Monday", time: "", title: "", subject: "Quant" as SubjectKey, duration: "" });
  const [editingMonthlyId, setEditingMonthlyId] = useState<string | null>(null);
  const [monthlyDraft, setMonthlyDraft] = useState({ title: "", targetHours: 0, notes: "", subject: "Quant" as SubjectKey, priority: "Medium" as MonthlyGoalItem["priority"] });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState({ title: "", link: "", notes: "", subject: "Quant" as SubjectKey, solved: false, imageUrl: "" });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ title: "", content: "", tags: "", imageUrl: "" });

  useEffect(() => {
    setMounted(true);
    setClock(new Date());

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setState(normalizeStoredState(JSON.parse(saved)));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setState(buildInitialState());
      }
    }
  }, []);

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all data and start fresh? This cannot be undone.")) {
      window.localStorage.removeItem(STORAGE_KEY);
      setState(buildInitialState());
    }
  };

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [mounted, state]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const weekStart = startOfWeek.toISOString().slice(0, 10);
    const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

    const sessions = Array.isArray(state.sessions) ? state.sessions : [];
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const weeklyPlan = Array.isArray(state.weeklyPlan) ? state.weeklyPlan : [];
    const monthlyPlan = Array.isArray(state.monthlyPlan) ? state.monthlyPlan : [];
    const profile = state.profile ?? buildInitialState().profile;

    const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
    const todayHours = sessions.filter((session) => session.date === today).reduce((sum, session) => sum + session.hours, 0);
    const weeklyHours = sessions.filter((session) => session.date >= weekStart).reduce((sum, session) => sum + session.hours, 0);
    const monthlyHours = sessions.filter((session) => session.date >= monthStart).reduce((sum, session) => sum + session.hours, 0);
    const totalProblems = sessions.reduce((sum, session) => sum + session.problemsSolved, 0);
    const totalReading = sessions.reduce((sum, session) => sum + session.readingMinutes, 0);
    const weeklyGoal = profile.weeklyTargetHours > 0 ? Math.round((weeklyHours / profile.weeklyTargetHours) * 100) : 0;
    const monthlyGoal = profile.monthlyTargetHours > 0 ? Math.round((monthlyHours / profile.monthlyTargetHours) * 100) : 0;
    const dailyGoal = profile.dailyStudyHours > 0 ? Math.round((todayHours / profile.dailyStudyHours) * 100) : 0;
    const doneSlots = weeklyPlan.filter((slot) => slot.completed).length;
    const dailyCompleted = tasks.filter((task) => task.done).length;
    const monthlyCompleted = monthlyPlan.filter((goal) => goal.completed).length;

    return {
      totalHours,
      todayHours,
      weeklyHours,
      monthlyHours,
      totalProblems,
      totalReading,
      weeklyGoal,
      monthlyGoal,
      dailyGoal,
      streak: calculateStreak(sessions),
      doneSlots,
      dailyCompleted,
      monthlyCompleted,
    };
  }, [state]);

  const filteredNotes = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    const notes = Array.isArray(state.notes) ? state.notes : [];
    if (!query) return notes;
    return notes.filter((note) => `${note.title} ${note.content} ${note.tags}`.toLowerCase().includes(query));
  }, [noteQuery, state.notes]);

  const activeView = state.activeView as ViewOption;
  const setView = (view: ViewOption) => setState((prev) => ({ ...prev, activeView: view }));
  const profile = state.profile ?? buildInitialState().profile;

  const addLog = (event: FormEvent) => {
    event.preventDefault();
    if (!logForm.topic.trim()) return;

    const entry = {
      id: `log-${Date.now()}`,
      date: logForm.date,
      subject: logForm.subject,
      topic: logForm.topic,
      hours: Number(logForm.hours),
      problemsSolved: Number(logForm.problemsSolved),
      readingMinutes: Number(logForm.readingMinutes),
      pagesRead: Number(logForm.pagesRead),
      notes: logForm.notes,
      productivity: 4,
      mood: "Steady",
      link: logForm.link,
      status: "Completed" as StudySession["status"],
    };

    setState((prev) => ({
      ...prev,
      sessions: [entry, ...prev.sessions],
      topics: prev.topics.map((topic) => {
        if (topic.subject !== entry.subject) return topic;
        const nextProgress = Math.min(100, topic.progress + Math.max(1, Math.round(entry.hours * 5)));
        return { ...topic, hours: topic.hours + entry.hours, problemsSolved: topic.problemsSolved + entry.problemsSolved, progress: nextProgress, status: nextProgress >= 100 ? "Done" : "In progress" };
      }),
    }));

    setLogForm({ ...logForm, topic: "", hours: "0", problemsSolved: "0", readingMinutes: "0", pagesRead: "0", notes: "", link: "" });
  };

  const addTask = (event: FormEvent) => {
    event.preventDefault();
    if (!taskForm.title.trim()) return;
    setState((prev) => ({ ...prev, tasks: [...prev.tasks, { id: `task-${Date.now()}`, title: taskForm.title, priority: "Medium", done: false, estimate: taskForm.estimate, subject: taskForm.subject, notes: taskForm.notes }] }));
    setTaskForm({ title: "", subject: "Quant", estimate: "45 min", notes: "" });
  };

  const toggleTask = (id: string) => setState((prev) => ({ ...prev, tasks: prev.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) }));
  const startEditingTask = (task: TaskItem) => { setEditingTaskId(task.id); setTaskDraft({ title: task.title, subject: task.subject, estimate: task.estimate, notes: task.notes }); };
  const saveTask = () => { if (!editingTaskId) return; setState((prev) => ({ ...prev, tasks: prev.tasks.map((task) => (task.id === editingTaskId ? { ...task, ...taskDraft } : task)) })); setEditingTaskId(null); };
  const deleteTask = (id: string) => setState((prev) => ({ ...prev, tasks: prev.tasks.filter((task) => task.id !== id) }));

  const addSlot = (event: FormEvent) => {
    event.preventDefault();
    if (!slotForm.title.trim()) return;
    setState((prev) => ({ ...prev, weeklyPlan: [...prev.weeklyPlan, { id: `slot-${Date.now()}`, day: slotForm.day, time: slotForm.time, title: slotForm.title, subject: slotForm.subject, duration: slotForm.duration, completed: false }] }));
    setSlotForm({ ...slotForm, title: "" });
  };

  const toggleSlot = (id: string) => setState((prev) => ({ ...prev, weeklyPlan: prev.weeklyPlan.map((slot) => (slot.id === id ? { ...slot, completed: !slot.completed } : slot)) }));
  const startEditingSlot = (slot: WeeklySlot) => { setEditingSlotId(slot.id); setSlotDraft({ day: slot.day, time: slot.time, title: slot.title, subject: slot.subject, duration: slot.duration }); };
  const saveSlot = () => { if (!editingSlotId) return; setState((prev) => ({ ...prev, weeklyPlan: prev.weeklyPlan.map((slot) => (slot.id === editingSlotId ? { ...slot, ...slotDraft } : slot)) })); setEditingSlotId(null); };
  const deleteSlot = (id: string) => setState((prev) => ({ ...prev, weeklyPlan: prev.weeklyPlan.filter((slot) => slot.id !== id) }));

  const addMonthlyGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!monthlyForm.title.trim()) return;
    setState((prev) => ({ ...prev, monthlyPlan: [...prev.monthlyPlan, { id: `month-${Date.now()}`, title: monthlyForm.title, targetHours: Number(monthlyForm.targetHours) || 0, completed: false, notes: monthlyForm.notes, subject: monthlyForm.subject, priority: monthlyForm.priority }] }));
    setMonthlyForm({ title: "", targetHours: "0", notes: "", subject: "Quant", priority: "Medium" });
  };

  const toggleMonthlyGoal = (id: string) => setState((prev) => ({ ...prev, monthlyPlan: prev.monthlyPlan.map((goal) => (goal.id === id ? { ...goal, completed: !goal.completed } : goal)) }));
  const startEditingMonthly = (goal: MonthlyGoalItem) => { setEditingMonthlyId(goal.id); setMonthlyDraft({ title: goal.title, targetHours: goal.targetHours, notes: goal.notes, subject: goal.subject, priority: goal.priority }); };
  const saveMonthly = () => { if (!editingMonthlyId) return; setState((prev) => ({ ...prev, monthlyPlan: prev.monthlyPlan.map((goal) => (goal.id === editingMonthlyId ? { ...goal, ...monthlyDraft } : goal)) })); setEditingMonthlyId(null); };
  const deleteMonthly = (id: string) => setState((prev) => ({ ...prev, monthlyPlan: prev.monthlyPlan.filter((goal) => goal.id !== id) }));

  const addTopic = (event: FormEvent) => {
    event.preventDefault();
    if (!topicForm.name.trim()) return;
    setState((prev) => ({ ...prev, topics: [...prev.topics, { id: `topic-${Date.now()}`, subject: topicForm.subject, name: topicForm.name, progress: 0, hours: Number(topicForm.hours), problemsSolved: 0, accuracy: 0, status: "Planned", notes: topicForm.notes, priority: topicForm.priority, difficulty: topicForm.difficulty, estimatedHours: Number(topicForm.hours), weightage: Number(topicForm.weightage), revisionCount: 0, bookmarks: false, theoryBook: topicForm.theoryBook, problemBook: topicForm.problemBook, youtubeLink: topicForm.youtubeLink, youtubeChannel: topicForm.youtubeChannel, resourceLink: topicForm.resourceLink, subSections: [] }] }));
    setTopicForm({ ...topicForm, name: "", hours: "0", notes: "", weightage: "0", theoryBook: "", problemBook: "", youtubeLink: "", youtubeChannel: "" });
  };

  const updateTopic = (id: string, patch: Partial<Topic>) => setState((prev) => ({ ...prev, topics: prev.topics.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)) }));

  const addQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!questionForm.title.trim() || !questionForm.link.trim()) return;
    const question: ImportantQuestion = { id: `question-${Date.now()}`, title: questionForm.title, link: questionForm.link, subject: questionForm.subject, notes: questionForm.notes, solved: false, createdAt: new Date().toISOString().slice(0, 10), imageUrl: questionForm.imageUrl };
    setState((prev) => ({ ...prev, importantQuestions: [question, ...prev.importantQuestions] }));
    setQuestionForm({ title: "", link: "", subject: "Quant", notes: "", imageUrl: "" });
  };

  const handleQuestionImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, (value) => setQuestionForm((prev) => ({ ...prev, imageUrl: value })));
  };
  const handleQuestionDraftImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, (value) => setQuestionDraft((prev) => ({ ...prev, imageUrl: value })));
  };

  const startEditingQuestion = (question: ImportantQuestion) => { setEditingQuestionId(question.id); setQuestionDraft({ title: question.title, link: question.link, notes: question.notes, subject: question.subject, solved: question.solved, imageUrl: question.imageUrl ?? "" }); };
  const saveQuestion = () => { if (!editingQuestionId) return; setState((prev) => ({ ...prev, importantQuestions: prev.importantQuestions.map((question) => (question.id === editingQuestionId ? { ...question, ...questionDraft } : question)) })); setEditingQuestionId(null); };
  const deleteQuestion = (id: string) => setState((prev) => ({ ...prev, importantQuestions: prev.importantQuestions.filter((question) => question.id !== id) }));

  const addNote = (event: FormEvent) => {
    event.preventDefault();
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    const note: NoteItem = { id: `note-${Date.now()}`, title: noteForm.title, content: noteForm.content, tags: noteForm.tags, updatedAt: new Date().toISOString().slice(0, 10), imageUrl: noteForm.imageUrl };
    setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
    setNoteForm({ title: "", content: "", tags: "", imageUrl: "" });
  };

  const handleNoteImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, (value) => setNoteForm((prev) => ({ ...prev, imageUrl: value })));
  };
  const handleNoteDraftImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    readFileAsDataUrl(file, (value) => setNoteDraft((prev) => ({ ...prev, imageUrl: value })));
  };

  const startEditingNote = (note: NoteItem) => { setEditingNoteId(note.id); setNoteDraft({ title: note.title, content: note.content, tags: note.tags, imageUrl: note.imageUrl ?? "" }); };
  const saveNote = () => { if (!editingNoteId) return; setState((prev) => ({ ...prev, notes: prev.notes.map((note) => (note.id === editingNoteId ? { ...note, ...noteDraft, updatedAt: new Date().toISOString().slice(0, 10) } : note)) })); setEditingNoteId(null); };
  const deleteNote = (id: string) => setState((prev) => ({ ...prev, notes: prev.notes.filter((note) => note.id !== id) }));

  const addRevisionTopic = (event: FormEvent) => {
    event.preventDefault();
    if (!revisionForm.title.trim()) return;
    const topic: RevisionTopic = { id: `revision-${Date.now()}`, title: revisionForm.title, subject: revisionForm.subject, importance: revisionForm.importance, notes: revisionForm.notes, createdAt: new Date().toISOString().slice(0, 10) };
    setState((prev) => ({ ...prev, revisionTopics: [topic, ...prev.revisionTopics] }));
    setRevisionForm({ title: "", subject: "Quant", importance: "Medium", notes: "" });
  };

  const exportState = () => { const data = new Blob([JSON.stringify(state)], { type: "application/json" }); const url = URL.createObjectURL(data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "cat-os-backup.json"; anchor.click(); URL.revokeObjectURL(url); };
  const importState = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); setState(normalizeStoredState(parsed)); } catch { window.alert("That backup file could not be read."); } }; reader.readAsText(file); };

  const badgeClass = (subject: SubjectKey) => getSubjectBadge(subject);

  const milestoneMessage = useMemo(() => {
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    const weeklyPlan = Array.isArray(state.weeklyPlan) ? state.weeklyPlan : [];
    const monthlyPlan = Array.isArray(state.monthlyPlan) ? state.monthlyPlan : [];
    const todayPlan = tasks.length;
    const todayCompleted = tasks.filter((task) => task.done).length;
    const weeklyCompleted = weeklyPlan.filter((slot) => slot.completed).length;
    const weeklyTotal = weeklyPlan.length;
    const monthlyCompleted = monthlyPlan.filter((goal) => goal.completed).length;
    const monthlyTotal = monthlyPlan.length;

    if (todayPlan > 0 && todayCompleted === todayPlan) return `Day complete: ${todayCompleted}/${todayPlan} daily targets are done.`;
    if (weeklyTotal > 0 && weeklyCompleted === weeklyTotal) return `Week complete: ${weeklyCompleted} weekly blocks are checked off.`;
    if (monthlyTotal > 0 && monthlyCompleted === monthlyTotal) return `Month complete: ${monthlyCompleted} monthly goals are finished.`;
    if (todayPlan > 0 || weeklyTotal > 0 || monthlyTotal > 0) return `Progress is live: ${todayCompleted}/${todayPlan} daily, ${weeklyCompleted}/${weeklyTotal} weekly, and ${monthlyCompleted}/${monthlyTotal} monthly items are complete.`;
    return "Start by adding your first daily plan, weekly block, and monthly goal so the dashboard can update with real progress.";
  }, [state]);

  // Render only after hydration to avoid mismatches
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center"><p className="text-slate-600 dark:text-slate-300">Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_35%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_35%),linear-gradient(135deg,#020617_0%,#111827_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/70 bg-white/80 px-6 py-5 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-orange-500">CAT OS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile.name ? `Welcome back, ${profile.name}` : "Your CAT OS dashboard"}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{formatDaysLeft(profile.examDate)} to your exam • everything updates live as you enter study data.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                <p className="text-[10px] uppercase tracking-[0.3em]">Exam countdown</p>
                <p className="mt-1 text-sm font-semibold">{clock ? formatExamCountdown(profile.examDate) : "--"}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
                <label className="text-[10px] uppercase tracking-[0.28em] text-orange-500">Your name</label>
                <input value={profile.name} onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, name: event.target.value } }))} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-orange-500/30 dark:bg-slate-950 dark:text-slate-100" />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <span className="mb-1 block text-slate-500">Registration date</span>
              <input type="date" value={profile.registrationDate} onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, registrationDate: event.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
              <p className="mt-2 text-xs text-slate-500">{profile.registrationDate ? `Countdown: ${formatCountdown(profile.registrationDate)}` : "Add a registration date"}</p>
            </label>
            <label className="text-sm rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <span className="mb-1 block text-slate-500">Exam date</span>
              <input type="date" value={profile.examDate} onChange={(event) => setState((prev) => ({ ...prev, profile: { ...prev.profile, examDate: event.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950" />
              <p className="mt-2 text-xs text-slate-500">{profile.examDate ? `Countdown: ${formatCountdown(profile.examDate)}` : "Add an exam date"}</p>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500">Registration</p>
              <p className="mt-2 font-semibold">{profile.registrationDate ? profile.registrationDate : "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-slate-500">Exam</p>
              <p className="mt-2 font-semibold">{profile.examDate ? profile.examDate : "Not set"}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em]">Storage</p>
            <p className="mt-1">Your data is stored locally in this browser via localStorage, so it stays available after refreshes on this device. For real multi-device sync after Vercel hosting, a cloud backend such as Supabase or Firebase is the next step.</p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-3xl border border-white/70 bg-white/70 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
          {viewOptions.map((view) => (
            <button key={view} onClick={() => setView(view)} className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${activeView === view ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              {view}
            </button>
          ))}
        </div>

        {activeView === "Dashboard" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-700 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">{milestoneMessage}</div>
            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/70 bg-slate-950 p-6 text-white shadow-[0_20px_60px_-20px_rgba(2,6,23,0.55)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Daily cockpit</p>
                    <h2 className="mt-2 text-2xl font-semibold">A calm planning board that grows with your entries</h2>
                    <p className="mt-3 max-w-xl text-sm text-slate-300">Log what you studied, track what remains, and keep your daily, weekly, and monthly progress visible in one place.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3"><Sparkles size={20} /></div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-400">Hours logged</p><p className="mt-2 text-3xl font-semibold">{stats.totalHours.toFixed(1)}h</p></div>
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-400">Problems solved</p><p className="mt-2 text-3xl font-semibold">{stats.totalProblems}</p></div>
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-400">Streak</p><p className="mt-2 text-3xl font-semibold">{stats.streak}d</p></div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                <div className="flex items-center gap-3"><div className="rounded-2xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"><Target size={18} /></div><div><p className="text-sm text-slate-500">Log your study</p><h3 className="text-xl font-semibold">What did you study today?</h3></div></div>
                <form onSubmit={addLog} className="mt-4 space-y-3">
                  <input type="date" value={logForm.date} onChange={(event) => setLogForm({ ...logForm, date: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                  <div className="grid gap-3 sm:grid-cols-2"><select value={logForm.subject} onChange={(event) => setLogForm({ ...logForm, subject: event.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><input placeholder="Topic" value={logForm.topic} onChange={(event) => setLogForm({ ...logForm, topic: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                  <div className="grid gap-3 sm:grid-cols-2"><input type="number" placeholder="Hours" value={logForm.hours} onChange={(event) => setLogForm({ ...logForm, hours: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><input type="number" placeholder="Problems solved" value={logForm.problemsSolved} onChange={(event) => setLogForm({ ...logForm, problemsSolved: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                  <div className="grid gap-3 sm:grid-cols-2"><input type="number" placeholder="Reading mins" value={logForm.readingMinutes} onChange={(event) => setLogForm({ ...logForm, readingMinutes: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><input type="number" placeholder="Pages read" value={logForm.pagesRead} onChange={(event) => setLogForm({ ...logForm, pagesRead: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                  <input placeholder="Resource link" value={logForm.link} onChange={(event) => setLogForm({ ...logForm, link: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                  <textarea placeholder="Summarize your session" value={logForm.notes} onChange={(event) => setLogForm({ ...logForm, notes: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                  <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Save session</button>
                </form>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Progress summary</p><h3 className="text-xl font-semibold">Day, week, month at a glance</h3></div><div className="rounded-2xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><TrendingUp size={18} /></div></div>
                <div className="mt-4 space-y-4">
                  <div><div className="mb-1 flex justify-between text-sm"><span>Today</span><span>{stats.todayHours.toFixed(1)}h / {profile.dailyStudyHours || 0}h</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.min(100, stats.dailyGoal)}%` }} /></div></div>
                  <div><div className="mb-1 flex justify-between text-sm"><span>Week</span><span>{stats.weeklyGoal}%</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, stats.weeklyGoal)}%` }} /></div></div>
                  <div><div className="mb-1 flex justify-between text-sm"><span>Month</span><span>{stats.monthlyGoal}%</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.min(100, stats.monthlyGoal)}%` }} /></div></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/80">{stats.dailyCompleted} daily tasks done, {stats.doneSlots} weekly plan blocks checked, and {stats.monthlyCompleted} monthly goals completed.</div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                <div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Today and upcoming</p><h3 className="text-xl font-semibold">Your plan snapshot</h3></div><div className="rounded-2xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Clock3 size={18} /></div></div>
                <div className="mt-4 space-y-3">{state.tasks.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">No daily tasks yet.</div> : state.tasks.slice(0, 4).map((task) => <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/80"><div className="flex items-start justify-between gap-2"><p className="font-semibold">{task.title}</p><span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{task.subject}</span></div><p className="mt-1 text-sm text-slate-500">{task.estimate} • {task.notes || "No extra note"}</p></div>)}</div>
                <div className="mt-4 space-y-2">{state.weeklyPlan.slice(0, 3).map((slot) => <div key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/80"><span className="font-semibold">{slot.title}</span> • {slot.day} {slot.time}</div>)}{state.monthlyPlan.slice(0, 3).map((goal) => <div key={goal.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/80"><span className="font-semibold">{goal.title}</span> • {goal.targetHours}h target</div>)}</div>
              </div>
            </section>
          </motion.div>
        )}

        {activeView === "Today" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"><Target size={18} /></div><div><p className="text-sm text-slate-500">Daily tasks</p><h3 className="text-xl font-semibold">What's on your plate today?</h3></div></div>
              <form onSubmit={addTask} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
                <input placeholder="Task title" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <div className="grid gap-3 sm:grid-cols-2"><select value={taskForm.subject} onChange={(event) => setTaskForm({ ...taskForm, subject: event.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><input placeholder="Time estimate" value={taskForm.estimate} onChange={(event) => setTaskForm({ ...taskForm, estimate: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                <textarea placeholder="Notes" value={taskForm.notes} onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add task</button>
              </form>
              <div className="space-y-3">
                {state.tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">No tasks yet. Add your first task above!</div>
                ) : (
                  state.tasks.map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                      {editingTaskId === task.id ? (
                        <div className="space-y-3">
                          <input value={taskDraft.title} onChange={(e) => setTaskDraft({ ...taskDraft, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                          <div className="grid gap-3 sm:grid-cols-2"><select value={taskDraft.subject} onChange={(e) => setTaskDraft({ ...taskDraft, subject: e.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><input value={taskDraft.estimate} onChange={(e) => setTaskDraft({ ...taskDraft, estimate: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                          <textarea value={taskDraft.notes} onChange={(e) => setTaskDraft({ ...taskDraft, notes: e.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                          <div className="flex gap-2"><button onClick={saveTask} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Save</button><button onClick={() => setEditingTaskId(null)} className="rounded-2xl bg-slate-400 hover:bg-slate-500 px-3 py-2 text-sm font-semibold text-white">Cancel</button></div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-semibold ${task.done ? "line-through text-slate-400" : ""}`}>{task.title}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{task.estimate} • {task.subject} • {task.notes || "No notes"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2"><button onClick={() => startEditingTask(task)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><Edit2 size={16} /></button><button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeView === "Planner" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><CalendarDays size={18} /></div><div><p className="text-sm text-slate-500">Weekly Planner</p><h3 className="text-xl font-semibold">Your study blocks</h3></div></div>
              <form onSubmit={addSlot} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
                <div className="grid gap-3 sm:grid-cols-2"><select value={slotForm.day} onChange={(event) => setSlotForm({ ...slotForm, day: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option></select><input type="time" value={slotForm.time} onChange={(event) => setSlotForm({ ...slotForm, time: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                <input placeholder="Session title" value={slotForm.title} onChange={(event) => setSlotForm({ ...slotForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <div className="grid gap-3 sm:grid-cols-2"><select value={slotForm.subject} onChange={(event) => setSlotForm({ ...slotForm, subject: event.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><input placeholder="Duration" value={slotForm.duration} onChange={(event) => setSlotForm({ ...slotForm, duration: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add block</button>
              </form>
              <div className="space-y-3">
                {state.weeklyPlan.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">No weekly blocks yet. Add your first block above!</div>
                ) : (
                  state.weeklyPlan.map((slot) => (
                    <div key={slot.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                      {editingSlotId === slot.id ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2"><select value={slotDraft.day} onChange={(e) => setSlotDraft({ ...slotDraft, day: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option></select><input type="time" value={slotDraft.time} onChange={(e) => setSlotDraft({ ...slotDraft, time: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                          <input value={slotDraft.title} onChange={(e) => setSlotDraft({ ...slotDraft, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                          <div className="grid gap-3 sm:grid-cols-2"><select value={slotDraft.subject} onChange={(e) => setSlotDraft({ ...slotDraft, subject: e.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><input value={slotDraft.duration} onChange={(e) => setSlotDraft({ ...slotDraft, duration: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                          <div className="flex gap-2"><button onClick={saveSlot} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Save</button><button onClick={() => setEditingSlotId(null)} className="rounded-2xl bg-slate-400 hover:bg-slate-500 px-3 py-2 text-sm font-semibold text-white">Cancel</button></div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input type="checkbox" checked={slot.completed} onChange={() => toggleSlot(slot.id)} className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-semibold ${slot.completed ? "line-through text-slate-400" : ""}`}>{slot.title}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{slot.day} at {slot.time} • {slot.duration} • {slot.subject}</p>
                            </div>
                          </div>
                          <div className="flex gap-2"><button onClick={() => startEditingSlot(slot)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><Edit2 size={16} /></button><button onClick={() => deleteSlot(slot.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Target size={18} /></div><div><p className="text-sm text-slate-500">Monthly Goals</p><h3 className="text-xl font-semibold">Your monthly targets</h3></div></div>
              <form onSubmit={addMonthlyGoal} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
                <input placeholder="Goal title" value={monthlyForm.title} onChange={(event) => setMonthlyForm({ ...monthlyForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <div className="grid gap-3 sm:grid-cols-2"><input type="number" placeholder="Target hours" value={monthlyForm.targetHours} onChange={(event) => setMonthlyForm({ ...monthlyForm, targetHours: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><select value={monthlyForm.subject} onChange={(event) => setMonthlyForm({ ...monthlyForm, subject: event.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select></div>
                <div className="grid gap-3 sm:grid-cols-2"><select value={monthlyForm.priority} onChange={(event) => setMonthlyForm({ ...monthlyForm, priority: event.target.value as MonthlyGoalItem["priority"] })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select><input placeholder="Notes" value={monthlyForm.notes} onChange={(event) => setMonthlyForm({ ...monthlyForm, notes: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add goal</button>
              </form>
              <div className="space-y-3">
                {state.monthlyPlan.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">No monthly goals yet. Add your first goal above!</div>
                ) : (
                  state.monthlyPlan.map((goal) => (
                    <div key={goal.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                      {editingMonthlyId === goal.id ? (
                        <div className="space-y-3">
                          <input value={monthlyDraft.title} onChange={(e) => setMonthlyDraft({ ...monthlyDraft, title: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                          <div className="grid gap-3 sm:grid-cols-2"><input type="number" value={monthlyDraft.targetHours} onChange={(e) => setMonthlyDraft({ ...monthlyDraft, targetHours: Number(e.target.value) })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><select value={monthlyDraft.subject} onChange={(e) => setMonthlyDraft({ ...monthlyDraft, subject: e.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select></div>
                          <div className="grid gap-3 sm:grid-cols-2"><select value={monthlyDraft.priority} onChange={(e) => setMonthlyDraft({ ...monthlyDraft, priority: e.target.value as MonthlyGoalItem["priority"] })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select><input value={monthlyDraft.notes} onChange={(e) => setMonthlyDraft({ ...monthlyDraft, notes: e.target.value })} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                          <div className="flex gap-2"><button onClick={saveMonthly} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Save</button><button onClick={() => setEditingMonthlyId(null)} className="rounded-2xl bg-slate-400 hover:bg-slate-500 px-3 py-2 text-sm font-semibold text-white">Cancel</button></div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input type="checkbox" checked={goal.completed} onChange={() => toggleMonthlyGoal(goal.id)} className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-semibold ${goal.completed ? "line-through text-slate-400" : ""}`}>{goal.title}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{goal.targetHours}h target • {goal.subject} • {goal.priority} priority • {goal.notes || "No notes"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2"><button onClick={() => startEditingMonthly(goal)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><Edit2 size={16} /></button><button onClick={() => deleteMonthly(goal.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeView === "History" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Clock3 size={18} /></div><div><p className="text-sm text-slate-500">Study History</p><h3 className="text-xl font-semibold">Your study log</h3></div></div>
            <div className="space-y-3">
              {state.sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700"><p>No study sessions logged yet. Log your first session on the Dashboard!</p></div>
              ) : (
                state.sessions.slice(0, 50).map((session) => (
                  <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{session.topic}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{session.date} • {session.subject}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getSubjectBadge(session.subject)}`}>{session.hours}h</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm text-slate-600 dark:text-slate-400 mb-2">
                      <div>📊 {session.problemsSolved} problems</div>
                      <div>📖 {session.readingMinutes}m reading</div>
                      <div>📄 {session.pagesRead} pages</div>
                    </div>
                    {session.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mb-2"><strong>Notes:</strong> {session.notes}</p>}
                    {session.link && <a href={session.link} target="_blank" rel="noreferrer" className="text-sm text-orange-600 dark:text-orange-300 hover:underline">🔗 Resource link</a>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === "Syllabus" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"><Brain size={18} /></div><div><p className="text-sm text-slate-500">Syllabus Tracker</p><h3 className="text-xl font-semibold">Track your entire syllabus by subject</h3></div></div>
              <form onSubmit={addTopic} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
                <select value={topicForm.subject} onChange={(event) => setTopicForm({ ...topicForm, subject: event.target.value as SubjectKey })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select>
                <input placeholder="Topic name" value={topicForm.name} onChange={(event) => setTopicForm({ ...topicForm, name: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <div className="grid gap-3 sm:grid-cols-2"><input type="number" placeholder="Hours planned" value={topicForm.hours} onChange={(event) => setTopicForm({ ...topicForm, hours: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /><input type="number" placeholder="Weightage" value={topicForm.weightage} onChange={(event) => setTopicForm({ ...topicForm, weightage: event.target.value })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" /></div>
                <textarea placeholder="Notes" value={topicForm.notes} onChange={(event) => setTopicForm({ ...topicForm, notes: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
                <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add topic</button>
              </form>
            </div>

            {["Quant", "LRDI", "VARC"].map((subject) => {
              const filtered = state.topics.filter((topic) => topic.subject === (subject as SubjectKey));
              return (
                <div key={subject} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{subject}</h3>
                    <div className={`rounded-2xl p-2 ${getSubjectBadge(subject as SubjectKey)}`}>
                      <BookOpen size={18} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {filtered.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">No {subject} topics yet. Add one above.</div>
                    ) : (
                      filtered.map((topic) => (
                        <div key={topic.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/80">
                          <p className="font-semibold">{topic.name}</p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm text-slate-600 dark:text-slate-300">
                            <span>Progress: {topic.progress}%</span>
                            <span>Hours: {topic.hours}</span>
                            <span>Status: {topic.status}</span>
                          </div>
                          {(topic.theoryBook || topic.problemBook || topic.youtubeLink) && (
                            <div className="mt-2 flex flex-wrap gap-2 text-sm">
                              {topic.theoryBook && <a className="text-orange-600 dark:text-orange-300 hover:underline" href={topic.theoryBook} target="_blank" rel="noreferrer">📚 Theory</a>}
                              {topic.problemBook && <a className="text-orange-600 dark:text-orange-300 hover:underline" href={topic.problemBook} target="_blank" rel="noreferrer">✏️ Problems</a>}
                              {topic.youtubeLink && <a className="text-orange-600 dark:text-orange-300 hover:underline" href={topic.youtubeLink} target="_blank" rel="noreferrer">▶️ YouTube</a>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeView === "Important Questions" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"><Sparkles size={18} /></div><div><p className="text-sm text-slate-500">Important Questions</p><h3 className="text-xl font-semibold">Tough questions to revisit</h3></div></div>
            <form onSubmit={addQuestion} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
              <input placeholder="Question title" value={questionForm.title} onChange={(event) => setQuestionForm({ ...questionForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <input placeholder="Link to question" value={questionForm.link} onChange={(event) => setQuestionForm({ ...questionForm, link: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <select value={questionForm.subject} onChange={(event) => setQuestionForm({ ...questionForm, subject: event.target.value as SubjectKey })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select>
              <textarea placeholder="Notes on this question" value={questionForm.notes} onChange={(event) => setQuestionForm({ ...questionForm, notes: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add question</button>
            </form>
            <div className="space-y-3">
              {state.importantQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">No questions added yet. Add your first important question above!</div>
              ) : (
                state.importantQuestions.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{question.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{question.subject} • Added {question.createdAt}</p>
                      </div>
                      <input type="checkbox" checked={question.solved} onChange={() => setState((prev) => ({ ...prev, importantQuestions: prev.importantQuestions.map((q) => q.id === question.id ? { ...q, solved: !q.solved } : q) }))} />
                    </div>
                    {question.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{question.notes}</p>}
                    <a href={question.link} target="_blank" rel="noreferrer" className="text-sm text-orange-600 dark:text-orange-300 hover:underline">🔗 View question</a>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === "Revision" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-red-100 p-2 text-red-600 dark:bg-red-500/10 dark:text-red-300"><NotebookPen size={18} /></div><div><p className="text-sm text-slate-500">Revision Topics</p><h3 className="text-xl font-semibold">Topics to revise</h3></div></div>
            <form onSubmit={addRevisionTopic} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
              <input placeholder="Topic title" value={revisionForm.title} onChange={(event) => setRevisionForm({ ...revisionForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <div className="grid gap-3 sm:grid-cols-2"><select value={revisionForm.subject} onChange={(event) => setRevisionForm({ ...revisionForm, subject: event.target.value as SubjectKey })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="Quant">Quant</option><option value="LRDI">LRDI</option><option value="VARC">VARC</option></select><select value={revisionForm.importance} onChange={(event) => setRevisionForm({ ...revisionForm, importance: event.target.value as RevisionTopic["importance"] })} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
              <textarea placeholder="Revision notes" value={revisionForm.notes} onChange={(event) => setRevisionForm({ ...revisionForm, notes: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add revision topic</button>
            </form>
            <div className="space-y-3">
              {state.revisionTopics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">No revision topics yet. Add your first topic above!</div>
              ) : (
                state.revisionTopics.map((topic) => (
                  <div key={topic.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{topic.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{topic.subject} • {topic.importance} importance • Added {topic.createdAt}</p>
                      </div>
                    </div>
                    {topic.notes && <p className="text-sm text-slate-600 dark:text-slate-400">{topic.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === "Notes" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-sky-100 p-2 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><NotebookPen size={18} /></div><div><p className="text-sm text-slate-500">Notes</p><h3 className="text-xl font-semibold">Your study notes</h3></div></div>
            <form onSubmit={addNote} className="mb-6 space-y-3 p-4 border border-slate-200 rounded-2xl dark:border-slate-800">
              <input placeholder="Note title" value={noteForm.title} onChange={(event) => setNoteForm({ ...noteForm, title: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <textarea placeholder="Note content" value={noteForm.content} onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })} className="min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <input placeholder="Tags (comma separated)" value={noteForm.tags} onChange={(event) => setNoteForm({ ...noteForm, tags: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
              <button type="submit" className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><PlusCircle size={16} /> Add note</button>
            </form>
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input placeholder="Search notes..." value={noteQuery} onChange={(event) => setNoteQuery(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            </div>
            <div className="space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">{noteQuery ? "No notes match your search." : "No notes yet. Add your first note above!"}</div>
              ) : (
                filteredNotes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/80">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{note.title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{note.tags} • Updated {note.updatedAt}</p>
                      </div>
                      <div className="flex gap-2"><button onClick={() => startEditingNote(note)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><Edit2 size={16} /></button><button onClick={() => deleteNote(note.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === "Calendar" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-pink-100 p-2 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300"><CalendarDays size={18} /></div><div><p className="text-sm text-slate-500">Study Calendar</p><h3 className="text-xl font-semibold">Your study intensity last 12 days</h3></div></div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
              {(() => {
                const today = new Date();
                const days = [];
                for (let i = 11; i >= 0; i--) {
                  const date = new Date(today);
                  date.setDate(date.getDate() - i);
                  const dateStr = date.toISOString().slice(0, 10);
                  const dayHours = state.sessions.filter((s) => s.date === dateStr).reduce((sum, s) => sum + s.hours, 0);
                  const intensity = Math.min(100, dayHours * 20);
                  days.push({ date: dateStr, hours: dayHours, intensity });
                }
                return days.map((day) => (
                  <div key={day.date} className="text-center">
                    <div className="rounded-2xl p-3 text-center text-xs font-semibold text-white transition" style={{ backgroundColor: `rgba(249, 115, 22, ${Math.max(0.1, day.intensity / 100)})` }}>
                      {day.hours.toFixed(1)}h
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">{new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                ));
              })()}
            </div>
          </motion.div>
        )}

        {activeView === "Settings" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-3 mb-4"><div className="rounded-2xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Settings size={18} /></div><div><p className="text-sm text-slate-500">Data Management</p><h3 className="text-xl font-semibold">Backup and reset</h3></div></div>
              <div className="space-y-3">
                <button onClick={exportState} className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition">📥 Export backup (JSON)</button>
                <label className="block">
                  <span className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition text-center cursor-pointer inline-block">📤 Import backup (JSON)</span>
                  <input type="file" accept=".json" onChange={importState} className="hidden" />
                </label>
                <button onClick={clearAllData} className="w-full rounded-2xl bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-semibold text-white transition">🗑️ Clear all data and start fresh</button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
