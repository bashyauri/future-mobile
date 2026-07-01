import type {
  DownloadPayloadQuestion,
  DownloadRecord,
  SubjectDownloadStatus,
} from "@/lib/offlineDb.types";

const browserDownloadRecords = new Map<number, DownloadRecord>();
const browserQuestionStore = new Map<number, DownloadPayloadQuestion[]>();

export async function initOfflineDatabase(): Promise<void> {
  return;
}

export async function clearSubjectQuestionBank(
  subjectId: number,
): Promise<void> {
  browserQuestionStore.set(subjectId, []);
}

export async function saveSubjectQuestionPage(
  questions: DownloadPayloadQuestion[],
): Promise<void> {
  if (questions.length === 0) {
    return;
  }

  const grouped = new Map<number, DownloadPayloadQuestion[]>();

  for (const question of questions) {
    const current = grouped.get(question.subject_id) ?? [];
    current.push(question);
    grouped.set(question.subject_id, current);
  }

  for (const [subjectId, entries] of grouped.entries()) {
    const existing = browserQuestionStore.get(subjectId) ?? [];
    const merged = [...existing, ...entries];
    browserQuestionStore.set(subjectId, merged);
  }
}

export async function getDownloadedQuestionCount(
  subjectId: number,
): Promise<number> {
  return (browserQuestionStore.get(subjectId) ?? []).length;
}

export async function updateSubjectDownloadRecord(
  subjectId: number,
  status: SubjectDownloadStatus,
  questionCount: number,
  lastError: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  const previous = browserDownloadRecords.get(subjectId);

  browserDownloadRecords.set(subjectId, {
    subject_id: subjectId,
    status,
    question_count: questionCount,
    downloaded_at:
      status === "downloaded" ? now : (previous?.downloaded_at ?? null),
    updated_at: now,
    last_error: lastError,
  });
}

export async function getAllDownloadRecords(): Promise<DownloadRecord[]> {
  return Array.from(browserDownloadRecords.values());
}
