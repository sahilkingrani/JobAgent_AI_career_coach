import { supabase } from "./supabase";

const EDGE_FUNCTION_URL = "https://pekoomsqhwuozhecpnzw.supabase.co/functions/v1";

async function callEdgeFunction(name: string, body: unknown) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token ?? "";
  const res = await fetch(`${EDGE_FUNCTION_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `${name} failed`);
  return data;
}

export interface ParsedProfile {
  name: string;
  title: string;
  location: string;
  summary: string;
  skills: { name: string; level: "expert" | "proficient" | "familiar" }[];
  experience: { role: string; company: string; period: string; highlights: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  strengths: string[];
  gaps: string[];
  id?: string;
  fileName?: string;
  analyzedAt?: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean | null;
  salary: string | null;
  description: string | null;
  requirements: string[];
  url: string | null;
  source: string | null;
  posted_days_ago: number | null;
  match_score: number | null;
  match_breakdown: Record<string, number> | null;
  scam_risk: "low" | "medium" | "high" | null;
  scam_reason: string | null;
  work_preference: string | null;
  created_at: string | null;
}

export interface JobAnalysis {
  matchScore: number;
  matchExplanation: string;
  matchBreakdown: { skills: number; experience: number; seniority: number; location: number };
  missingSkills: string[];
  learningRoadmap: string;
  coverLetter: string;
  atsKeywords: string[];
  scamRisk: "low" | "medium" | "high";
  scamReason: string;
  interviewQuestions: { focus: string; question: string; sampleAnswer: string }[];
}

export interface InterviewFeedback {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

// Upload CV and extract text
export async function analyzeCv(file: File): Promise<{ profile: ParsedProfile; docId: string }> {
  // Upload file to Supabase Storage
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const fileExt = file.name.split(".").pop()?.toLowerCase();
  const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("cvs")
    .upload(filePath, file);
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Extract text from the file
  let text = "";
  if (fileExt === "txt") {
    text = await file.text();
  } else if (fileExt === "pdf") {
    // Use pdfjs-dist in the browser
    const pdfjsLib = await import("pdfjs-dist");
    const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .filter((item) => 'str' in item)
          .map((item) => (item as { str: string }).str)
          .join(" ")
      );
    }
    text = pages.join("\n\n");
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or TXT file.");
  }

  if (!text.trim()) throw new Error("Could not extract text from the file");

  // Call analyze-cv edge function
  const result = await callEdgeFunction("analyze-cv", { text, fileName: file.name });
  return { profile: result.profile, docId: result.docId };
}

// Discover jobs matching search criteria
export async function discoverJobs(opts: {
  title: string;
  location: string;
  workPreference: string;
}): Promise<{ jobs: JobListing[]; count: number; source?: string; notice?: string }> {
  return callEdgeFunction("discover-jobs", opts);
}

// Analyze a job against a CV (match score, missing skills, cover letter, scam, etc.)
export async function analyzeJob(opts: {
  cvText: string;
  profile: ParsedProfile;
  job: JobListing;
  jobId?: string;
}): Promise<JobAnalysis> {
  return callEdgeFunction("analyze-job", opts);
}

// Mock interview coaching
export async function coachInterview(opts: {
  question: string;
  answer: string;
  jobTitle?: string;
  company?: string;
}): Promise<InterviewFeedback> {
  return callEdgeFunction("coach-interview", opts);
}

// Get Speechmatics live transcription token
export async function getSpeechmaticsToken(): Promise<string> {
  const data = await callEdgeFunction("speechmatics-token", {});
  return data.token;
}

// Kanban operations
export async function updateApplicationStatus(jobId: string, status: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Upsert into applications table
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    return supabase
      .from("applications")
      .update({ status: status as any, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    return supabase
      .from("applications")
      .insert({ user_id: userId, job_id: jobId, status: status as any });
  }
}

export async function getApplicationStatus(jobId: string): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const { data } = await supabase
    .from("applications")
    .select("status")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  return data?.status ?? null;
}

export async function getAllApplications(): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return {};

  const { data } = await supabase
    .from("applications")
    .select("job_id, status")
    .eq("user_id", userId);

  const map: Record<string, string> = {};
  if (data) {
    for (const app of data) {
      if (app.status) map[app.job_id] = app.status;
    }
  }
  return map;
}

// Dashboard stats
export async function getDashboardStats() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return null;

  const { data: jobs } = await supabase
    .from("job_listings")
    .select("match_score, scam_risk")
    .eq("user_id", userId);

  const { data: apps } = await supabase
    .from("applications")
    .select("status")
    .eq("user_id", userId);

  if (!jobs) return null;

  const totalJobs = jobs.length;
  const avgMatch = totalJobs > 0
    ? Math.round(jobs.reduce((sum, j) => sum + (j.match_score || 0), 0) / totalJobs)
    : 0;
  const scamJobs = jobs.filter((j) => j.scam_risk === "high").length;
  const inProgress = apps?.filter((a) =>
    a.status === "applied" || a.status === "interview"
  ).length ?? 0;
  const offers = apps?.filter((a) => a.status === "offer").length ?? 0;

  return { totalJobs, avgMatch, inProgress, scamJobs, offers };
}