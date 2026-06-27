"use client";

import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CircleDot,
  Cloud,
  ClipboardCheck,
  Copy,
  Database,
  FileCheck2,
  FilePenLine,
  FileText,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogIn,
  LogOut,
  Plus,
  Save,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  baseTracker,
  createDemoAnalysis,
  jobSeed,
  resumeSeed,
  type AgentStep,
  type ApprovalGate,
  type AnalysisResult,
  type Status,
  type ToolRun,
  type TrackerItem,
} from "../lib/analysis";
import {
  applicationRecordToTrackerItem,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  type ApplicationRecord,
  type User,
} from "../lib/supabase";

type Section = "dashboard" | "analysis" | "results" | "tracker" | "account";
type AnalysisSource = "demo" | "gemini";
type AuthMode = "signin" | "signup";

const navigation: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "New Analysis", icon: SearchCheck },
  { id: "results", label: "Results", icon: Gauge },
  { id: "tracker", label: "Tracker", icon: ClipboardCheck },
  { id: "account", label: "Account", icon: UserRound },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [resumeText, setResumeText] = useState(resumeSeed);
  const [jobText, setJobText] = useState(jobSeed);
  const [company, setCompany] = useState("Northstar Labs");
  const [role, setRole] = useState("Frontend Developer");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(() =>
    createDemoAnalysis("Northstar Labs", "Frontend Developer"),
  );
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>("demo");
  const [analysisNotice, setAnalysisNotice] = useState("Add GEMINI_API_KEY to enable live Gemini analysis.");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [approvedBullets, setApprovedBullets] = useState<number[]>([0]);
  const [trackerItems, setTrackerItems] = useState(baseTracker);
  const [savedCurrentJob, setSavedCurrentJob] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);
  const [persistenceNotice, setPersistenceNotice] = useState(
    isSupabaseConfigured
      ? "Sign in to save applications to Supabase."
      : "Local mode active. Add Supabase env vars to enable cloud persistence.",
  );

  const approvedCount = approvedBullets.length;
  const approvalGates = useMemo(
    () => createWorkflowGates(analysisResult, approvedCount, savedCurrentJob),
    [analysisResult, approvedCount, savedCurrentJob],
  );
  const workflowSteps = useMemo(
    () => createWorkflowSteps(analysisResult, approvedCount, savedCurrentJob),
    [analysisResult, approvedCount, savedCurrentJob],
  );
  const currentTrackerItem = useMemo<TrackerItem>(
    () => ({
      company: company.trim() || "Target Company",
      role: role.trim() || "Target Role",
      score: analysisResult.matchScore,
      status: "Ready",
      date: "Today",
    }),
    [analysisResult.matchScore, company, role],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setAuthUser(data.user);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !authUser) {
      setTrackerItems(baseTracker);
      setPersistenceNotice(
        isSupabaseConfigured
          ? "Sign in to save applications to Supabase."
          : "Local mode active. Add Supabase env vars to enable cloud persistence.",
      );
      return;
    }

    void loadSavedApplications();
  }, [authUser, supabase]);

  const loadSavedApplications = async () => {
    if (!supabase || !authUser) {
      return;
    }

    setIsTrackerLoading(true);

    const { data, error } = await supabase
      .from("application_records")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setPersistenceNotice("Supabase is connected, but the application table is not ready yet.");
      setIsTrackerLoading(false);
      return;
    }

    const savedItems = (data as ApplicationRecord[]).map(applicationRecordToTrackerItem);
    setTrackerItems(savedItems.length ? savedItems : baseTracker);
    setPersistenceNotice(
      savedItems.length
        ? `${savedItems.length} saved application${savedItems.length === 1 ? "" : "s"} loaded from Supabase.`
        : "Signed in. Save an application to persist it to Supabase.",
    );
    setIsTrackerLoading(false);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisNotice("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company,
          role,
          resumeText,
          jobText,
        }),
      });

      const data = (await response.json()) as {
        source?: AnalysisSource;
        notice?: string;
        result?: AnalysisResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Analysis request failed.");
      }

      setAnalysisResult(data.result);
      setAnalysisSource(data.source || "demo");
      setAnalysisNotice(data.notice || "Analysis ready.");
      setApprovedBullets([]);
      setSavedCurrentJob(false);
      setActiveSection("results");
    } catch {
      setAnalysisResult(createDemoAnalysis(company, role));
      setAnalysisSource("demo");
      setAnalysisNotice("Local fallback shown because the analysis request failed.");
      setApprovedBullets([]);
      setSavedCurrentJob(false);
      setActiveSection("results");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setAuthMessage("Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsAuthLoading(true);
    setAuthMessage("");

    const authCall =
      authMode === "signup"
        ? supabase.auth.signUp({
            email: authEmail,
            password: authPassword,
          })
        : supabase.auth.signInWithPassword({
            email: authEmail,
            password: authPassword,
          });

    const { error } = await authCall;

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(
        authMode === "signup"
          ? "Account created. Check email confirmation settings in Supabase if sign-in is blocked."
          : "Signed in. Tracker persistence is enabled.",
      );
      setAuthPassword("");
    }

    setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    setIsAuthLoading(true);
    await supabase.auth.signOut();
    setAuthUser(null);
    setAuthPassword("");
    setAuthMessage("Signed out. Local demo tracker is shown.");
    setIsAuthLoading(false);
  };

  const saveCurrentJob = async () => {
    if (approvedBullets.length === 0) {
      setPersistenceNotice("Approve at least one resume bullet before saving this application.");
      setActiveSection("results");
      return;
    }

    if (savedCurrentJob) {
      setActiveSection("tracker");
      return;
    }

    if (supabase && authUser) {
      const { data, error } = await supabase
        .from("application_records")
        .insert({
          user_id: authUser.id,
          company: currentTrackerItem.company,
          role: currentTrackerItem.role,
          score: currentTrackerItem.score,
          status: currentTrackerItem.status,
          analysis: analysisResult,
          approved_bullets: approvedBullets,
          cover_letter_opening: analysisResult.coverLetterOpening,
        })
        .select("*")
        .single();

      if (error) {
        setPersistenceNotice("Could not save to Supabase. Check that the Phase 4 SQL schema has been run.");
      } else {
        const savedRecord = data as ApplicationRecord;
        setTrackerItems((items) => [applicationRecordToTrackerItem(savedRecord), ...items]);
        setPersistenceNotice("Application saved to Supabase.");
        setSavedCurrentJob(true);
        setActiveSection("tracker");
        return;
      }
    } else {
      setPersistenceNotice(
        isSupabaseConfigured
          ? "Saved locally. Sign in to persist applications to Supabase."
          : "Saved locally. Configure Supabase env vars for cloud persistence.",
      );
    }

    setTrackerItems((items) => [currentTrackerItem, ...items]);
    setSavedCurrentJob(true);
    setActiveSection("tracker");
  };

  const updateTrackerStatus = async (target: TrackerItem, status: Status) => {
    setTrackerItems((items) =>
      items.map((item) => (isSameTrackerItem(item, target) ? { ...item, status } : item)),
    );

    if (!supabase || !authUser || !target.id) {
      setPersistenceNotice(
        isSupabaseConfigured
          ? "Status updated locally. Sign in and save the application to sync changes."
          : "Status updated locally. Configure Supabase env vars for cloud persistence.",
      );
      return;
    }

    const { error } = await supabase
      .from("application_records")
      .update({ status })
      .eq("id", target.id)
      .eq("user_id", authUser.id);

    setPersistenceNotice(
      error
        ? "Status updated locally, but Supabase sync failed."
        : `Status synced to Supabase: ${status}.`,
    );
  };

  const toggleBullet = (index: number) => {
    setApprovedBullets((items) =>
      items.includes(index) ? items.filter((item) => item !== index) : [...items, index],
    );
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="border-b border-line bg-white/92 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
              <Sparkles size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">ApplyPilot AI</p>
              <p className="truncate text-sm text-slate-500">Career agent workspace</p>
            </div>
          </div>

          <nav className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Workspace">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-ink text-white shadow-panel"
                      : "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 hidden rounded-lg border border-line bg-paper p-4 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheck size={17} aria-hidden="true" />
              Phase 4
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Supabase auth, persistence, and tracker status sync are active.
            </p>
            <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              {authUser ? "Supabase session active" : "Local tracker mode"}
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <header className="mb-5 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Portfolio MVP</span>
                <ChevronRight size={15} aria-hidden="true" />
                <span className="font-medium text-ink">{sectionTitle(activeSection)}</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">
                Agentic job application assistant
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection("analysis")}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-marine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d5557]"
            >
              <Plus size={18} aria-hidden="true" />
              New analysis
            </button>
          </header>

          {activeSection === "dashboard" && (
            <Dashboard
              analysisResult={analysisResult}
              workflowSteps={workflowSteps}
              approvalGates={approvalGates}
              approvedCount={approvedCount}
              trackerCount={trackerItems.length}
              onStart={() => setActiveSection("analysis")}
              onTracker={() => setActiveSection("tracker")}
            />
          )}

          {activeSection === "analysis" && (
            <AnalysisForm
              company={company}
              role={role}
              resumeText={resumeText}
              jobText={jobText}
              setCompany={setCompany}
              setRole={setRole}
              setResumeText={setResumeText}
              setJobText={setJobText}
              agentSteps={workflowSteps}
              toolRuns={analysisResult.toolRuns}
              isAnalyzing={isAnalyzing}
              onRun={runAnalysis}
            />
          )}

          {activeSection === "results" && (
            <ResultsView
              analysisResult={analysisResult}
              analysisNotice={analysisNotice}
              analysisSource={analysisSource}
              approvalGates={approvalGates}
              workflowSteps={workflowSteps}
              approvedBullets={approvedBullets}
              company={company}
              role={role}
              onToggleBullet={toggleBullet}
              onSave={saveCurrentJob}
              savedCurrentJob={savedCurrentJob}
            />
          )}

          {activeSection === "tracker" && (
            <TrackerView
              items={trackerItems}
              authUser={authUser}
              isTrackerLoading={isTrackerLoading}
              persistenceNotice={persistenceNotice}
              onUpdateStatus={updateTrackerStatus}
            />
          )}

          {activeSection === "account" && (
            <AccountView
              authUser={authUser}
              authMode={authMode}
              authEmail={authEmail}
              authPassword={authPassword}
              authMessage={authMessage}
              isAuthLoading={isAuthLoading}
              isSupabaseReady={Boolean(supabase)}
              persistenceNotice={persistenceNotice}
              setAuthMode={setAuthMode}
              setAuthEmail={setAuthEmail}
              setAuthPassword={setAuthPassword}
              onSubmit={handleAuthSubmit}
              onSignOut={handleSignOut}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Dashboard({
  analysisResult,
  workflowSteps,
  approvalGates,
  approvedCount,
  trackerCount,
  onStart,
  onTracker,
}: {
  analysisResult: AnalysisResult;
  workflowSteps: AgentStep[];
  approvalGates: ApprovalGate[];
  approvedCount: number;
  trackerCount: number;
  onStart: () => void;
  onTracker: () => void;
}) {
  const approvedGateCount = approvalGates.filter((gate) => gate.status === "Approved").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Gauge} label="Latest match" value={`${analysisResult.matchScore}%`} detail="Ready for tailoring" tone="green" />
        <Metric icon={Target} label="Keyword gaps" value={analysisResult.missingKeywords.length.toString()} detail="High-value additions" tone="blue" />
        <Metric icon={FilePenLine} label="Approved bullets" value={`${approvedCount}/${analysisResult.bulletSuggestions.length}`} detail="Ready to save" tone="clay" />
        <Metric icon={Workflow} label="Approval gates" value={`${approvedGateCount}/${approvalGates.length}`} detail={`${trackerCount} tracked jobs`} tone="ink" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-marine">Current workflow</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">Northstar Labs application</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {analysisResult.summary}
              </p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-marine hover:text-marine"
            >
              Continue
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {workflowSteps.slice(0, 4).map((step) => (
              <AgentStepRow key={step.label} step={step} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-clay">Portfolio value</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">What this proves</h2>
            </div>
            <BarChart3 className="text-clay" size={24} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            {[
              "Structured AI workflow instead of a generic chatbot",
              "Approval gates before saved outputs",
              "Tool-result evidence from the AI analysis",
              "Dashboard, results, and tracker product flow",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-line bg-paper p-3">
                <Check className="mt-0.5 shrink-0 text-leaf" size={17} aria-hidden="true" />
                <span className="text-sm leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onTracker}
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open tracker
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}

function AnalysisForm({
  company,
  role,
  resumeText,
  jobText,
  setCompany,
  setRole,
  setResumeText,
  setJobText,
  agentSteps,
  toolRuns,
  isAnalyzing,
  onRun,
}: {
  company: string;
  role: string;
  resumeText: string;
  jobText: string;
  setCompany: (value: string) => void;
  setRole: (value: string) => void;
  setResumeText: (value: string) => void;
  setJobText: (value: string) => void;
  agentSteps: AgentStep[];
  toolRuns: ToolRun[];
  isAnalyzing: boolean;
  onRun: () => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-marine text-white">
            <FileText size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">New job analysis</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Paste the resume and job description to prepare the agent comparison.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <LabelledInput label="Company" value={company} onChange={setCompany} />
          <LabelledInput label="Target role" value={role} onChange={setRole} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <LabelledTextarea
            label="Resume text"
            value={resumeText}
            onChange={setResumeText}
            rows={15}
          />
          <LabelledTextarea
            label="Job description"
            value={jobText}
            onChange={setJobText}
            rows={15}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <LoaderCircle className={isAnalyzing ? "animate-spin" : ""} size={17} aria-hidden="true" />
            {isAnalyzing ? "Analyzing resume and job description." : "Gemini runs when GEMINI_API_KEY is configured."}
          </div>
          <button
            type="button"
            onClick={onRun}
            disabled={isAnalyzing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-marine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d5557]"
          >
            {isAnalyzing ? "Running analysis" : "Run analysis"}
            {isAnalyzing ? (
              <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
            ) : (
              <ArrowRight size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <p className="text-sm font-semibold uppercase text-signal">Agent preview</p>
        <h2 className="mt-2 text-xl font-semibold text-ink">Plan and tools</h2>
        <div className="mt-5 grid gap-3">
          {agentSteps.map((step) => (
            <AgentStepRow key={step.label} step={step} />
          ))}
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bot size={17} aria-hidden="true" />
            Tool outputs
          </div>
          <div className="mt-3 grid gap-3">
            {toolRuns.map((tool) => (
              <ToolRunRow key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultsView({
  analysisResult,
  analysisNotice,
  analysisSource,
  approvalGates,
  workflowSteps,
  approvedBullets,
  company,
  role,
  savedCurrentJob,
  onToggleBullet,
  onSave,
}: {
  analysisResult: AnalysisResult;
  analysisNotice: string;
  analysisSource: AnalysisSource;
  approvalGates: ApprovalGate[];
  workflowSteps: AgentStep[];
  approvedBullets: number[];
  company: string;
  role: string;
  savedCurrentJob: boolean;
  onToggleBullet: (index: number) => void;
  onSave: () => Promise<void>;
}) {
  const canSave = approvedBullets.length > 0 || savedCurrentJob;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col items-center text-center">
            <div
              className="score-ring flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `radial-gradient(circle at center, #ffffff 0 58%, transparent 59%), conic-gradient(#2f855a 0 ${analysisResult.matchScore}%, #dfe4ea ${analysisResult.matchScore}% 100%)`,
              }}
            >
              <div>
                <p className="text-4xl font-semibold text-ink">{analysisResult.matchScore}%</p>
                <p className="mt-1 text-sm text-slate-500">Match score</p>
              </div>
            </div>
            <h2 className="mt-5 text-xl font-semibold text-ink">{role || "Target Role"}</h2>
            <p className="mt-1 text-sm text-slate-500">{company || "Target Company"}</p>
          </div>

          <div className="mt-6 grid gap-3">
            <ResultPill label="Strong skills" value={analysisResult.matchingSkills.length.toString()} tone="green" />
            <ResultPill label="Keyword gaps" value={analysisResult.missingKeywords.length.toString()} tone="blue" />
            <ResultPill label="Approved bullets" value={`${approvedBullets.length}/${analysisResult.bulletSuggestions.length}`} tone="clay" />
          </div>

          <button
            type="button"
            onClick={() => void onSave()}
            disabled={!canSave}
            className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              canSave
                ? "bg-ink text-white hover:bg-slate-800"
                : "cursor-not-allowed bg-slate-200 text-slate-500"
            }`}
          >
            <Save size={18} aria-hidden="true" />
            {savedCurrentJob ? "Open saved job" : canSave ? "Save to tracker" : "Approve a bullet first"}
          </button>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-marine">
                {analysisSource === "gemini" ? "Gemini result" : "Demo result"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-ink">Resume tailoring plan</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {analysisResult.summary}
              </p>
              {analysisNotice && (
                <p className="mt-2 text-sm leading-6 text-slate-500">{analysisNotice}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(analysisResult.summary)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-marine hover:text-marine"
            >
              <Copy size={17} aria-hidden="true" />
              Copy summary
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InsightList title="Matching skills" items={analysisResult.matchingSkills} icon={Check} tone="green" />
            <InsightList title="Missing keywords" items={analysisResult.missingKeywords} icon={Target} tone="blue" />
            <InsightList title="Skill gaps" items={analysisResult.skillGaps} icon={ListChecks} tone="clay" />
          </div>
        </section>
      </div>

      <AgentCommandCenter
        steps={workflowSteps}
        tools={analysisResult.toolRuns}
        gates={approvalGates}
        nextActions={analysisResult.nextActions}
      />

      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-clay">Human approval</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Resume bullet improvements</h2>
          </div>
          <div className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink">
            {approvedBullets.length} approved
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {analysisResult.bulletSuggestions.map((item, index) => {
            const isApproved = approvedBullets.includes(index);

            return (
              <article key={item.before} className="grid gap-3 rounded-lg border border-line bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px]">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Before</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.before}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-marine">Suggested</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{item.after}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleBullet(index)}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isApproved
                      ? "bg-leaf text-white hover:bg-[#28724d]"
                      : "border border-line bg-white text-ink hover:border-leaf hover:text-leaf"
                  }`}
                >
                  <Check size={17} aria-hidden="true" />
                  {isApproved ? "Approved" : "Approve"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal text-white">
            <FilePenLine size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-signal">Cover letter draft</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Opening paragraph</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
              {analysisResult.coverLetterOpening}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AgentCommandCenter({
  steps,
  tools,
  gates,
  nextActions,
}: {
  steps: AgentStep[];
  tools: ToolRun[];
  gates: ApprovalGate[];
  nextActions: string[];
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-marine">Agent command center</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Plan, tools, and approval gates</h2>
        </div>
        <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink">
          <Workflow size={17} aria-hidden="true" />
          Human-in-the-loop
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ListChecks size={17} aria-hidden="true" />
            Execution plan
          </div>
          <div className="mt-3 grid gap-3">
            {steps.map((step) => (
              <AgentStepRow key={step.label} step={step} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bot size={17} aria-hidden="true" />
            Tool results
          </div>
          <div className="mt-3 grid gap-3">
            {tools.map((tool) => (
              <ToolRunRow key={tool.name} tool={tool} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileCheck2 size={17} aria-hidden="true" />
            Approval queue
          </div>
          <div className="mt-3 grid gap-3">
            {gates.map((gate) => (
              <ApprovalGateRow key={gate.label} gate={gate} />
            ))}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="text-sm font-semibold text-ink">Next actions</p>
            <div className="mt-2 grid gap-2">
              {nextActions.slice(0, 4).map((action) => (
                <div key={action} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <CircleDot className="mt-1 shrink-0 text-signal" size={14} aria-hidden="true" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountView({
  authUser,
  authMode,
  authEmail,
  authPassword,
  authMessage,
  isAuthLoading,
  isSupabaseReady,
  persistenceNotice,
  setAuthMode,
  setAuthEmail,
  setAuthPassword,
  onSubmit,
  onSignOut,
}: {
  authUser: User | null;
  authMode: AuthMode;
  authEmail: string;
  authPassword: string;
  authMessage: string;
  isAuthLoading: boolean;
  isSupabaseReady: boolean;
  persistenceNotice: string;
  setAuthMode: (mode: AuthMode) => void;
  setAuthEmail: (value: string) => void;
  setAuthPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)]">
      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
            <UserRound size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase text-marine">Phase 4</p>
            <h2 className="mt-2 text-xl font-semibold text-ink">Supabase account</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Sign in to persist application records behind Supabase row-level security.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Cloud size={17} aria-hidden="true" />
            Persistence status
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{persistenceNotice}</p>
        </div>

        {authUser ? (
          <div className="mt-5 rounded-lg border border-line bg-white p-4">
            <p className="text-sm font-semibold text-ink">Signed in</p>
            <p className="mt-2 break-all text-sm text-slate-600">{authUser.email}</p>
            <button
              type="button"
              onClick={() => void onSignOut()}
              disabled={isAuthLoading}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-clay hover:text-clay"
            >
              <LogOut size={17} aria-hidden="true" />
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void onSubmit(event)} className="mt-5 grid gap-4">
            <div className="inline-grid w-full grid-cols-2 rounded-lg border border-line bg-paper p-1 sm:w-[320px]">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`min-h-9 rounded-md px-3 text-sm font-semibold ${
                  authMode === "signin" ? "bg-white text-ink shadow-sm" : "text-slate-600"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`min-h-9 rounded-md px-3 text-sm font-semibold ${
                  authMode === "signup" ? "bg-white text-ink shadow-sm" : "text-slate-600"
                }`}
              >
                Sign up
              </button>
            </div>

            <LabelledInput label="Email" value={authEmail} onChange={setAuthEmail} type="email" />
            <LabelledInput label="Password" value={authPassword} onChange={setAuthPassword} type="password" />

            <button
              type="submit"
              disabled={isAuthLoading || !isSupabaseReady}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-fit ${
                isSupabaseReady
                  ? "bg-marine text-white hover:bg-[#0d5557]"
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {isAuthLoading ? (
                <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              {authMode === "signin" ? "Sign in" : "Create account"}
            </button>

            {authMessage && (
              <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm leading-6 text-slate-700">
                {authMessage}
              </p>
            )}
          </form>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Database size={17} aria-hidden="true" />
          Setup checklist
        </div>
        <div className="mt-4 grid gap-3">
          {[
            "Create a Supabase project.",
            "Run supabase/schema.sql in the SQL editor.",
            "Copy project URL and anon key into .env.local.",
            "Restart the Next.js server.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-line bg-paper p-3">
              <Check className="mt-0.5 shrink-0 text-leaf" size={17} aria-hidden="true" />
              <span className="text-sm leading-6 text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrackerView({
  items,
  authUser,
  isTrackerLoading,
  persistenceNotice,
  onUpdateStatus,
}: {
  items: TrackerItem[];
  authUser: User | null;
  isTrackerLoading: boolean;
  persistenceNotice: string;
  onUpdateStatus: (item: TrackerItem, status: Status) => Promise<void>;
}) {
  const statuses: Status[] = ["Draft", "Ready", "Applied", "Follow Up"];

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-marine">Application tracker</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Active opportunities</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{persistenceNotice}</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-marine hover:text-marine"
        >
          <Plus size={17} aria-hidden="true" />
          Add job
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1 text-xs font-semibold text-slate-600">
          <Cloud size={14} aria-hidden="true" />
          {authUser ? "Supabase sync" : "Local demo"}
        </span>
        {isTrackerLoading && (
          <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-line bg-paper px-3 py-1 text-xs font-semibold text-slate-600">
            <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />
            Loading saved jobs
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {statuses.map((status) => {
          const statusItems = items.filter((item) => item.status === status);

          return (
            <div key={status} className="min-h-[260px] rounded-lg border border-line bg-paper p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">{status}</h3>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                  {statusItems.length}
                </span>
              </div>

              <div className="mt-3 grid gap-3">
                {statusItems.map((item) => (
                  <article
                    key={item.id || `${item.company}-${item.role}-${item.date}`}
                    className="rounded-lg border border-line bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{item.company}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{item.role}</p>
                      </div>
                      <span className="rounded-md bg-paper px-2 py-1 text-xs font-semibold text-leaf">
                        {item.score}%
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{item.date}</span>
                      <span>Match saved</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {statuses.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => void onUpdateStatus(item, option)}
                          className={`min-h-8 rounded-md border px-2 py-1 text-xs font-semibold transition ${
                            item.status === option
                              ? "border-marine bg-marine text-white"
                              : "border-line bg-paper text-slate-600 hover:border-marine hover:text-marine"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function isSameTrackerItem(left: TrackerItem, right: TrackerItem) {
  if (left.id && right.id) {
    return left.id === right.id;
  }

  return (
    left.company === right.company &&
    left.role === right.role &&
    left.date === right.date &&
    left.score === right.score
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "clay" | "ink";
}) {
  const toneClass = {
    green: "bg-emerald-50 text-leaf",
    blue: "bg-blue-50 text-signal",
    clay: "bg-orange-50 text-clay",
    ink: "bg-slate-100 text-ink",
  }[tone];

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </section>
  );
}

function AgentStepRow({ step }: { step: AgentStep }) {
  const statusStyles = {
    Done: "bg-leaf text-white",
    Ready: "bg-signal text-white",
    Waiting: "bg-slate-200 text-slate-600",
  }[step.status];

  return (
    <div className="grid grid-cols-[34px_minmax(0,1fr)_78px] items-start gap-3 rounded-lg border border-line bg-white p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusStyles}`}>
        {step.status === "Done" ? <Check size={16} aria-hidden="true" /> : <History size={16} aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{step.label}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600">{step.detail}</p>
      </div>
      <span className="rounded-md bg-paper px-2 py-1 text-center text-xs font-semibold text-slate-600">
        {step.status}
      </span>
    </div>
  );
}

function ToolRunRow({ tool }: { tool: ToolRun }) {
  const statusStyles = {
    Done: "bg-leaf text-white",
    Ready: "bg-signal text-white",
    Waiting: "bg-slate-200 text-slate-600",
  }[tool.status];

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{formatToolName(tool.name)}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{tool.output}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusStyles}`}>
          {tool.status}
        </span>
      </div>
    </div>
  );
}

function ApprovalGateRow({ gate }: { gate: ApprovalGate }) {
  const statusStyles = {
    Approved: "bg-leaf text-white",
    Ready: "bg-signal text-white",
    Waiting: "bg-slate-200 text-slate-600",
  }[gate.status];

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{gate.label}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{gate.detail}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusStyles}`}>
          {gate.status}
        </span>
      </div>
    </div>
  );
}

function InsightList({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone: "green" | "blue" | "clay";
}) {
  const iconClass = {
    green: "text-leaf",
    blue: "text-signal",
    clay: "text-clay",
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Icon className={`mt-1 shrink-0 ${iconClass}`} size={15} aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelledInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "email" | "password";
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-marine focus:ring-2 focus:ring-marine/20"
      />
    </label>
  );
}

function LabelledTextarea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[320px] rounded-lg border border-line bg-white px-3 py-3 text-sm leading-6 text-ink outline-none transition focus:border-marine focus:ring-2 focus:ring-marine/20"
      />
    </label>
  );
}

function ResultPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "clay";
}) {
  const toneClass = {
    green: "text-leaf",
    blue: "text-signal",
    clay: "text-clay",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function createWorkflowSteps(
  analysisResult: AnalysisResult,
  approvedCount: number,
  savedCurrentJob: boolean,
): AgentStep[] {
  const steps = analysisResult.agentSteps.map((step) => {
    const label = step.label.toLowerCase();

    if (label.includes("rewrite") || label.includes("bullet")) {
      return {
        ...step,
        status: approvedCount > 0 ? "Done" : "Ready",
        detail:
          approvedCount > 0
            ? `${approvedCount} bullet rewrite${approvedCount === 1 ? "" : "s"} approved for use.`
            : step.detail,
      } satisfies AgentStep;
    }

    if (label.includes("cover") || label.includes("draft")) {
      return {
        ...step,
        status: approvedCount > 0 ? "Ready" : "Waiting",
        detail:
          approvedCount > 0
            ? "Cover letter opening is ready for review after resume approval."
            : "Queued until at least one resume bullet is approved.",
      } satisfies AgentStep;
    }

    if (label.includes("save") || label.includes("track")) {
      return {
        ...step,
        status: savedCurrentJob ? "Done" : approvedCount > 0 ? "Ready" : "Waiting",
        detail: savedCurrentJob
          ? "Application saved to the tracker."
          : approvedCount > 0
            ? "Ready to save after final review."
            : "Waiting for user approval before tracker save.",
      } satisfies AgentStep;
    }

    return step;
  });

  const hasSaveStep = steps.some((step) => {
    const label = step.label.toLowerCase();
    return label.includes("save") || label.includes("track");
  });

  if (!hasSaveStep) {
    steps.push({
      label: "Save application",
      status: savedCurrentJob ? "Done" : approvedCount > 0 ? "Ready" : "Waiting",
      detail: savedCurrentJob
        ? "Application saved to the tracker."
        : approvedCount > 0
          ? "Ready to save after final review."
          : "Waiting for user approval before tracker save.",
    });
  }

  return steps.slice(0, 6);
}

function createWorkflowGates(
  analysisResult: AnalysisResult,
  approvedCount: number,
  savedCurrentJob: boolean,
): ApprovalGate[] {
  const source = analysisResult.approvalGates;

  return [
    {
      label: source[0]?.label || "Resume bullets",
      status: approvedCount > 0 ? "Approved" : "Ready",
      detail:
        approvedCount > 0
          ? `${approvedCount} rewrite${approvedCount === 1 ? "" : "s"} approved.`
          : source[0]?.detail || "Approve the strongest bullet rewrites before saving.",
    },
    {
      label: source[1]?.label || "Cover letter opening",
      status: approvedCount > 0 ? "Ready" : "Waiting",
      detail:
        approvedCount > 0
          ? "Opening paragraph is ready for review and copy."
          : source[1]?.detail || "Review after at least one resume bullet is approved.",
    },
    {
      label: source[2]?.label || "Tracker save",
      status: savedCurrentJob ? "Approved" : approvedCount > 0 ? "Ready" : "Waiting",
      detail: savedCurrentJob
        ? "Application has been handed off to the tracker."
        : approvedCount > 0
          ? "Ready to save to the tracker."
          : source[2]?.detail || "Save only after the tailored application is ready.",
    },
  ];
}

function formatToolName(name: string) {
  return name
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sectionTitle(section: Section) {
  switch (section) {
    case "dashboard":
      return "Dashboard";
    case "analysis":
      return "New Analysis";
    case "results":
      return "Results";
    case "tracker":
      return "Tracker";
  }
}
