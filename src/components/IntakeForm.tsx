import { useState, useRef } from "react";
import { Upload, FileText, Loader2, AlertCircle, MapPin, Target, Globe } from "lucide-react";
import { analyzeCv } from "../lib/api";

interface IntakeFormProps {
  onComplete: (docId: string) => void;
}

export default function IntakeForm({ onComplete }: IntakeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [workPreference, setWorkPreference] = useState("any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "txt") {
        setError("Please upload a PDF or TXT file");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError("File must be under 10MB");
        return;
      }
      setError("");
      setFile(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!file) { setError("Please upload your CV"); return; }
    if (!jobTitle.trim()) { setError("Please enter your target job title"); return; }
    if (!location.trim()) { setError("Please enter your location"); return; }

    setLoading(true);
    try {
      const { docId } = await analyzeCv(file);
      // Save the job preferences to localStorage for job discovery
      localStorage.setItem("jobagent_search", JSON.stringify({
        title: jobTitle.trim(),
        location: location.trim(),
        workPreference,
        docId,
      }));
      onComplete(docId);
    } catch (err) {
      setError((err as Error).message || "Analysis failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
          Let's prepare your job search
        </h2>
        <p className="text-foreground/50 mt-1.5 text-sm">
          Upload your CV and tell us what you're looking for. We'll analyze your profile and find matching opportunities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* CV Upload */}
        <div className="card-base">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            Upload your CV
          </label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              file
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div>
                <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-foreground/40 mt-1">{formatFileSize(file.size)}</p>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-secondary mt-2 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  Remove and re-upload
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-foreground/60">
                  Drop your CV here or click to browse
                </p>
                <p className="text-xs text-foreground/40 mt-1">
                  PDF or TXT, up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="card-base space-y-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <Target className="w-4 h-4 text-primary" />
            What role are you looking for?
          </label>

          <div>
            <label className="block text-xs font-medium text-foreground/50 mb-1.5">
              Job Title <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="input-base pl-10"
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/50 mb-1.5">
              Location <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-base pl-10"
                placeholder="e.g. London, UK or Remote"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/50 mb-1.5">
              Work Preference <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none z-10" />
              <select
                value={workPreference}
                onChange={(e) => setWorkPreference(e.target.value)}
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
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your CV...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Analyze My Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
}