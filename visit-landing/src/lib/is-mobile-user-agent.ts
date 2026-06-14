/** 모바일 UA — Galaxy 등 canvas 프로모 강제 */
export function isMobileUserAgent(ua: string): boolean {
  return /Android|iPhone|iPod|Mobile|SamsungBrowser|webOS|BlackBerry|Opera Mini/i.test(
    ua
  );
}
