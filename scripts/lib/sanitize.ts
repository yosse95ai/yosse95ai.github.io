/**
 * ログ出力用サニタイズユーティリティ
 *
 * 実装は src/lib/sanitize.ts に集約し、scripts 側からは再エクスポートで利用する
 * （ビルド時コード src/lib/* とスクリプトで同じサニタイズ処理を共有するため）
 */
export { sanitizeForLog } from '../../src/lib/sanitize.js';
