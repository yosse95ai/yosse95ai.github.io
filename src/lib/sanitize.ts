/**
 * ログ出力用サニタイズユーティリティ
 * Log Injection (CWE-117) 対策: 改行文字・制御文字を除去する
 */

/**
 * ログ出力前に文字列をサニタイズする
 * 改行文字・キャリッジリターンをスペースに置換し、制御文字を除去する
 */
export function sanitizeForLog(value: string): string {
  return value
    .replace(/[\r\n]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}


/**
 * 例外をログ出力用の1行文字列に整形する
 * 外部由来のメッセージが含まれうるためサニタイズを通す
 */
export function formatErrorForLog(err: unknown): string {
  if (err instanceof Error) return sanitizeForLog(`${err.name}: ${err.message}`);
  return sanitizeForLog(String(err));
}
