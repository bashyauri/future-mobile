import axios from "axios";
import api from "@/lib/api";
import {
  clearSubjectQuestionBank,
  getDownloadedQuestionCount,
  initOfflineDatabase,
  saveSubjectQuestionPage,
  updateSubjectDownloadRecord,
} from "@/lib/offlineDb";

type DownloadedSubject = {
  id: number;
  name: string;
};

type DownloadProgress = {
  subjectId: number;
  subjectName: string;
  phase: "checking" | "downloading" | "page" | "completed";
  currentPage?: number;
  lastPage?: number;
};

type DownloadOptions = {
  year?: number;
  onProgress?: (progress: DownloadProgress) => void;
};

type QuestionOption = {
  id: number;
  label: string | null;
  option_text: string | null;
  is_correct: boolean;
};

type QuestionPayload = {
  id: number;
  question_text: string | null;
  question_text_html: string | null;
  question_image: string | null;
  explanation: string | null;
  explanation_html: string | null;
  explanation_image: string | null;
  subject_id: number;
  topic_id: number | null;
  exam_type_id: number | null;
  exam_year: number | null;
  year: number | null;
  difficulty: string | null;
  is_mock: boolean;
  mock_group_id: number | null;
  options: QuestionOption[];
};

function extractQuestions(payload: unknown): QuestionPayload[] {
  if (Array.isArray(payload)) {
    return payload as QuestionPayload[];
  }

  if (payload && typeof payload === "object") {
    const maybe = payload as { data?: unknown };

    if (Array.isArray(maybe.data)) {
      return maybe.data as QuestionPayload[];
    }
  }

  return [];
}

export async function isSubjectDownloaded(subjectId: number): Promise<boolean> {
  await initOfflineDatabase();

  const count = await getDownloadedQuestionCount(subjectId);

  return count > 0;
}

export async function downloadSubjectQuestionBank(
  subjectId: number,
  options: DownloadOptions = {},
): Promise<number> {
  const { year, onProgress } = options;

  await initOfflineDatabase();

  await updateSubjectDownloadRecord(subjectId, "downloading", 0, null);
  await clearSubjectQuestionBank(subjectId);

  try {
    onProgress?.({
      subjectId,
      subjectName: `Subject ${subjectId}`,
      phase: "downloading",
    });

    const firstPageResponse = await api.get(`/subjects/${subjectId}/download`, {
      params: {
        per_page: 100,
        page: 1,
        ...(year ? { year } : {}),
      },
    });

    const subjectName =
      firstPageResponse.data?.subject?.name ?? `Subject ${subjectId}`;
    const pagination = firstPageResponse.data?.pagination ?? {};
    const lastPage = pagination.last_page ?? 1;

    onProgress?.({
      subjectId,
      subjectName,
      phase: "page",
      currentPage: 1,
      lastPage,
    });

    await saveSubjectQuestionPage(
      extractQuestions(firstPageResponse.data?.questions),
    );

    for (let page = 2; page <= lastPage; page += 1) {
      const pageResponse = await api.get(`/subjects/${subjectId}/download`, {
        params: {
          per_page: 100,
          page,
          ...(year ? { year } : {}),
        },
      });

      await saveSubjectQuestionPage(
        extractQuestions(pageResponse.data?.questions),
      );

      onProgress?.({
        subjectId,
        subjectName,
        phase: "page",
        currentPage: page,
        lastPage,
      });
    }

    const finalCount = await getDownloadedQuestionCount(subjectId);
    await updateSubjectDownloadRecord(
      subjectId,
      "downloaded",
      finalCount,
      null,
    );

    onProgress?.({
      subjectId,
      subjectName,
      phase: "completed",
    });

    return finalCount;
  } catch (error: unknown) {
    const downloadedCount = await getDownloadedQuestionCount(subjectId);
    const message = axios.isAxiosError(error)
      ? (error.response?.data?.message ??
        `Download failed with status ${error.response?.status ?? "unknown"}.`)
      : error instanceof Error
        ? error.message
        : "Download failed.";

    await updateSubjectDownloadRecord(
      subjectId,
      "failed",
      downloadedCount,
      message,
    );

    throw new Error(message);
  }
}

export async function downloadMissingSubjects(
  subjects: DownloadedSubject[],
  options: DownloadOptions = {},
): Promise<{
  downloadedNow: DownloadedSubject[];
  alreadyAvailable: DownloadedSubject[];
}> {
  const { year, onProgress } = options;
  const downloadedNow: DownloadedSubject[] = [];
  const alreadyAvailable: DownloadedSubject[] = [];

  for (const subject of subjects) {
    onProgress?.({
      subjectId: subject.id,
      subjectName: subject.name,
      phase: "checking",
    });

    const availableOffline = await isSubjectDownloaded(subject.id);

    if (availableOffline) {
      alreadyAvailable.push(subject);
      continue;
    }

    await downloadSubjectQuestionBank(subject.id, {
      year,
      onProgress: (progress) => {
        onProgress?.({
          ...progress,
          subjectName: subject.name,
        });
      },
    });
    downloadedNow.push(subject);
  }

  return { downloadedNow, alreadyAvailable };
}
