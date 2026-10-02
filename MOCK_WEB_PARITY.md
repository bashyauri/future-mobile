# Mock Exam Web Parity Brief

## Goal

Make `future-mobile` support the same mock exam choices, rules, timing, and recorded results as the Laravel web app. Keep the interface native to mobile; parity means the behavior and information are consistent, not that the screens look identical.

This brief applies to `future-mobile/`. Do not change the sibling `mobile/` project unless specifically requested.

## Web Behavior To Mirror

The web setup uses format-specific subject limits and has two distinct ways to start:

1. **Full Mock**: Start a multi-subject exam using the selected exam type and subjects. Use the mock-format question counts and overall duration. For one selected subject, web offers this option as well as batch browsing.
2. **Subject Mock Batch**: For one selected subject, browse available mock groups and choose a specific batch. Show its question count, completion state, and best score when available. A completed batch can be retaken.

Mobile should expose both modes. Do not silently substitute the first batch for a selected full mock or make batch selection inaccessible.

## Selection And Year

- Apply the subject limit by exam format: JAMB Full Mock allows up to four subjects; SSCE/WAEC Full Mock must not have an arbitrary four-subject cap and should allow every eligible subject the student selects.
- The generic web mock setup and mobile setup now both apply the four-subject maximum only to JAMB. Do not reintroduce that limit for SSCE/WAEC.
- Validate the same format-specific limit in the mobile UI, web setup, and API. For formats without a fixed cap, constrain selection to eligible subjects rather than an arbitrary numeric limit.
- Offer Subject Mock Batch only when exactly one subject is selected.
- Only allow subjects that have usable mock questions/groups for the selected exam type. Do not treat ordinary approved questions as mock questions.
- Display the question count for each selected subject and a total question count before starting.
- There is currently no year picker in web mock setup. Web creates sessions with `selected_year` set to `null`, and mobile currently sends `year: null`. Do not add a mobile-only year picker or imply that a year filter is applied. If year selection becomes a requirement, implement and test it end to end on both clients and the API.

## Counts, Timing, And Question Order

- Treat `config/mock.php` as the source of truth for format-specific Full Mock question counts and timing. Do not duplicate these rules as constants in TypeScript.
- For Full Mock, use the configured overall time limit when present; otherwise sum the configured selected-subject times when the format specifies that behavior. The web quiz uses one overall countdown, not a separate countdown that resets for each subject.
- The Subject Mock Batch web flow uses a 60-minute countdown. Keep that behavior unless the web product rule is changed deliberately.
- Remove the mobile-only 120-minute default. The API must return the authoritative duration for the selected mode and format.
- Match web randomization: when shuffle is enabled, randomize the selected questions and their answer options for the attempt. Never reveal correctness or explanations before submission.
- The session must contain the configured number of questions per subject. Reject a Full Mock selection that cannot meet those counts; do not start an empty or undersized subject silently.

## Persistence And Results

- Persist mobile answers and completed attempts through authenticated server APIs. A score calculated only in React state is not a completed attempt.
- Results must include the overall and per-subject scores and be available to the user's mock history/dashboard, consistent with web attempts.
- Preserve/resume an in-progress attempt safely after app navigation or restart. The server must validate ownership, status, and expiry; do not trust a client-provided score or correct-answer flag.
- Keep the existing answer-review experience after submission, but load authoritative results and review data from the submitted attempt where possible.

## API Contract

- `GET /mock/subjects?exam_type_id=...` returns active subjects with approved, usable mock questions and the format's configured question/time metadata.
- `GET /mock/groups?subject_id=...&exam_type_id=...` returns batches with the authenticated user's completion state and best score.
- `POST /mock/sessions` creates a persistent Full Mock session and in-progress `QuizAttempt`. It uses the configured counts/duration and randomly samples mock questions and answer-option order. Pass `mock_group_id` with one subject to start that exact Subject Mock Batch; batch duration is 60 minutes.
- `GET /mock/sessions/active` finds the current user's resumable attempt. `GET /mock/sessions/{session}` returns saved answers, ordered questions, current position, and server-derived remaining time.
- `PUT /mock/sessions/{session}/progress` saves owned question/option answers and position. `POST /mock/sessions/{session}/submit` grades server-side and completes the attempt; `mock_group_id` is retained for batch history and score summaries.
- Correct options and explanations are omitted from server-backed active attempts and returned only after submission. The existing standalone group-download response remains unchanged for compatibility with the sibling legacy `mobile/` project; `future-mobile` must use the session endpoint for exam attempts.
- The server enforces subject eligibility, JAMB's four-subject maximum, ownership, expiry, question membership, answer-option membership, and timer expiry. Never trust client-provided scores or correctness flags.

## UI Guidance

- Keep the current native mobile visual language and navigation.
- The setup should show exam type, selected subjects, question counts, total questions, and the applicable duration before the student starts.
- When one subject is selected, present clear Full Mock and Browse Batches actions. For multiple subjects, present Full Mock only.
- The batch picker should show batch label, question count, approximate duration, completion state, best score, and a retake action, matching the information shown on web.
- Provide loading, empty, validation-error, offline/network-error, and submission states. Prevent duplicate starts/submissions while requests are in progress.
- Do not add year selection until its behavior is supported end to end.

## Web UI Changes

No web visual redesign is required. However, the requested subject-limit correction must be applied to the web setup too: the generic web mock currently caps every format at four, so update its selection state, validation, and Blade labels/disabled states to make the cap JAMB-only and leave SSCE/WAEC without a fixed four-subject maximum. Keep the native mobile UI distinct while applying the same rules.

One optional web copy correction may be appropriate: the SSCE setup describes each subject as having its own duration, while the quiz currently enforces one overall timer equal to the sum of selected subject times. If that wording is changed, keep it consistent with the actual timer behavior; do not change the timer model as part of mobile parity without product approval.

## Acceptance Checklist

- [x] JAMB Full Mock allows up to four eligible subjects.
- [x] SSCE/WAEC Full Mock allows all eligible selected subjects, without a fixed four-subject cap.
- [x] Counts and duration shown in mobile match the web format configuration for the same selection.
- [x] A one-subject selection also offers batch browsing; selecting a batch starts that exact batch.
- [x] Batch question count, completion state, best score, and retake state match server records.
- [x] No year picker is shown and no year filter is implied.
- [x] Missing mock data prevents starting an incomplete Full Mock and gives a useful message.
- [x] Mobile answers survive navigation/restart through server-backed progress and active-session resume.
- [x] Submitting or timing out records a server-side attempt and authoritative scores.
- [x] The quiz uses the correct timer for its selected mode and does not expose answers before submission.
- [x] API feature tests cover configured counts/timing, batches, persistence, grading, answer secrecy, and ownership; focused API tests pass.
- [x] Web and mobile both enforce the same exam-format subject limits; no visual redesign is required.
- [ ] `npm run lint` passes without existing mobile-project lint errors.