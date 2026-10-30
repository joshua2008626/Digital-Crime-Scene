import type { VerdictDraft } from '@/types';

// Hand-written answers used by tests to prove each case can be completed end to end.
// They live in tests/ (not src/) so they are never shipped in the production bundle.

export interface AnswerSet {
  /** A strong, natural-language analyst answer. Must score >= 90. */
  model: VerdictDraft;
  /** Right verdict but thin / overconfident. Must land in [partialMin, partialMax]. */
  partial: VerdictDraft;
  partialMin: number;
  partialMax: number;
  /** A confidently wrong answer built from red herrings. Must score <= 35. */
  wrong: VerdictDraft;
}

export const ANSWERS: Record<string, AnswerSet> = {
  'case-insider-paradox': {
    model: {
      verdictId: 'authorized_task',
      conclusion:
        "The records show an authorised task rather than theft. Claire emailed Jonas at 16:31 asking him to pull the full LYRA dataset that night and upload it to the audit portal. At 21:40 his managed laptop connected by VPN from his usual home IP with MFA approved on his enrolled phone, it downloaded 412 files, and at 22:15 the archive went to the approved audit portal, which the auditor confirmed. No removable media events occurred, and the badge log shows Jonas never returned to the building, so the USB-in-the-lab story and Mira's sighting do not match the records. Claire's claim that she never asked conflicts with her own email, and Jonas's denial conflicts with the logs, so all three statements are inaccurate in places. That does not prove anyone lied: I cannot determine why the accounts differ, and I cannot establish what Mira actually saw. The promotion rivalry and the old warning are motive and history, not evidence.",
      supportingEvidenceIds: ['I-05', 'I-07', 'I-08', 'I-09', 'I-01', 'I-06', 'I-10', 'I-11', 'I-14', 'I-15'],
      timeline: ['i-e1', 'i-e2', 'i-e4', 'i-e5', 'i-e7', 'i-e8', 'i-e9'],
      alternatives:
        'Malicious exfiltration is not supported because the only destination was the approved audit portal and there were no USB events. Account compromise is unlikely given the MFA approval on his enrolled phone and his usual home IP. A deliberate frame-up by Mira or Claire is not supported; mistaken recollection explains the differences better. Calling it inconclusive would ignore the consistent email, access, upload and auditor records.',
      confidence: 75,
      actionIds: ['i-a1', 'i-a2', 'i-a3', 'i-a4', 'i-a5', 'i-a6', 'i-a7', 'i-a8'],
      actionNotes: 'Preserve records, pause discipline, re-interview calmly with the records in hand.',
    },
    partial: {
      verdictId: 'authorized_task',
      conclusion: 'Jonas was asked by his manager to download the dataset for the auditors, so it was an authorised task and not theft.',
      supportingEvidenceIds: ['I-08', 'I-09', 'I-12'],
      timeline: ['i-e1', 'i-e5', 'i-e7'],
      alternatives: '',
      confidence: 100,
      actionIds: ['i-a1', 'i-a2'],
      actionNotes: '',
    },
    partialMin: 30,
    partialMax: 75,
    wrong: {
      verdictId: 'malicious_exfil',
      conclusion: 'Jonas stole the LYRA data to a USB stick, and Mira saw him do it because she was there at 10 PM, so Jonas lied.',
      supportingEvidenceIds: ['I-12', 'I-13', 'I-16'],
      timeline: ['i-e0', 'i-e3', 'i-e6'],
      alternatives: '',
      confidence: 100,
      actionIds: ['i-a10', 'i-a11', 'i-a12', 'i-a13'],
      actionNotes: '',
    },
  },
  'case-locked-office': {
    model: {
      verdictId: 'contain_restore',
      conclusion:
        "This is a ransomware incident that began with a compromised vendor service account, svc-vendor, which logged in over the VPN from an unfamiliar IP with no MFA. The account then gained local administrator rights on FS01, deleted the NAS01 snapshots, and ran the unsigned svc_update.exe, which the EDR only detected because servers were in detect-only mode. About 4.2 GB also left FS01 before encryption, so data theft is possible but I cannot confirm what was taken; the note's claim is unverified. The online NAS01 backups cannot be trusted, but the offline Sunday backup is intact in the safe, so the practice should isolate hosts, preserve evidence, rebuild and restore from the offline set rather than pay. The Sunday patch, the clean Saturday antivirus scan and the departed IT employee are unrelated to this chain.",
      supportingEvidenceIds: ['L-02', 'L-04', 'L-05', 'L-07', 'L-03', 'L-06', 'L-08', 'L-13', 'L-01'],
      timeline: ['l-e2', 'l-e4', 'l-e5', 'l-e6', 'l-e7', 'l-e8', 'l-e9'],
      alternatives:
        'Paying the ransom was considered but there is an intact offline backup and no guarantee of decryption. An ex-employee or insider is not supported because that account was disabled in February. A faulty update is not supported because the activity started hours later from an unsigned process. Storage hardware failure does not explain the ransom note. Restoring from the online NAS01 backups is unsafe because the snapshots were deleted.',
      confidence: 85,
      actionIds: ['l-a1', 'l-a2', 'l-a3', 'l-a4', 'l-a5', 'l-a6', 'l-a7', 'l-a8', 'l-a9', 'l-a10'],
      actionNotes: 'Isolate without powering off, preserve evidence, then restore from the tested offline set.',
    },
    partial: {
      verdictId: 'contain_restore',
      conclusion: 'This was a ransomware attack that came in through the VPN and encrypted the file server, so we should restore from backup and not pay.',
      supportingEvidenceIds: ['L-01', 'L-02', 'L-09'],
      timeline: ['l-e4', 'l-e8', 'l-e9'],
      alternatives: '',
      confidence: 100,
      actionIds: ['l-a1', 'l-a2', 'l-a4'],
      actionNotes: '',
    },
    partialMin: 25,
    partialMax: 70,
    wrong: {
      verdictId: 'pay_ransom',
      conclusion: 'We should pay the ransom quickly because patients are waiting, and the Sunday update caused the files to change.',
      supportingEvidenceIds: ['L-09', 'L-10', 'L-14'],
      timeline: ['l-e1', 'l-e3', 'l-e10'],
      alternatives: '',
      confidence: 100,
      actionIds: ['l-a12', 'l-a13', 'l-a14', 'l-a15'],
      actionNotes: '',
    },
  },
  'case-missing-blueprint': {
    model: {
      verdictId: 'misconfigured_share',
      conclusion:
        "The most likely explanation is accidental overexposure rather than a deliberate theft. Tomas created an anyone-with-the-link share on the whole Release folder at 19:48 so he could send fixture drawings to Ridgeway, as Sofia had asked, but Sofia asked for the Fixtures folder only and the tenant policy defaults external links to anyone with the link with no warning or expiry. Later an unauthenticated download of the CAD file came from 203.0.113.91, which is outside Ridgeway's approved range. The link was public, so anyone who had it could download. Dev's heavy access, Elena's USB copy of slides, the maintenance badge entry and the denied SSH attempts are unrelated. I cannot determine who used 203.0.113.91 or how the link reached them, and the preview only resembles the drawing, so it does not prove the source.",
      supportingEvidenceIds: ['B-02', 'B-03', 'B-04', 'B-06', 'B-05', 'B-07', 'B-08', 'B-13'],
      timeline: ['b-e2', 'b-e4', 'b-e5', 'b-e7', 'b-e8'],
      alternatives:
        'A deliberate leak by Tomas is not supported: he sent the link to the vendor as requested. The vendor may have forwarded the link but I have no evidence. An external breach of the file server is unlikely because the downloads used the public link, not server access. USB copying involved a different file and Dev\'s access is normal.',
      confidence: 72,
      actionIds: ['b-a1', 'b-a2', 'b-a3', 'b-a4', 'b-a5', 'b-a6', 'b-a7', 'b-a8'],
      actionNotes: 'Disable the link first, preserve logs, then fix defaults and involve counsel.',
    },
    partial: {
      verdictId: 'misconfigured_share',
      conclusion: 'Tomas shared the files with a public link and someone outside the company then downloaded the CAD file from a different IP address.',
      supportingEvidenceIds: ['B-02', 'B-04', 'B-09'],
      timeline: ['b-e4', 'b-e7'],
      alternatives: '',
      confidence: 95,
      actionIds: ['b-a1', 'b-a3'],
      actionNotes: '',
    },
    partialMin: 40,
    partialMax: 75,
    wrong: {
      verdictId: 'malicious_insider',
      conclusion: 'Tomas deliberately leaked the blueprint to a competitor because he made the public link and the file got out.',
      supportingEvidenceIds: ['B-09', 'B-10', 'B-11'],
      timeline: ['b-e1', 'b-e3', 'b-e6'],
      alternatives: '',
      confidence: 100,
      actionIds: ['b-a10', 'b-a11', 'b-a12'],
      actionNotes: '',
    },
  },
  'case-phantom-login': {
    model: {
      verdictId: 'credential_phish',
      conclusion:
        "Priya's account was compromised through credential phishing. The email from a spoofed helpdesk domain failed SPF and DMARC and used urgency, and her browser then POSTed her password to the fake sign-in page. Later an external actor logged in over a legacy IMAP connection where MFA does not apply, created a forwarding rule to an outside address, and downloaded a finance workbook she had never used. Priya is a victim, not an insider. The password spray and the VPN login are unrelated noise: the spray came from a different IP and never succeeded, and the VPN login passed MFA on her enrolled phone. I cannot confirm who the attacker is or what they did with the data.",
      supportingEvidenceIds: ['P-01', 'P-02', 'P-03', 'P-06', 'P-04', 'P-07', 'P-08', 'P-09'],
      timeline: ['p-e2', 'p-e3', 'p-e5', 'p-e6', 'p-e7', 'p-e9'],
      alternatives:
        'Brute force or spraying was considered, but the spray never succeeded and came from a different IP. A legitimate VPN or hotspot login explains the 08:05 event but not the 03:12 login. An insider or malware explanation is not supported by anything in the record.',
      confidence: 85,
      actionIds: ['p-a1', 'p-a2', 'p-a3', 'p-a4', 'p-a5', 'p-a6', 'p-a7', 'p-a8'],
      actionNotes: 'Contain first, preserve the phishing email, then harden authentication.',
    },
    partial: {
      verdictId: 'credential_phish',
      conclusion: "The account was phished and someone used the stolen password to log in from another location, so Priya's account was taken over.",
      supportingEvidenceIds: ['P-01', 'P-03', 'P-05'],
      timeline: ['p-e2', 'p-e5'],
      alternatives: '',
      confidence: 100,
      actionIds: ['p-a1', 'p-a2'],
      actionNotes: '',
    },
    partialMin: 45,
    partialMax: 80,
    wrong: {
      verdictId: 'brute_force',
      conclusion: 'The attacker brute forced the password because there were many failed logins from the spray and then someone got in.',
      supportingEvidenceIds: ['P-05', 'P-10', 'P-11'],
      timeline: ['p-e4', 'p-e8'],
      alternatives: '',
      confidence: 100,
      actionIds: ['p-a10', 'p-a11', 'p-a12'],
      actionNotes: '',
    },
  },
};
