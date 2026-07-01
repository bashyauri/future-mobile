export type SubjectDownloadStatus =
  "not_downloaded" | "downloading" | "downloaded" | "failed";

export type DownloadRecord = {
  subject_id: number;
  status: SubjectDownloadStatus;
  question_count: number;
  downloaded_at: string | null;
  updated_at: string | null;
  last_error: string | null;
};

export type DownloadPayloadQuestion = {
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
  options: Array<{
    id: number;
    label: string | null;
    option_text: string | null;
    is_correct: boolean;
  }>;
};
