# JobAgent — AI-Powered Career Coach

Built for the **NativeBuilder: Build Without Limits Hackathon**

**Team Name:** Career-Coders
**Team Lead:** Rao Shahroz
**Member:** Sahil Kumar

---

## What is JobAgent?

JobAgent is an AI-powered career coach that turns a CV and a target role into a complete, guided job-hunt pipeline. Instead of being a passive job board, it actively helps users understand their fit for a role, close their skill gaps, write tailored applications, avoid scams, and rehearse interviews out loud — all backed by real AI calls, with no hardcoded or simulated data.

## The Problem

Job seekers waste time applying blindly:
- No idea whether their CV actually matches a role
- Generic cover letters sent to every listing
- No way to spot scam job postings
- Walking into interviews unprepared
- Applications scattered across emails and spreadsheets with no tracking

## The Solution

JobAgent turns a single CV and a target role into a full, guided job-hunt pipeline:

**Upload CV → Get matched jobs → See your fit → Prepare and apply** — all AI-powered, end to end.

## How It Works

1. Upload your CV (PDF/TXT) and tell JobAgent your target job title, location, and work preference (Remote / Onsite / Hybrid / Any)
2. AI parses your **real CV** and extracts a structured profile — skills, experience, education, strengths, and gaps
3. AI discovers and scores matching jobs against your actual profile
4. For each job, get a tailored cover letter, ATS keyword suggestions, a missing-skills roadmap, and a scam-risk assessment
5. Practice with an AI-powered mock interview — answer by **voice**, transcribed in real time
6. Track every application on a Kanban board from Saved to Offer

## Key Features

### Real CV Analysis
Parses the actual uploaded CV and extracts a structured profile unique to the user — no fixed templates, no generic placeholder data.

### Smart Job Matching
AI scores job fit with a clear, human-readable explanation instead of a black-box number, plus a short learning roadmap for any missing skills.

### Tailored Cover Letters & ATS Keywords
A unique cover letter generated per job using the real CV and real job description, along with ATS keyword suggestions.

### Scam Detection
Every listing is analyzed for red flags, with the risk level shown transparently rather than hidden or silently filtered.

### Voice-Powered Mock Interview
Role-specific interview questions, answered by speaking. Speechmatics transcribes the answer in real time, and AI scores it with strengths, improvements, and a model answer.

### Application Tracker
A Kanban board (Saved → Applied → Interviewing → Offer → Rejected) plus a dashboard summarizing jobs analyzed, average match score, and applications in progress.

## What Makes This Different

Most job platforms are passive listing aggregators. JobAgent is an active coach — it tells you *why* you match, *what's* missing, *how* to fix it, and rehearses the interview with you. It closes the loop from "found a job" to "ready to apply."

## Tech Stack

- **Platform:** Built end-to-end on [native.builder](https://builder.nativelyai.com)
- **AI Reasoning:** Google Gemini — powers CV analysis, job matching, cover letter generation, scam detection, and interview coaching
- **Backend:** Supabase — authentication, Postgres database, file storage, and Edge Functions
- **Voice:** Speechmatics — real-time speech-to-text for the mock interview
- **Frontend:** React + TypeScript + Vite

**No mock or hardcoded data anywhere** — every result the app shows comes from a real, live AI call using the user's actual CV and actual job data. If any step fails, the UI shows a clear error instead of silently falling back to fake output.

## Challenges We Solved

- **Zero silent fallbacks** — built a strict error-handling pattern so every AI/integration failure surfaces visibly to the user instead of masquerading as real output
- **Real-time voice pipeline** — debugged the full chain from microphone capture → WebSocket connection to Speechmatics → correct PCM audio encoding → live transcript rendering in the UI
- **Personalized discovery** — ensured job discovery and matching are driven by the user's actual target role, location, and work preference, not a fixed unrelated set of results

## What's Next

- Live job scraping via Bright Data for real, current listings (currently AI-generated realistic listings)
- Multi-language cover letters for international/remote roles
- Auto-apply with a final human confirmation step before submission
- Weekly follow-up nudges for applications that have gone stale

## Live Demo

*((https://48d7wy122eiywxtjlidu65j4c.nativelyai.app))*

## Screenshots


<img width="374" height="479" alt="image" src="https://github.com/user-attachments/assets/48e33aa4-3623-4e1d-a2f8-afa33b3ad73d" />
<img width="1366" height="650" alt="image" src="https://github.com/user-attachments/assets/58d783c5-9868-419c-8567-0534008e4b42" />
<img width="1366" height="642" alt="image" src="https://github.com/user-attachments/assets/d646b20c-f395-4e86-8128-59eca8c2d05c" />
<img width="1148" height="637" alt="image" src="https://github.com/user-attachments/assets/659838f4-ca11-4ee9-976d-7850640c043c" />
<img width="1366" height="625" alt="image" src="https://github.com/user-attachments/assets/7ff01cef-bd2b-4715-ab2d-624e50488709" />
<img width="1366" height="645" alt="image" src="https://github.com/user-attachments/assets/da974784-1a46-4d74-b012-1b165916ca0e" />
<img width="1363" height="566" alt="image" src="https://github.com/user-attachments/assets/f467cc71-a649-41fc-8563-09df22dd30e5" />
<img width="1149" height="629" alt="image" src="https://github.com/user-attachments/assets/a6fb24a2-bc1d-4f1d-a01e-56137b1d80e6" />
<img width="1151" height="504" alt="image" src="https://github.com/user-attachments/assets/7174405d-0fd7-40ce-b734-e724b8ec23a7" />
<img width="1195" height="566" alt="image" src="https://github.com/user-attachments/assets/f4b7cd30-f2c4-49c3-ad0e-469b068d1822" />
<img width="1104" height="330" alt="image" src="https://github.com/user-attachments/assets/237c3867-3740-4110-8c01-088348ea3a37" />
<img width="1366" height="631" alt="image" src="https://github.com/user-attachments/assets/880e0486-79e0-49ce-8820-a0a482720a2f" />
<img width="1366" height="627" alt="image" src="https://github.com/user-attachments/assets/ad2488ad-cbcd-491c-84ae-f1cb9febcc7d" />
<img width="1366" height="648" alt="image" src="https://github.com/user-attachments/assets/1e0b6aa3-91b1-4a2b-90db-496a4b89c02d" />
<img width="1366" height="637" alt="image" src="https://github.com/user-attachments/assets/f8c27fec-a709-45c2-99f7-a84f60094ac2" />
<img width="1289" height="498" alt="image" src="https://github.com/user-attachments/assets/f6b986c7-f23d-4273-a579-ed813cd32999" />

















---

Built with ❤️ by Team Career-Coders for the NativeBuilder Hackathon.
