// Tiny assertion harness shared by the tsx verification scripts.
let passed = 0;
let failed = 0;

export function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

export function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

export function finish(): never {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
