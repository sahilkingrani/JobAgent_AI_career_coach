import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic, Square, Send, Loader2, AlertCircle, ArrowLeft, MessageSquare,
  Lightbulb, Target, CheckCircle2, BookOpen,
} from "lucide-react";
import { coachInterview, getSpeechmaticsToken, type InterviewFeedback } from "../lib/api";

interface PrepData {
  job: { title: string; company: string };
  questions: { focus: string; question: string; sampleAnswer: string }[];
}

export default function Interview() {
  const navigate = useNavigate();
  const [prep, setPrep] = useState<PrepData | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [recordTimer, setRecordTimer] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [wsStatus, setWsStatus] = useState<"" | "connecting" | "connected" | "error">("");
  const mediaRef = useRef<{
    stream: MediaStream;
    audioCtx: AudioContext;
    source: MediaStreamAudioSourceNode;
    processor: ScriptProcessorNode;
    monitorGain: GainNode;
    ws: WebSocket;
  } | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const transcriptTimeoutRef = useRef<number | null>(null);
  const transcriptReceivedRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("jobagent_interview_prep");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PrepData;
        if (parsed.questions?.length) {
          setPrep(parsed);
          return;
        }
      } catch {}
    }
  }, []);

  const currentQuestion = prep?.questions[currentQIndex];

  const handleGetFeedback = useCallback(async () => {
    if (!answer.trim() || !prep || !currentQuestion) return;
    setLoading(true);
    setError("");
    setFeedback(null);
    try {
      const result = await coachInterview({
        question: currentQuestion.question,
        answer: answer.trim(),
        jobTitle: prep.job.title,
        company: prep.job.company,
      });
      setFeedback(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [answer, prep, currentQuestion]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    setWsStatus("");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }

    const media = mediaRef.current;
    if (media) {
      try {
        if (media.ws.readyState === WebSocket.OPEN) {
          // Per Speechmatics API: EndOfStream signals no more audio
          media.ws.send(JSON.stringify({ message: "EndOfStream", last_seq_no: 0 }));
        }
      } catch {}
      try {
        media.processor.disconnect();
        media.source.disconnect();
        media.monitorGain.disconnect();
        media.audioCtx.close();
        media.stream.getTracks().forEach((t) => t.stop());
        media.ws.close();
      } catch {}
      mediaRef.current = null;
    }

    // Populate the answer textarea with the final transcript
    const final = transcriptRef.current.trim();
    console.log("[stopRecording] final transcript:", JSON.stringify(final));
    if (final) {
      console.log("[stopRecording] calling setAnswer with:", JSON.stringify(final));
      setAnswer(final);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setAudioError("");
    setTranscript("");
    setInterimText("");
    setWsStatus("connecting");
    transcriptRef.current = "";
    transcriptReceivedRef.current = false;
    setRecordTimer(0);
    setRecording(true);

    // Clear any previous timeout
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }

    let stream: MediaStream;
    let token: string;
    try {
      // Explicit mono + processing flags so we get a clean, non-muted signal.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      token = await getSpeechmaticsToken();
      if (!token) throw new Error("Failed to obtain transcription token — please refresh and try again.");
    } catch (err) {
      setWsStatus("error");
      setAudioError((err as Error).message);
      setRecording(false);
      return;
    }

    // Create a 16 kHz AudioContext (Chrome respects this; in other browsers
    // we read the actual sample rate and report that to Speechmatics).
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    // Guard against a suspended context (autoplay policy) — without this,
    // onaudioprocess never fires and only silence would be "sent".
    if (audioCtx.state === "suspended") {
      try { await audioCtx.resume(); } catch {}
    }
    const actualSampleRate = audioCtx.sampleRate; // read back what the browser actually gave us
    console.log(`[Audio] AudioContext ready — sampleRate=${actualSampleRate}Hz, state=${audioCtx.state}`);
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    // Monitor at zero gain: keeps the audio graph alive (so onaudioprocess
    // fires) without playing the mic back through the speakers (feedback).
    const monitorGain = audioCtx.createGain();
    monitorGain.gain.value = 0;

    // Use the global auto-routing endpoint so it works regardless of
    // which region the API key was created in.
    const WS_BASE = "wss://global.rt.speechmatics.com/v2";
    console.log("[Speechmatics] Connecting to", WS_BASE);
    const ws = new WebSocket(`${WS_BASE}?jwt=${token}`);

    mediaRef.current = { stream, audioCtx, source, processor, monitorGain, ws };

    // Start elapsed timer
    timerRef.current = window.setInterval(() => {
      setRecordTimer((t) => t + 1);
    }, 1000);

    // Set a transcription timeout — if no transcript received within 15s of
    // the WS being open, surface a warning so nothing hangs silently.
    const startTranscriptTimeout = () => {
      transcriptTimeoutRef.current = window.setTimeout(() => {
        if (!transcriptReceivedRef.current) {
          console.warn("[Speechmatics] No transcript received within 15s");
          setAudioError(
            "Transcription connected but no speech detected — " +
            "check your mic is working. (See console [Audio] logs for level diagnostics.)"
          );
        }
      }, 15000);
    };

    ws.onopen = () => {
      console.log("[Speechmatics] WebSocket opened");
      setWsStatus("connected");

      // CRITICAL FIX: Speechmatics expects `message` field (not `type`),
      // and PascalCase values like "StartRecognition", not "start_recognition".
      ws.send(
        JSON.stringify({
          message: "StartRecognition",
          audio_format: {
            type: "raw",
            encoding: "pcm_s16le",
            sample_rate: actualSampleRate,
          },
          transcription_config: {
            language: "en",
            enable_partials: true,
            max_delay: 2,
          },
        })
      );

      console.log(`[Speechmatics] StartRecognition sent — encoding=pcm_s16le sample_rate=${actualSampleRate}`);

      source.connect(processor);
      processor.connect(monitorGain);
      monitorGain.connect(audioCtx.destination);

      let audioBufCount = 0;
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);

        // Diagnostics: compute min/max every buffer so we know if the mic
        // is actually producing audio or is silent.
        let min = 1, max = -1;
        for (let i = 0; i < input.length; i++) {
          const s = input[i];
          if (s < min) min = s;
          if (s > max) max = s;
        }
        if (min === 0 && max === 0) {
          console.warn(`[Audio] ⚠ Buffer #${audioBufCount} is ALL ZEROS — mic is capturing silence!`);
        } else {
          console.log(`[Audio] Buffer #${audioBufCount} n=${input.length} min=${min.toFixed(4)} max=${max.toFixed(4)}`);
        }
        audioBufCount++;

        // Convert Float32 [-1,1] to Int16 PCM (pcm_s16le) as required by Speechmatics
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(pcm.buffer);
      };

      // Start the "no response" timer after sending start_recognition
      startTranscriptTimeout();
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        console.log("[Speechmatics] Received:", msg.message, msg);
        if (msg.message === "AddPartialTranscript") {
          const partial = msg.metadata?.transcript || "";
          setInterimText(partial);
          // Show live partial in the answer textarea too
          if (partial) {
            setAnswer((transcriptRef.current + " " + partial).trim());
          }
        } else if (msg.message === "AddTranscript") {
          const final = msg.metadata?.transcript || "";
          transcriptRef.current += (transcriptRef.current ? " " : "") + final;
          console.log("[Transcript] setAnswer called with:", JSON.stringify(transcriptRef.current));
          setTranscript(transcriptRef.current);
          setAnswer(transcriptRef.current);
          console.log("[Transcript] setAnswer called — done");
          setInterimText("");
          transcriptReceivedRef.current = true;
        } else if (msg.message === "Error") {
          console.error("[Speechmatics] Server error:", msg);
          setAudioError(`Transcription server error: ${msg.type || "unknown"}`);
          stopRecording();
        }
      } catch {
        // Non-JSON message (e.g. binary AudioAdded) — ignore
      }
    };

    ws.onerror = () => {
      console.error("[Speechmatics] WebSocket error event");
      setWsStatus("error");
      setAudioError(
        "Could not connect to the transcription service. " +
        "If you're in a preview environment, the connection may be blocked. " +
        "Please try the published/live URL instead."
      );
      stopRecording();
    };

    ws.onclose = (ev) => {
      console.log("[Speechmatics] WebSocket closed:", ev.code, ev.reason);
      // Non-1000/1005 close codes indicate an error; ensure cleanup runs
      if (ev.code !== 1000 && ev.code !== 1005) {
        setWsStatus("error");
        setAudioError(
          `Transcription connection closed unexpectedly (code ${ev.code}${ev.reason ? ": " + ev.reason : ""}). ` +
          "Please try again."
        );
        // Call stopRecording unconditionally — it's a no-op if already cleaned up
        stopRecording();
      }
    };
  }, [stopRecording]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const media = mediaRef.current;
      if (media) {
        try { media.ws.close(); } catch {}
        try { media.processor.disconnect(); } catch {}
        try { media.source.disconnect(); } catch {}
        try { media.monitorGain.disconnect(); } catch {}
        try { media.audioCtx.close(); } catch {}
        try { media.stream.getTracks().forEach((t) => t.stop()); } catch {}
      }
    };
  }, []);

  // No prep data — empty state
  if (!prep || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Mic className="w-12 h-12 text-primary/30 mb-4" />
        <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
          Mock Interview
        </h2>
        <p className="text-foreground/50 text-sm mt-2 max-w-md">
          Analyze a job match first to get tailored interview questions. Head to the Job Matches
          page, analyze a job, and click "Practice" to prepare here.
        </p>
        <button
          onClick={() => navigate("/jobs")}
          className="btn-primary mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Job Matches
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-foreground/50 mb-1">
          <button
            onClick={() => {
              localStorage.removeItem("jobagent_interview_prep");
              setPrep(null);
            }}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span>Mock Interview</span>
        </div>
        <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
          {prep.job.title}
        </h2>
        <p className="text-foreground/50 text-sm mt-1">{prep.job.company}</p>
      </div>

      {/* Question selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {prep.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              console.log("[Question] Switching to Q" + (i + 1) + " — clearing answer");
              setCurrentQIndex(i);
              setAnswer("");
              setFeedback(null);
              setError("");
            }}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
              i === currentQIndex
                ? "bg-primary text-white"
                : "bg-muted text-foreground/60 hover:bg-muted/80"
            }`}
          >
            Q{i + 1}
          </button>
        ))}
      </div>

      {/* Current question card */}
      <div className="card-base border-primary/20">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-foreground/50 font-medium uppercase tracking-wider mb-1">
              {currentQuestion.focus}
            </p>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>
        </div>

        {/* Answer input */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-foreground/50">
              Your Answer
            </label>
            <div className="flex items-center gap-2">
              {wsStatus === "connecting" && (
                <span className="text-xs text-warning animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Connecting…
                </span>
              )}
              {wsStatus === "connected" && (
                <span className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Connected
                </span>
              )}
              {wsStatus === "error" && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Connection failed
                </span>
              )}
              <button
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? "Stop recording" : "Record your answer via microphone"}
                aria-pressed={recording}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  recording
                    ? "bg-destructive/10 text-destructive border border-destructive/30 animate-pulse"
                    : "bg-muted text-foreground/60 border border-transparent hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {recording ? (
                  <>
                    <Square className="w-3.5 h-3.5" fill="currentColor" />
                    Stop ({recordTimer}s)
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    Record
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            value={answer}
            onChange={(e) => {
              console.log("[Textarea] onChange — new value length:", e.target.value.length, "first 50 chars:", JSON.stringify(e.target.value.slice(0, 50)));
              setAnswer(e.target.value);
            }}
            placeholder={recording ? "Listening… speak now" : "Type your answer here…"}
            rows={5}
            className="input-base resize-none"
            disabled={recording}
          />

          {/* Live transcription display during recording */}
          {recording && (
            <div className="bg-muted/30 border border-muted rounded-lg px-3 py-2 min-h-[48px] text-sm leading-relaxed">
              {transcript && (
                <span className="text-foreground/80">{transcript} </span>
              )}
              {interimText && (
                <span className="text-foreground/40">{interimText}</span>
              )}
              {!transcript && !interimText && (
                <span className="text-foreground/30 italic">Waiting for speech…</span>
              )}
            </div>
          )}

          {audioError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{audioError}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleGetFeedback}
              disabled={loading || !answer.trim()}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Get Feedback
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Score & Verdict */}
          <div className="card-base border-success/20">
            <div className="flex items-center gap-4">
              {/* Score ring */}
              <div
                className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: `conic-gradient(var(--color-success) 0deg ${feedback.score * 3.6}deg, var(--color-muted) ${feedback.score * 3.6}deg 360deg)`,
                }}
              >
                <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
                  <span className="text-lg font-heading font-bold text-success">
                    {feedback.score}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {feedback.verdict}
                </p>
                <p className="text-xs text-foreground/50 mt-0.5">
                  Score: {feedback.score}/100
                </p>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {feedback.strengths?.length > 0 && (
            <div className="card-base">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <h3 className="text-sm font-semibold text-foreground/80">Strengths</h3>
              </div>
              <ul className="space-y-1.5">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                    <span className="text-success mt-1">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements?.length > 0 && (
            <div className="card-base">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground/80">Areas to Improve</h3>
              </div>
              <ul className="space-y-1.5">
                {feedback.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/70">
                    <span className="text-warning mt-1">•</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Model Answer */}
          <div className="card-base border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/80">Model Answer</h3>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
              {feedback.modelAnswer}
            </p>
          </div>

          {/* Next question */}
          {currentQIndex < prep.questions.length - 1 && (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setCurrentQIndex((i) => i + 1);
                  setAnswer("");
                  setFeedback(null);
                }}
                className="btn-secondary"
              >
                <Target className="w-4 h-4" />
                Next Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}