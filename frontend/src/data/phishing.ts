import type { PhishingEmail, PhishingIndicator } from '@/types';
import { f } from './cases/helpers';

// FICTIONAL TRAINING EMAILS. Domains use the reserved ".example" TLD. Link destinations are
// defanged text ("hxxps", "[.]") and are NEVER rendered as clickable links. No attachment is real.

export const INDICATOR_CATALOG: PhishingIndicator[] = [
  { id: 'display_mismatch', label: 'Display name does not match the sender address', explanation: 'Anyone can set a friendly display name. Always read the actual address behind it.' },
  { id: 'odd_domain', label: 'Look-alike or unusual sender domain', explanation: 'Attackers register domains that resemble the real one (extra words, hyphens, swapped letters).' },
  { id: 'auth_fail', label: 'Email authentication failed (SPF / DKIM / DMARC)', explanation: 'Failing checks mean the sending server was not authorised to send for that domain. A pass does not prove safety, but a fail is a strong warning.' },
  { id: 'reply_to', label: 'Reply-To differs from the sender', explanation: 'Replies are quietly routed to a different mailbox or domain controlled by the attacker.' },
  { id: 'urgency', label: 'Artificial urgency or threats', explanation: 'Deadlines and threats push people to act before thinking.' },
  { id: 'link_mismatch', label: 'Link text does not match the real destination', explanation: 'What a link says and where it goes can differ. Inspect the real target before trusting it.' },
  { id: 'unexpected_attachment', label: 'Unexpected attachment or macro-enabled file', explanation: 'Unexpected files, especially macro-enabled Office documents, are a common malware route.' },
  { id: 'credential_request', label: 'Asks for credentials, codes or payment details', explanation: 'Legitimate organisations rarely ask you to confirm credentials or send codes by email.' },
  { id: 'generic_greeting', label: 'Generic or impersonal greeting', explanation: 'Mass-mailed messages often address "Dear Customer" because they do not know who you are.' },
  { id: 'changed_details', label: 'Changed bank or payment details', explanation: 'Requests to change payment details are a classic fraud pattern and must be verified out of band.' },
  { id: 'unusual_request', label: 'Unusual request for this sender', explanation: 'A request that does not fit the sender\'s normal behaviour deserves verification.' },
  { id: 'secrecy_pressure', label: 'Pressure to keep it secret or bypass process', explanation: '"Keep this between us" is designed to stop you from checking with anyone.' },
];

const ind = (id: string, explanation?: string): PhishingIndicator => {
  const base = INDICATOR_CATALOG.find((i) => i.id === id);
  if (!base) throw new Error(`Unknown indicator ${id}`);
  return { ...base, explanation: explanation ?? base.explanation };
};

export const PHISHING_EMAILS: PhishingEmail[] = [
  {
    id: 'ph-1',
    subject: 'Security alert: unusual sign-in blocked — confirm within 24 hours',
    fromName: 'Harbor Trust Security',
    fromAddress: 'alerts@harbortrust-secure.example',
    replyTo: 'case-desk@harbortrust-support.example',
    to: 'you@mail.example',
    date: 'Tue 14 Jul 2026 07:12 UTC',
    headers: [
      f('Authentication-Results', 'spf=fail; dkim=none; dmarc=fail', 'a'),
      f('Received', 'from mx3.bulk-sender.example (192.0.2.88)', 'a'),
      f('Return-Path', 'bounce@harbortrust-secure.example'),
    ],
    body:
      'Dear Customer,\n\nWe blocked an unusual sign-in to your account. To keep your account safe you must confirm your details within 24 hours or your online access will be limited.\n\n[ Confirm my account ]\n\nThank you,\nHarbor Trust Security Team',
    links: [{ text: 'https://www.harbortrust.example/secure/confirm', target: 'hxxps://harbortrust-secure[.]example/login?ref=confirm' }],
    attachments: [],
    classification: 'phishing',
    indicators: [
      ind('odd_domain', 'The real bank domain would be harbortrust.example. This one adds "-secure", a typical look-alike trick.'),
      ind('auth_fail'),
      ind('reply_to'),
      ind('urgency'),
      ind('link_mismatch', 'The visible text shows a harbortrust.example address, but the real target is harbortrust-secure[.]example.'),
      ind('credential_request'),
      ind('generic_greeting'),
    ],
    explanation:
      'Textbook credential phishing: a look-alike domain, failed authentication, a Reply-To on yet another domain, a 24-hour threat, a link whose text hides its real target, and a request to "confirm your details". Safe response: do not click, report it, and sign in to the bank by typing its address yourself.',
    reasoningKeywords: [['domain', 'sender', 'address', 'look-alike', 'lookalike', 'spoof'], ['link', 'url', 'destination', 'target', 'mismatch'], ['urgent', 'urgency', '24 hours', 'threat', 'pressure']],
  },
  {
    id: 'ph-2',
    subject: 'Planned maintenance: Saturday 02:00–04:00 UTC',
    fromName: 'Northwind IT Notices',
    fromAddress: 'it-notices@northwind-analytics.example',
    to: 'staff-all@northwind-analytics.example',
    date: 'Wed 15 Jul 2026 09:00 UTC',
    headers: [
      f('Authentication-Results', 'spf=pass; dkim=pass; dmarc=pass', 'ok'),
      f('Received', 'from mail.northwind-analytics.example (192.0.2.10)', 'ok'),
    ],
    body:
      'Hello team,\n\nThe file servers will be unavailable for a short planned maintenance window on Saturday between 02:00 and 04:00 UTC. No action is required from you.\n\nThe full schedule is on the intranet under IT > Maintenance.\n\n[ Maintenance schedule ]\n\nIT Service Desk',
    links: [{ text: 'https://intranet.northwind-analytics.example/it/maintenance', target: 'https://intranet.northwind-analytics.example/it/maintenance' }],
    attachments: [],
    classification: 'legitimate',
    indicators: [],
    explanation:
      'Every signal lines up: the sender domain is the company\'s own, SPF/DKIM/DMARC pass, the link text matches its real target, nothing is requested, there is no urgency and no attachment. Even so, the safest habit is to reach the intranet yourself rather than via an email link.',
    reasoningKeywords: [['domain', 'sender', 'address', 'internal'], ['spf', 'dkim', 'dmarc', 'authentication', 'pass'], ['no action', 'nothing', 'no request', 'no urgency', 'matches']],
  },
  {
    id: 'ph-3',
    subject: 'Updated remittance details for invoice 2291',
    fromName: 'Accounts — Brightline Supplies',
    fromAddress: 'accounts@brightline-supplies.example',
    replyTo: 'accounts-team@brightline-supplies.example',
    to: 'payables@northwind-analytics.example',
    date: 'Thu 16 Jul 2026 15:48 UTC',
    headers: [
      f('Authentication-Results', 'spf=pass; dkim=pass; dmarc=pass', 'ok'),
      f('Received', 'from smtp.brightline-supplies.example (198.51.100.41)', 'ok'),
    ],
    body:
      'Hello,\n\nPlease note that our bank details have changed with effect from this month. The updated remittance information is in the attached invoice. Kindly settle invoice 2291 by Friday using the new account.\n\nRegards,\nAccounts Team\nBrightline Supplies',
    links: [],
    attachments: ['Invoice_2291.pdf'],
    classification: 'suspicious',
    indicators: [
      ind('changed_details', 'A change of bank details is the single most common sign of invoice fraud, including from genuinely hacked supplier mailboxes.'),
      ind('unusual_request', 'Suppliers rarely change bank details by email without a prior notice.'),
      ind('urgency', 'A "by Friday" deadline attached to new details is a mild pressure signal.'),
    ],
    explanation:
      'This one is deliberately ambiguous. Authentication passes and the domain is correct, so it may be genuine. But a bank-detail change with a deadline is exactly what a compromised supplier mailbox would send. It is not provably phishing, and it is not safe to act on. The right move is to verify by phone using a number you already hold, not one from this email.',
    reasoningKeywords: [['bank', 'payment', 'remittance', 'details'], ['verify', 'call', 'phone', 'confirm', 'out of band', 'callback'], ['authentication', 'pass', 'spf', 'dkim', 'genuine', 'compromised']],
  },
  {
    id: 'ph-4',
    subject: 'Shared with you: Q3 salary review',
    fromName: 'Rahul Mehta (HR)',
    fromAddress: 'rahul.mehta.hr@docs-share-center.example',
    to: 'pnair@northwind-analytics.example',
    date: 'Fri 17 Jul 2026 11:20 UTC',
    headers: [
      f('Authentication-Results', 'spf=softfail; dkim=none; dmarc=fail', 'a'),
      f('Received', 'from relay.docs-share-center.example (203.0.113.60)', 'a'),
    ],
    body:
      'Hi,\n\nSharing the Q3 salary review for your team. Please open the attached workbook and click "Enable editing" and "Enable content" so the figures display correctly.\n\nRahul',
    links: [],
    attachments: ['Q3_Salary_Review.xlsm'],
    classification: 'phishing',
    indicators: [
      ind('display_mismatch', 'The display name says HR, but the address belongs to an outside file-sharing domain.'),
      ind('odd_domain'),
      ind('auth_fail'),
      ind('unexpected_attachment', 'A macro-enabled workbook (.xlsm) that asks you to enable content is a classic malware delivery method.'),
      ind('unusual_request', 'Real HR teams do not ask staff to enable macros to read a salary file.'),
    ],
    explanation:
      'The bait (salary information) is designed to make you curious. The sender is an outside domain dressed up with an internal name, authentication fails, and the instructions to enable editing and content are how macro malware gets permission to run. Do not open the file. Report it.',
    reasoningKeywords: [['hr', 'display', 'name', 'sender', 'domain', 'external'], ['attachment', 'macro', 'xlsm', 'enable'], ['spf', 'dkim', 'dmarc', 'authentication', 'fail']],
  },
  {
    id: 'ph-5',
    subject: 'Invitation: Sprint review, Thursday 10:00 UTC',
    fromName: 'Meera Joshi',
    fromAddress: 'meera.joshi@northwind-analytics.example',
    to: 'team-platform@northwind-analytics.example',
    date: 'Mon 20 Jul 2026 13:05 UTC',
    headers: [
      f('Authentication-Results', 'spf=pass; dkim=pass; dmarc=pass', 'ok'),
      f('Received', 'from mail.northwind-analytics.example (192.0.2.10)', 'ok'),
    ],
    body:
      'Hi all,\n\nSprint review is on Thursday at 10:00 UTC. Agenda is in the team notes. The meeting link is below and in the calendar invite.\n\n[ Join meeting ]\n\nMeera',
    links: [{ text: 'https://meet.northwind-analytics.example/room/sprint-review', target: 'https://meet.northwind-analytics.example/room/sprint-review' }],
    attachments: ['invite.ics'],
    classification: 'legitimate',
    indicators: [],
    explanation:
      'Known colleague on the company domain, authentication passes, the link text matches the real company meeting domain, and the only attachment is a standard calendar file that fits the message. Nothing is asked of you beyond attending.',
    reasoningKeywords: [['colleague', 'internal', 'domain', 'sender', 'known'], ['spf', 'dkim', 'dmarc', 'authentication', 'pass'], ['link', 'matches', 'calendar', 'invite']],
  },
  {
    id: 'ph-6',
    subject: 'Quick favour — are you at your desk?',
    fromName: 'Dr. Anita Okafor',
    fromAddress: 'anita.okafor.ceo@freemail-service.example',
    replyTo: 'anita.okafor.ceo@freemail-service.example',
    to: 'dwhitfield@lakeview-dental.example',
    date: 'Tue 21 Jul 2026 06:55 UTC',
    headers: [
      f('Authentication-Results', 'spf=pass (freemail-service.example); dkim=pass; dmarc=pass', 'a'),
      f('Received', 'from web.freemail-service.example (198.51.100.150)', 'a'),
    ],
    body:
      'Dana,\n\nI\'m stuck in a meeting and can\'t take calls. I need you to buy 5 gift cards (100 each) for clients and email me the codes today. Please keep this between us for now, I\'ll reimburse you tonight.\n\nAnita',
    links: [],
    attachments: [],
    classification: 'phishing',
    indicators: [
      ind('display_mismatch', 'A practice owner would use the practice domain, not a free webmail address.'),
      ind('odd_domain', 'Authentication "passes" only for the free-mail provider\'s own domain, which says nothing about who the person is.'),
      ind('urgency', '"Today", "stuck in a meeting", "can\'t take calls": built to stop you verifying.'),
      ind('credential_request', 'Gift-card codes are cash. Asking for them by email is a hallmark of fraud.'),
      ind('unusual_request'),
      ind('secrecy_pressure'),
    ],
    explanation:
      'An impersonation ("business email compromise" style) scam. Authentication passes, but only for a free webmail domain the scammer registered. Gift cards, urgency, unavailability by phone and secrecy are the giveaways. Safe response: call the real person on a known number and report the message.',
    reasoningKeywords: [['gift card', 'gift cards', 'codes', 'payment'], ['free', 'webmail', 'personal', 'domain', 'display', 'name', 'impersonat'], ['secret', 'urgent', 'urgency', 'verify', 'call', 'meeting']],
  },
  {
    id: 'ph-7',
    subject: 'Last chance: 70% off cloud storage ends tonight',
    fromName: 'CloudNest Deals',
    fromAddress: 'deals@cloudnest-mail.example',
    to: 'you@mail.example',
    date: 'Wed 22 Jul 2026 16:30 UTC',
    headers: [
      f('Authentication-Results', 'spf=pass; dkim=pass; dmarc=pass', 'ok'),
      f('List-Unsubscribe', 'Not present', 'a'),
      f('Received', 'from bulk.cloudnest-mail.example (198.51.100.220)', 'ok'),
    ],
    body:
      'Hi there,\n\nOur biggest sale of the year ends tonight. Get 70% off your first year of cloud storage.\n\n[ Claim my discount ]\n\nYou are receiving this message because of your account preferences.',
    links: [{ text: 'https://www.cloudnest.example/offer', target: 'https://cloudnest-mail.example/track?u=8841&r=offer' }],
    attachments: [],
    classification: 'suspicious',
    indicators: [
      ind('urgency', 'A "ends tonight" deadline is standard marketing pressure, and also phishing pressure.'),
      ind('link_mismatch', 'The link goes via a tracking domain rather than the brand\'s own site. Common in marketing mail, but also a way to hide a destination.'),
      ind('generic_greeting'),
    ],
    explanation:
      'Probably unsolicited marketing rather than an attack: authentication passes and nothing asks for credentials. But it uses urgency, a redirecting link and no unsubscribe option, so it should not be trusted blindly. Do not click the link. If you want the offer, type the company\'s address yourself.',
    reasoningKeywords: [['marketing', 'promotion', 'sale', 'unsolicited', 'spam'], ['link', 'tracking', 'redirect', 'mismatch'], ['urgent', 'urgency', 'tonight', 'deadline', 'unsubscribe']],
  },
];
