// Plain-language definitions used for tooltips and the assistant's "explain a term" action.
// Definitions are educational and contain no operational attack instructions.

export interface GlossaryEntry {
  term: string;
  definition: string;
  aliases?: string[];
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Phishing', definition: 'A message that pretends to be from a trusted sender to trick you into revealing information, clicking a link or opening a file.' },
  { term: 'Credential phishing', definition: 'Phishing that aims to capture usernames and passwords, usually through a fake sign-in page.', aliases: ['credential harvesting'] },
  { term: 'Spoofing', definition: 'Forging the apparent sender of a message (or the origin of network traffic) so it looks like it came from someone else.', aliases: ['spoof', 'spoofed'] },
  { term: 'SPF', definition: 'Sender Policy Framework: a DNS record listing which servers may send email for a domain. A failure means the sending server was not on the list.' },
  { term: 'DKIM', definition: 'DomainKeys Identified Mail: a cryptographic signature added to email so receivers can check it was authorised by the domain and not altered.' },
  { term: 'DMARC', definition: 'A policy that tells receivers what to do when SPF/DKIM checks fail and that the visible From address matches the authenticated domain.' },
  { term: 'MFA', definition: 'Multi-factor authentication: requiring something extra beyond a password (a phone prompt, security key or code) to sign in.', aliases: ['2fa', 'multi-factor authentication', 'two-factor'] },
  { term: 'Legacy authentication', definition: 'Older sign-in methods (such as basic-auth IMAP/POP) that often cannot prompt for MFA, so a stolen password alone can work.', aliases: ['basic auth', 'legacy protocol'] },
  { term: 'Baseline', definition: 'A picture of what is normal for a user, device or system. Anomalies are deviations from the baseline.' },
  { term: 'Anomaly', definition: 'Activity that differs from the baseline. Unusual is not automatically malicious, so it needs context.' },
  { term: 'False positive', definition: 'An alert or finding that looks suspicious but turns out to be harmless.' },
  { term: 'Red herring', definition: 'A clue that looks important but leads nowhere. Good investigators test every lead before treating it as evidence.' },
  { term: 'Indicator of compromise', definition: 'A piece of evidence (an IP, file name, behaviour or log pattern) suggesting a system may have been breached.', aliases: ['ioc'] },
  { term: 'Account takeover', definition: 'When someone other than the owner gains control of an account, often using stolen or guessed credentials.', aliases: ['account compromise'] },
  { term: 'Password spraying', definition: 'Trying a few common passwords against many accounts to avoid lockouts. Many failures across many users from one source is a typical pattern.', aliases: ['spray', 'password spray'] },
  { term: 'Brute force', definition: 'Repeatedly guessing passwords for a single account until one works.', aliases: ['brute-force'] },
  { term: 'Persistence', definition: 'Ways an intruder keeps access after the first break-in, such as mailbox forwarding rules or scheduled tasks.' },
  { term: 'Mailbox rule', definition: 'An automatic email instruction (like forwarding or deleting). Attackers abuse them to quietly read or hide messages.', aliases: ['inbox rule', 'forwarding rule'] },
  { term: 'Lateral movement', definition: 'An intruder moving from one compromised system to others inside a network.' },
  { term: 'Privilege escalation', definition: 'Gaining higher access rights than originally had, for example becoming an administrator.', aliases: ['privilege'] },
  { term: 'Exfiltration', definition: 'Unauthorised transfer of data out of an organisation.', aliases: ['data exfiltration', 'data theft'] },
  { term: 'Egress', definition: 'Traffic leaving a network. Egress logs help show whether data left the organisation.' },
  { term: 'DLP', definition: 'Data loss prevention: tools that detect or block sensitive data being moved or shared inappropriately.', aliases: ['data loss prevention'] },
  { term: 'EDR', definition: 'Endpoint detection and response: software that monitors computers for suspicious behaviour and can alert or block it.', aliases: ['endpoint detection'] },
  { term: 'SIEM', definition: 'Security information and event management: a system that collects logs from many sources so analysts can search and correlate them.' },
  { term: 'SOC', definition: 'Security operations centre: the team that monitors alerts and responds to incidents.' },
  { term: 'Ransomware', definition: 'Malware that encrypts files and demands payment for recovery. Often combined with data theft.' },
  { term: 'Offline backup', definition: 'A backup disconnected from the network so attackers cannot reach it. It is the last line of defence against ransomware.', aliases: ['air-gapped backup'] },
  { term: 'Containment', definition: 'Limiting the spread and impact of an incident, such as isolating a computer or disabling an account.' },
  { term: 'Eradication', definition: 'Removing the attacker\'s access and artefacts from the environment.' },
  { term: 'Chain of custody', definition: 'A record of who handled evidence and when, so it can be trusted later.' },
  { term: 'Evidence preservation', definition: 'Capturing and protecting logs, images and messages before they are changed or deleted.', aliases: ['preserve'] },
  { term: 'Hypothesis', definition: 'A testable explanation for what happened. Investigators compare competing hypotheses against the evidence.' },
  { term: 'Confirmation bias', definition: 'Favouring evidence that fits what you already believe and discounting evidence that does not.' },
  { term: 'Anchoring', definition: 'Over-weighting the first piece of information you see, such as an early accusation.' },
  { term: 'Insider threat', definition: 'Risk from someone with legitimate access, either through malice or (more often) through mistakes.' },
  { term: 'Least privilege', definition: 'Giving accounts only the access they need and nothing more.' },
  { term: 'Service account', definition: 'A non-human account used by software or vendors. They often have broad rights and old passwords, which makes them attractive targets.' },
  { term: 'VPN', definition: 'Virtual private network: an encrypted connection into a private network from outside.' },
  { term: 'Sharing link', definition: 'A web address that grants access to a file. "Anyone with the link" means no sign-in is needed.', aliases: ['public link', 'anyone link'] },
  { term: 'Sensitivity label', definition: 'A tag (such as Confidential) attached to a document so tools and people know how to handle it.' },
  { term: 'Out-of-band verification', definition: 'Checking a request through a separate, trusted channel (for example calling a known number) instead of replying to the message itself.', aliases: ['callback verification', 'out of band'] },
  { term: 'Timeline', definition: 'An ordered reconstruction of events. Building one often reveals gaps and contradictions.' },
  { term: 'Corroboration', definition: 'Independent evidence that supports the same conclusion. Two separate logs agreeing is stronger than one.' },
  { term: 'Defanged', definition: 'A link or address deliberately altered (for example hxxps and [.]) so it cannot be clicked by accident.', aliases: ['defang'] },
];

export function findTerm(query: string): GlossaryEntry | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return (
    GLOSSARY.find((g) => g.term.toLowerCase() === q || g.aliases?.some((a) => a.toLowerCase() === q)) ??
    GLOSSARY.find((g) => g.term.toLowerCase().includes(q) || g.aliases?.some((a) => a.toLowerCase().includes(q)))
  );
}
