import * as SQLite from "expo-sqlite";
import type {
  DownloadPayloadQuestion,
  DownloadRecord,
  SubjectDownloadStatus,
} from "@/lib/offlineDb.types";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("future_academy.db");
  }

  return dbPromise;
}

export async function initOfflineDatabase(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      subject_id INTEGER NOT NULL,
      question_text TEXT,
      question_text_html TEXT,
      question_image TEXT,
      explanation TEXT,
      explanation_html TEXT,
      explanation_image TEXT,
      topic_id INTEGER,
      exam_type_id INTEGER,
      exam_year INTEGER,
      year INTEGER,
      difficulty TEXT,
      is_mock INTEGER NOT NULL DEFAULT 0,
      mock_group_id INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY,
      question_id INTEGER NOT NULL,
      label TEXT,
      option_text TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);

    CREATE TABLE IF NOT EXISTS offline_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_uuid TEXT UNIQUE NOT NULL,
      mode TEXT NOT NULL,
      subject_id INTEGER,
      payload_json TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_offline_attempts_synced ON offline_attempts(synced);

    CREATE TABLE IF NOT EXISTS offline_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_uuid TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option_id INTEGER,
      is_correct INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_offline_answers_attempt_uuid ON offline_answers(attempt_uuid);
    CREATE INDEX IF NOT EXISTS idx_offline_answers_question_id ON offline_answers(question_id);

    CREATE TABLE IF NOT EXISTS subject_downloads (
      subject_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'not_downloaded',
      question_count INTEGER NOT NULL DEFAULT 0,
      downloaded_at TEXT,
      updated_at TEXT NOT NULL,
      last_error TEXT
    );
  `);
}

export async function clearSubjectQuestionBank(
  subjectId: number,
): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    `DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE subject_id = ?)`,
    [subjectId],
  );

  await db.runAsync(`DELETE FROM questions WHERE subject_id = ?`, [subjectId]);
}

export async function saveSubjectQuestionPage(
  questions: DownloadPayloadQuestion[],
): Promise<void> {
  if (questions.length === 0) {
    return;
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.execAsync("BEGIN TRANSACTION");

  try {
    for (const question of questions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO questions (
          id,
          subject_id,
          question_text,
          question_text_html,
          question_image,
          explanation,
          explanation_html,
          explanation_image,
          topic_id,
          exam_type_id,
          exam_year,
          year,
          difficulty,
          is_mock,
          mock_group_id,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          question.id,
          question.subject_id,
          question.question_text,
          question.question_text_html,
          question.question_image,
          question.explanation,
          question.explanation_html,
          question.explanation_image,
          question.topic_id,
          question.exam_type_id,
          question.exam_year,
          question.year,
          question.difficulty,
          question.is_mock ? 1 : 0,
          question.mock_group_id,
          now,
        ],
      );

      if (question.options.length > 0) {
        for (const option of question.options) {
          await db.runAsync(
            `INSERT OR REPLACE INTO options (
              id,
              question_id,
              label,
              option_text,
              is_correct,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              option.id,
              question.id,
              option.label,
              option.option_text,
              option.is_correct ? 1 : 0,
              now,
            ],
          );
        }
      }
    }

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}

export async function getDownloadedQuestionCount(
  subjectId: number,
): Promise<number> {
  const db = await getDb();

  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM questions WHERE subject_id = ?`,
    [subjectId],
  );

  return row?.total ?? 0;
}

export async function updateSubjectDownloadRecord(
  subjectId: number,
  status: SubjectDownloadStatus,
  questionCount: number,
  lastError: string | null = null,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const downloadedAt = status === "downloaded" ? now : null;

  await db.runAsync(
    `INSERT INTO subject_downloads (
      subject_id,
      status,
      question_count,
      downloaded_at,
      updated_at,
      last_error
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(subject_id) DO UPDATE SET
      status = excluded.status,
      question_count = excluded.question_count,
      downloaded_at = COALESCE(excluded.downloaded_at, subject_downloads.downloaded_at),
      updated_at = excluded.updated_at,
      last_error = excluded.last_error`,
    [subjectId, status, questionCount, downloadedAt, now, lastError],
  );
}

export async function getAllDownloadRecords(): Promise<DownloadRecord[]> {
  const db = await getDb();

  return db.getAllAsync<DownloadRecord>(
    `SELECT
      subject_id,
      status,
      question_count,
      downloaded_at,
      updated_at,
      last_error
    FROM subject_downloads`,
  );
}
