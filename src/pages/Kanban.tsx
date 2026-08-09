import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Columns3, Loader2, ChevronLeft, ChevronRight,
  ArrowRight, AlertTriangle, Bookmark,
} from "lucide-react";
import {
  getAllApplications, updateApplicationStatus,
  type JobListing,
} from "../lib/api";
import { supabase } from "../lib/supabase";

interface Column {
  status: string;
  label: string;
  color: string;
  jobs: JobListing[];
}

const COLUMNS: { status: string; label: string; color: string }[] = [
  { status: "saved", label: "Saved", color: "border-l-primary" },
  { status: "applied", label: "Applied", color: "border-l-secondary" },
  { status: "interview", label: "Interviewing", color: "border-l-warning" },
  { status: "offer", label: "Offer", color: "border-l-success" },
  { status: "rejected", label: "Rejected", color: "border-l-destructive" },
];

const STATUS_ORDER = ["saved", "applied", "interview", "offer", "rejected"];

export default function Kanban() {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBoard();
  }, []);

  const loadBoard = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: jobs } = await supabase
        .from("job_listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const jobList = (jobs as JobListing[]) || [];
      const apps = await getAllApplications();

      const cols: Column[] = COLUMNS.map((col) => ({
        ...col,
        jobs: jobList.filter(
          (j) => (apps[j.id] || "saved") === col.status
        ),
      }));
      setColumns(cols);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const moveJob = async (jobId: string, fromStatus: string, direction: -1 | 1) => {
    const fromIdx = STATUS_ORDER.indexOf(fromStatus);
    const toIdx = Math.max(0, Math.min(STATUS_ORDER.length - 1, fromIdx + direction));
    if (fromIdx === toIdx) return;
    const newStatus = STATUS_ORDER[toIdx];

    try {
      await updateApplicationStatus(jobId, newStatus);
      // Optimistically update UI
      setColumns((prev) => {
        const next = prev.map((col) => ({ ...col, jobs: [...col.jobs] }));
        const fromCol = next.find((c) => c.status === fromStatus);
        const toCol = next.find((c) => c.status === newStatus);
        if (!fromCol || !toCol) return prev;

        const job = fromCol.jobs.find((j) => j.id === jobId);
        if (job) {
          fromCol.jobs = fromCol.jobs.filter((j) => j.id !== jobId);
          toCol.jobs = [job, ...toCol.jobs];
        }
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totalJobs = columns.reduce((sum, col) => sum + col.jobs.length, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Application Tracker
            </h2>
            <p className="text-foreground/50 text-sm mt-1">
              {totalJobs} job{totalJobs !== 1 ? "s" : ""} across {columns.length} stages
            </p>
          </div>
          <button
            onClick={() => navigate("/jobs")}
            className="btn-secondary text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Discover Jobs
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-4 shrink-0">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {totalJobs === 0 && !error && (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <Columns3 className="w-12 h-12 text-foreground/20 mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground/70">
            No jobs tracked yet
          </h3>
          <p className="text-foreground/40 text-sm mt-2 max-w-md">
            Discover matching jobs and analyze them — they'll appear here so you can track your applications.
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="btn-primary mt-6"
          >
            <ArrowRight className="w-4 h-4" />
            Find Jobs
          </button>
        </div>
      )}

      {/* Kanban Board */}
      {totalJobs > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {columns.map((col) => (
            <div
              key={col.status}
              className={`flex flex-col bg-card/50 rounded-xl border border-border min-w-[260px] w-[260px] shrink-0 border-l-[3px] ${col.color}`}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground/80">
                    {col.label}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-foreground/50 font-medium">
                    {col.jobs.length}
                  </span>
                </div>
              </div>

              {/* Job cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollable-list">
                {col.jobs.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-foreground/30">No jobs here</p>
                  </div>
                )}
                {col.jobs.map((job) => {
                  const statusIdx = STATUS_ORDER.indexOf(col.status);
                  const canMoveLeft = statusIdx > 0;
                  const canMoveRight = statusIdx < STATUS_ORDER.length - 1;

                  return (
                    <div
                      key={job.id}
                      className="card-base p-3 space-y-2 group hover:border-primary/30 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-foreground/50 truncate mt-0.5">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        {job.match_score != null && job.match_score > 0 && (
                          <span className={`text-xs font-bold font-heading ${
                            job.match_score >= 75 ? "text-success" :
                            job.match_score >= 50 ? "text-warning" : "text-foreground/40"
                          }`}>
                            {job.match_score}%
                          </span>
                        )}
                        {job.scam_risk === "high" && (
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        )}
                      </div>

                      {/* Move buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          aria-label={`Move ${job.title} to previous stage`}
                          disabled={!canMoveLeft}
                          onClick={() => moveJob(job.id, col.status, -1)}
                          className="btn-base !p-1.5 !px-2 !text-xs disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1 text-[10px] text-foreground/40">
                          <Bookmark className="w-3 h-3" />
                          {col.label}
                        </div>

                        <button
                          aria-label={`Move ${job.title} to next stage`}
                          disabled={!canMoveRight}
                          onClick={() => moveJob(job.id, col.status, 1)}
                          className="btn-base !p-1.5 !px-2 !text-xs disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status select for keyboard users */}
                      <select
                        aria-label={`Change status for ${job.title}`}
                        value={col.status}
                        onChange={(e) => {
                          const old = col.status;
                          const newStatus = e.target.value;
                          if (old !== newStatus) {
                            updateApplicationStatus(job.id, newStatus);
                            setColumns((prev) => {
                              const next = prev.map((c) => ({ ...c, jobs: [...c.jobs] }));
                              const fromCol = next.find((c) => c.status === old);
                              const toCol = next.find((c) => c.status === newStatus);
                              if (!fromCol || !toCol) return prev;
                              const idx = fromCol.jobs.findIndex((j) => j.id === job.id);
                              if (idx >= 0) {
                                const [moved] = fromCol.jobs.splice(idx, 1);
                                toCol.jobs.unshift(moved);
                              }
                              return next;
                            });
                          }
                        }}
                        className="w-full mt-1 text-[10px] bg-muted/50 border border-border rounded px-1.5 py-1 text-foreground/60 cursor-pointer"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.status} value={c.status}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}