import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Briefcase, AlertCircle, MapPin, Globe,
  Check, Copy,
  Target, Star, BookOpen, Shield, MessageSquare,
  ArrowRight, Clock, Building2, BarChart3, Lightbulb,
  AlertTriangle, Sparkles, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import {
  discoverJobs, analyzeJob, updateApplicationStatus,
  getAllApplications,
  type JobListing, type JobAnalysis, type ParsedProfile,
} from "../lib/api";
import { supabase } from "../lib/supabase";

type View = "list" | "detail";

export default function Jobs() {
  const navigate = useNavigate();

  // Search form state
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchPreference, setSearchPreference] = useState("any");

  // Data state
  const [cvDoc, setCvDoc] = useState<{ raw_text: string; parsed_raw: ParsedProfile | null } | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<Record<string, string>>({});
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [view, setView] = useState<View>("list");
  const [coverLetterExpanded, setCoverLetterExpanded] = useState(false);

  // On mount: read localStorage + load data
  useEffect(() => {
    const saved = localStorage.getItem("jobagent_search");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setSearchTitle(p.title || "");
        setSearchLocation(p.location || "");
        setSearchPreference(p.workPreference || "any");
      } catch {}
    }

    // If Dashboard navigated here with a selected job
    const selected = localStorage.getItem("jobagent_selected_job");
    if (selected) {
      localStorage.removeItem("jobagent_selected_job");
      try {
        const job = JSON.parse(selected) as JobListing;
        setSelectedJob(job);
        setView("detail");
      } catch {}
    }

    loadData();
  }, []);

  const loadData = async () => {
    setLoadingJobs(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) { setLoadingJobs(false); return; }

      // Fetch latest CV doc
      const { data: cvs } = await supabase
        .from("cv_documents")
        .select("raw_text, parsed_raw")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cvs?.length) {
        setCvDoc({
          raw_text: cvs[0].raw_text || "",
          parsed_raw: cvs[0].parsed_raw as ParsedProfile | null,
        });
      }
      setCvLoading(false);

      // Fetch jobs
      const { data: jobsData } = await supabase
        .from("job_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setJobs((jobsData as JobListing[]) || []);

      // Fetch application statuses
      const apps = await getAllApplications();
      setApplications(apps);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Discover jobs
  const handleDiscover = useCallback(async () => {
    if (!searchTitle.trim() || !searchLocation.trim()) {
      setError("Please enter a job title and location");
      return;
    }
    setDiscovering(true);
    setError("");
    setNotice("");
    try {
      // Save search params
      localStorage.setItem("jobagent_search", JSON.stringify({
        title: searchTitle.trim(),
        location: searchLocation.trim(),
        workPreference: searchPreference,
      }));
      const result = await discoverJobs({
        title: searchTitle.trim(),
        location: searchLocation.trim(),
        workPreference: searchPreference,
      });
      // Re-fetch jobs from DB (the edge function inserts them)
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (userId) {
        const { data: jobsData } = await supabase
          .from("job_listings")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        setJobs((jobsData as JobListing[]) || []);
      }
      if (result.notice) setNotice(result.notice);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDiscovering(false);
    }
  }, [searchTitle, searchLocation, searchPreference]);

  // Analyze a job
  const handleAnalyze = useCallback(async (job: JobListing) => {
    if (!cvDoc) return;
    setSelectedJob(job);
    setAnalysis(null);
    setAnalyzing(true);
    setError("");
    setView("detail");
    setCoverLetterExpanded(false);
    try {
      const profile: ParsedProfile = cvDoc.parsed_raw || {
        name: "", title: "", location: "", summary: "",
        skills: [], experience: [], education: [], strengths: [], gaps: [],
      };
      const result = await analyzeJob({
        cvText: cvDoc.raw_text || "",
        profile,
        job,
        jobId: job.id,
      });
      setAnalysis(result);

      // Auto-save as "saved"
      await updateApplicationStatus(job.id, "saved");
      setApplications((prev) => ({ ...prev, [job.id]: "saved" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }, [cvDoc]);

  // Practice interview for this job
  const handlePractice = useCallback(() => {
    if (!selectedJob || !analysis?.interviewQuestions) return;
    localStorage.setItem(
      "jobagent_interview_prep",
      JSON.stringify({
        job: { title: selectedJob.title, company: selectedJob.company },
        questions: analysis.interviewQuestions,
      })
    );
    navigate("/interview");
  }, [selectedJob, analysis, navigate]);

  // Copy cover letter
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const getAppStatus = (jobId: string) => applications[jobId] || null;

  const matchScoreColor = (score: number) =>
    score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";

  // No CV uploaded yet
  if (!cvLoading && !cvDoc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-12 h-12 text-primary/30 mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
          Upload your CV first
        </h2>
        <p className="text-foreground/50 text-sm mt-2 max-w-md">
          We need your CV to analyze job matches. Upload it and tell us what you're looking for.
        </p>
        <button onClick={() => navigate("/upload-cv")} className="btn-primary mt-6">
          <ArrowRight className="w-4 h-4" />
          Go to Upload
        </button>
      </div>
    );
  }

  // Loading
  if (cvLoading || loadingJobs) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view
  if (view === "detail" && selectedJob) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => { setView("list"); setSelectedJob(null); setAnalysis(null); }}
          className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
          Back to jobs
        </button>

        {/* Job header */}
        <div className="card-base">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
                {selectedJob.title}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-foreground/60">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {selectedJob.company}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedJob.location || "Remote"}
                </span>
                {selectedJob.salary && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedJob.salary}
                  </span>
                )}
              </div>
            </div>
            {getAppStatus(selectedJob.id) && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                {getAppStatus(selectedJob.id)}
              </span>
            )}
          </div>
        </div>

        {/* Analysis loading */}
        {analyzing && (
          <div className="card-base flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-foreground/50">Analyzing this job against your profile…</p>
            </div>
          </div>
        )}

        {/* Analysis results */}
        {analysis && !analyzing && (
          <>
            {/* Match Score & Breakdown */}
            <div className="card-base">
              <h3 className="text-sm font-semibold text-foreground/80 mb-5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Match Analysis
              </h3>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Circular score */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(var(--color-primary) 0deg ${analysis.matchScore * 3.6}deg, var(--color-muted) ${analysis.matchScore * 3.6}deg 360deg)`,
                    }}
                  >
                    <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                      <span className={`text-2xl font-heading font-bold ${matchScoreColor(analysis.matchScore)}`}>
                        {analysis.matchScore}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-foreground/40 font-medium">Match</span>
                </div>

                {/* Breakdown bars */}
                <div className="flex-1 w-full space-y-3">
                  {Object.entries(analysis.matchBreakdown || {}).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground/60 capitalize">{key}</span>
                        <span className="font-medium text-foreground/80">{Math.round(val)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.matchExplanation && (
                <p className="text-sm text-foreground/70 mt-4 leading-relaxed border-t border-border pt-4">
                  {analysis.matchExplanation}
                </p>
              )}
            </div>

            {/* Missing Skills + Roadmap */}
            {analysis.missingSkills?.length > 0 && (
              <div className="card-base">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground/80">Missing Skills</h3>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {analysis.missingSkills.map((s, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                {analysis.learningRoadmap && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <h4 className="text-xs font-semibold text-foreground/70">Learning Roadmap</h4>
                    </div>
                    <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                      {analysis.learningRoadmap}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ATS Keywords */}
            {analysis.atsKeywords?.length > 0 && (
              <div className="card-base">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground/80">ATS Keywords</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.atsKeywords.map((k, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scam Risk */}
            <div className="card-base">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground/80">Scam Risk Assessment</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  analysis.scamRisk === "high"
                    ? "bg-destructive/10 text-destructive border border-destructive/30"
                    : analysis.scamRisk === "medium"
                    ? "bg-warning/10 text-warning border border-warning/20"
                    : "bg-success/10 text-success border border-success/20"
                }`}>
                  {analysis.scamRisk}
                </span>
                {analysis.scamReason && (
                  <p className="text-sm text-foreground/70">{analysis.scamReason}</p>
                )}
              </div>
            </div>

            {/* Cover Letter */}
            <div className="card-base">
              <button
                onClick={() => setCoverLetterExpanded(!coverLetterExpanded)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground/80">Cover Letter</h3>
                </div>
                {coverLetterExpanded ? (
                  <ChevronUp className="w-4 h-4 text-foreground/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-foreground/40" />
                )}
              </button>
              {coverLetterExpanded && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                    {analysis.coverLetter}
                  </p>
                  <button
                    onClick={() => handleCopy(analysis.coverLetter)}
                    className="btn-secondary text-xs"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "Copied!" : "Copy Cover Letter"}
                  </button>
                </div>
              )}
            </div>

            {/* Interview Questions */}
            {analysis.interviewQuestions?.length > 0 && (
              <div className="card-base">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground/80">Interview Questions</h3>
                </div>
                <div className="space-y-3">
                  {analysis.interviewQuestions.map((q, i) => (
                    <details key={i} className="group">
                      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground/80 hover:text-foreground transition-colors py-2 list-none">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1">{q.focus}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-foreground/30 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="ml-8 mt-2 space-y-2">
                        <p className="text-sm text-foreground/70">{q.question}</p>
                        <p className="text-xs text-foreground/40 italic border-l-2 border-primary/30 pl-3">
                          {q.sampleAnswer?.slice(0, 200)}
                          {q.sampleAnswer?.length > 200 ? "…" : ""}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
                <button
                  onClick={handlePractice}
                  className="btn-primary mt-5 w-full"
                >
                  <MessageSquare className="w-4 h-4" />
                  Practice These Questions
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
            Job Matches
          </h2>
          <p className="text-foreground/50 text-sm mt-1">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={() => setShowSearchForm(!showSearchForm)}
          className="btn-secondary text-sm"
        >
          <Search className="w-4 h-4" />
          {showSearchForm ? "Hide Search" : "New Search"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div className="bg-primary/5 border border-primary/20 text-primary text-sm rounded-lg px-4 py-3">
          {notice}
        </div>
      )}

      {/* Search form */}
      {showSearchForm && (
        <div className="card-base space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground/50 mb-1.5">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="input-base pl-10"
                  placeholder="e.g. Frontend Engineer"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/50 mb-1.5">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="input-base pl-10"
                  placeholder="e.g. London"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/50 mb-1.5">
                Work Preference
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none z-10" />
                <select
                  value={searchPreference}
                  onChange={(e) => setSearchPreference(e.target.value)}
                  className="input-base pl-10 appearance-none cursor-pointer"
                >
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="onsite">On-site</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="btn-primary w-full disabled:opacity-50"
          >
            {discovering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {discovering ? "Discovering jobs…" : "Discover Jobs"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && !showSearchForm && (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground/70">
            No jobs discovered yet
          </h3>
          <p className="text-foreground/40 text-sm mt-2 max-w-md">
            Search for a role and location to get AI-generated job matches tailored to your profile.
          </p>
          <button
            onClick={() => setShowSearchForm(true)}
            className="btn-primary mt-6"
          >
            <Search className="w-4 h-4" />
            Start Search
          </button>
        </div>
      )}

      {/* Job list */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => {
            const appStatus = getAppStatus(job.id);
            return (
              <div
                key={job.id}
                onClick={() => handleAnalyze(job)}
                className={`card-base card-hover cursor-pointer transition-all ${
                  selectedJob?.id === job.id ? "border-primary/50 ring-1 ring-primary/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">
                        {job.title}
                      </h3>
                      {appStatus && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                          {appStatus}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-foreground/50">
                      <span>{job.company}</span>
                      <span>{job.location || "Remote"}</span>
                      {job.salary && <span>{job.salary}</span>}
                      {job.posted_days_ago != null && (
                        <span>{job.posted_days_ago}d ago</span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-xs text-foreground/50 mt-2 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* Match scores from DB (if already analyzed) */}
                    {job.match_score != null && job.match_score > 0 && (
                      <span className={`text-base font-bold font-heading ${matchScoreColor(job.match_score)}`}>
                        {job.match_score}%
                      </span>
                    )}
                    {job.scam_risk === "high" && (
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <ArrowRight className="w-4 h-4 text-foreground/20 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}