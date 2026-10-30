import type { LogEntry, LogEventType, LogSeverity } from '@/types';

// FICTIONAL SIMULATED LOGS for "Cobalt Freight" (a made-up company). Generated deterministically
// from a fixed seed so every user sees the same data. Hosts, users and IPs are invented
// (RFC 5737 documentation IP ranges). Nothing here is a real log.

export const LOG_DATE = '2026-06-10';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Draft = Omit<LogEntry, 'id'>;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (h: number, m: number, s: number) => `${LOG_DATE}T${pad(h)}:${pad(m)}:${pad(s)}Z`;

const USERS = ['asmith', 'bkhan', 'cdiaz', 'dpatel', 'eolsen'];
const WORKSTATION: Record<string, string> = { asmith: 'WS-101', bkhan: 'WS-102', cdiaz: 'WS-103', dpatel: 'WS-104', eolsen: 'WS-105' };
const OFFICE_IP: Record<string, string> = { asmith: '192.0.2.41', bkhan: '192.0.2.42', cdiaz: '192.0.2.43', dpatel: '192.0.2.44', eolsen: '192.0.2.45' };
const SHARES = ['Finance/Q2-forecast.xlsx', 'Ops/route-plan.pdf', 'HR/handbook.docx', 'Sales/pipeline.csv', 'Ops/fleet-status.xlsx', 'Legal/contract-template.docx'];
const APPS = ['outlook.exe', 'excel.exe', 'chrome.exe', 'teams.exe', 'winword.exe'];

function generateNormal(): Draft[] {
  const rnd = mulberry32(20260610);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const out: Draft[] = [];
  const timeBetween = (fromH: number, toH: number): [number, number, number] => {
    const total = Math.floor(fromH * 3600 + rnd() * (toH - fromH) * 3600);
    return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
  };
  for (const user of USERS) {
    const [h, m, s] = timeBetween(7, 9);
    out.push({ time: iso(h, m, s), type: 'auth', severity: 'info', user, host: WORKSTATION[user], action: 'login_success', message: `${user} signed in interactively`, sourceIp: OFFICE_IP[user], anomaly: false, raw: { logon_type: 'interactive', mfa: 'n/a (on-premises)' } });
  }
  for (let i = 0; i < 20; i++) {
    const user = pick(USERS);
    const [h, m, s] = timeBetween(8, 17.5);
    const file = pick(SHARES);
    out.push({ time: iso(h, m, s), type: 'file', severity: 'info', user, host: 'SRV-FILE01', action: 'file_read', message: `${user} opened ${file}`, sourceIp: OFFICE_IP[user], anomaly: false, raw: { path: file, bytes: String(20000 + Math.floor(rnd() * 900000)) } });
  }
  for (let i = 0; i < 12; i++) {
    const user = pick(USERS);
    const [h, m, s] = timeBetween(8, 17.5);
    out.push({ time: iso(h, m, s), type: 'email', severity: 'info', user, host: 'MAIL-GW', action: 'email_sent', message: `${user} sent an email (${1 + Math.floor(rnd() * 3)} recipients)`, sourceIp: OFFICE_IP[user], anomaly: false, raw: { attachments: String(Math.floor(rnd() * 2)) } });
  }
  for (let i = 0; i < 12; i++) {
    const user = pick(USERS);
    const [h, m, s] = timeBetween(8, 17.5);
    const app = pick(APPS);
    out.push({ time: iso(h, m, s), type: 'process', severity: 'info', user, host: WORKSTATION[user], action: 'process_start', message: `${app} started`, sourceIp: OFFICE_IP[user], anomaly: false, raw: { image: app, signed: 'yes', parent: 'explorer.exe' } });
  }
  for (let i = 0; i < 8; i++) {
    const user = pick(USERS);
    const [h, m, s] = timeBetween(8, 17.5);
    out.push({ time: iso(h, m, s), type: 'network', severity: 'info', user, host: WORKSTATION[user], action: 'dns_query', message: `${user} resolved sites used for daily work`, sourceIp: OFFICE_IP[user], anomaly: false, raw: { domain: pick(['mail.cobalt-freight.example', 'crm.cobalt-freight.example', 'wiki.cobalt-freight.example']) } });
  }
  return out;
}

const DECOYS: Draft[] = [
  { time: iso(1, 0, 0), type: 'file', severity: 'low', user: 'svc-backup', host: 'SRV-FILE01', action: 'backup_job', message: 'Nightly backup copied 48 GB to NAS01', sourceIp: '192.0.2.60', anomaly: false, raw: { destination: 'NAS01 (internal)', scheduled: 'true', note: 'Scheduled nightly backup. Large but expected, and the destination is internal.' } },
  { time: iso(2, 0, 0), type: 'system', severity: 'low', user: 'system', host: 'SRV-FILE01', action: 'patch_reboot', message: 'Server rebooted for monthly patching', sourceIp: '192.0.2.60', anomaly: false, raw: { window: 'monthly patch window', note: 'Planned maintenance. Reboots in the patch window are expected.' } },
  { time: iso(8, 31, 14), type: 'auth', severity: 'low', user: 'dpatel', host: 'WS-104', action: 'login_failed', message: 'dpatel failed to sign in (3 attempts, then succeeded)', sourceIp: '192.0.2.44', anomaly: false, raw: { failures: '3', note: 'Three typos at the office desk, then success. Normal human behaviour.' } },
  { time: iso(12, 5, 10), type: 'auth', severity: 'low', user: 'asmith', host: 'VPN-GW', action: 'login_success', message: 'asmith signed in over VPN from a new location', sourceIp: '198.51.100.200', anomaly: false, raw: { mfa: 'push approved on enrolled device', note: 'Working from a partner site. New IP, but MFA satisfied on her enrolled phone at a normal hour.' } },
  { time: iso(16, 40, 22), type: 'file', severity: 'low', user: 'bkhan', host: 'WS-102', action: 'file_delete', message: 'bkhan deleted 200 files from a temp export folder', sourceIp: '192.0.2.42', anomaly: false, raw: { path: 'C:\\Exports\\tmp', ticket: 'CHG-5531', note: 'Cleanup matches change ticket CHG-5531.' } },
];

const ANOMALIES: Draft[] = [
  { time: iso(3, 14, 7), type: 'auth', severity: 'high', user: 'admin-ops', host: 'VPN-GW', action: 'login_success', message: 'admin-ops signed in over VPN from an IP never seen before', sourceIp: '203.0.113.77', anomaly: true, anomalyReason: 'First-ever login from this IP, at 03:14 UTC, outside the account\'s usual 08:00–17:00 pattern.', raw: { mfa: 'not required (service-style account)', usual_hours: '08:00-17:00' } },
  { time: iso(3, 16, 42), type: 'admin', severity: 'critical', user: 'admin-ops', host: 'DC01', action: 'group_member_added', message: 'admin-ops added a member to Domain Admins', sourceIp: '203.0.113.77', anomaly: true, anomalyReason: 'A privileged group change made two minutes after an unusual login suggests privilege escalation.', raw: { group: 'Domain Admins', member: 'svc-report' } },
  { time: iso(3, 20, 19), type: 'auth', severity: 'high', user: 'svc-backup', host: 'DC01', action: 'interactive_logon', message: 'svc-backup logged on interactively', sourceIp: '203.0.113.77', anomaly: true, anomalyReason: 'Service accounts should never log on interactively, and this came from the same unusual IP.', raw: { logon_type: 'interactive', expected: 'service logon only' } },
  { time: iso(3, 27, 50), type: 'file', severity: 'high', user: 'bkhan', host: 'SRV-FILE01', action: 'file_read_burst', message: 'bkhan read 512 files in 2 minutes', sourceIp: '203.0.113.77', anomaly: true, anomalyReason: 'Rate is far above bkhan\'s baseline (about 12 reads an hour), at 03:27, and the source IP is not his usual one.', raw: { files: '512', window: '2 min', baseline_per_hour: '12' } },
  { time: iso(9, 2, 33), type: 'auth', severity: 'medium', user: 'cdiaz', host: 'VPN-GW', action: 'login_after_failures', message: 'cdiaz succeeded after 14 failed attempts in 90 seconds', sourceIp: '198.51.100.9', anomaly: true, anomalyReason: 'A burst of failures then a success is a classic password-guessing pattern, and the IP is not cdiaz\'s usual one. It could also be a forgotten password, so verify before concluding.', raw: { failures: '14', window: '90 sec' } },
  { time: iso(14, 30, 12), type: 'process', severity: 'high', user: 'dpatel', host: 'WS-104', action: 'process_start', message: 'powershell.exe started by winword.exe with an encoded command', sourceIp: '192.0.2.44', anomaly: true, anomalyReason: 'A document editor launching a scripting engine with an obfuscated command is a strong sign of malicious macro activity.', raw: { image: 'powershell.exe', parent: 'winword.exe', command_line: 'powershell.exe -EncodedCommand [REDACTED-SIMULATION]' } },
  { time: iso(14, 31, 5), type: 'network', severity: 'critical', user: 'dpatel', host: 'WS-104', action: 'network_out', message: 'WS-104 uploaded 1.2 GB to an external IP never contacted before', sourceIp: '203.0.113.250', anomaly: true, anomalyReason: 'A large outbound transfer to a never-seen external address, about a minute after the suspicious process, suggests data exfiltration.', raw: { bytes_out: '1288490188', destination_reputation: 'unknown', first_seen: 'today' } },
  { time: iso(22, 45, 31), type: 'admin', severity: 'critical', user: 'admin-ops', host: 'SRV-DB01', action: 'audit_log_cleared', message: 'admin-ops cleared the security audit log', sourceIp: '203.0.113.77', anomaly: true, anomalyReason: 'Clearing logs removes evidence. Combined with the earlier events from the same IP, this looks like cover-up activity.', raw: { log: 'Security', event_id: '1102' } },
];

/** Final, time-sorted log with stable ids (LOG-001, LOG-002, ...). */
export const LOG_ENTRIES: LogEntry[] = [...generateNormal(), ...DECOYS, ...ANOMALIES]
  .sort((a, b) => a.time.localeCompare(b.time) || a.action.localeCompare(b.action))
  .map((e, i) => ({ ...e, id: `LOG-${String(i + 1).padStart(3, '0')}` }));

export const LOG_EVENT_TYPES: LogEventType[] = ['auth', 'file', 'network', 'process', 'email', 'admin', 'system'];
export const LOG_SEVERITIES: LogSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
export const LOG_ANOMALY_COUNT = LOG_ENTRIES.filter((e) => e.anomaly).length;
