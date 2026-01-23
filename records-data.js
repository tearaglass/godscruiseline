export const records = [
  {
    id: "GC-R-000",
    title: "System Charter",
    division: "access",
    medium: "system",
    year: 2026,
    status: "public",
    content: `
The Gods Cruiseline Information System exists to maintain continuity,
record decisions, preserve artifacts, and regulate access.

This system does not promise transparency.
It promises consistency.

Records may be incomplete.
Archives may decay.
Access may be revoked.

Participation constitutes acknowledgment.
`
  },
  {
    id: "GC-R-001",
    title: "Broadcast Protocol v1",
    division: "broadcast",
    medium: "system",
    year: 2024,
    status: "public",
    project: "signal-architecture",
    content: `
Standard operating procedures for signal distribution.

1. All transmissions are logged.
2. Public notices require clearance review before release.
3. Official transmissions carry a verification hash.
4. Retransmission without authorization is prohibited.

Protocol subject to revision without notice.
`
  },
  {
    id: "GC-R-002",
    title: "Works Registry Guidelines",
    division: "works",
    medium: "text",
    year: 2025,
    status: "registered",
    content: `
Guidelines for registering works within the system.

All creative output must be cataloged before distribution.
Asset stewardship remains with the originator unless transferred.
Release protocols vary by medium and intended audience.

Works without registry entries are considered unratified.
`
  },
  {
    id: "GC-R-003",
    title: "Field Notes: Terminal Migration",
    division: "research",
    medium: "text",
    year: 2025,
    status: "registered",
    project: "terminal-ops",
    content: `
Documentation of the system migration to current architecture.

Previous infrastructure was deprecated due to maintenance burden.
New terminal operates on static principles with localStorage persistence.
Annotation capabilities added for witness-level participants.

Migration considered complete. Legacy references archived.
`
  },
  {
    id: "GC-R-004",
    title: "Continuity Ledger: 2020-2024",
    division: "narrative",
    medium: "dataset",
    year: 2024,
    status: "authorized",
    project: "continuity-ledger",
    archival: {
      state: "archived",
      since: 2025,
      note: "Superseded by active ledger. Retained for historical reference."
    }
  },
  {
    id: "GC-R-005",
    title: "Exchange Agreement Template",
    division: "exchange",
    medium: "text",
    year: 2026,
    status: "authorized",
    content: `
Standard template for partner access agreements.

Terms include: access duration, permitted use, attribution requirements,
and termination conditions.

All agreements require countersignature before activation.
`
  },
  {
    id: "GC-R-006",
    title: "Clearance Audit: Q4 2025",
    division: "access",
    medium: "dataset",
    year: 2025,
    status: "restricted"
  },
  {
    id: "GC-R-007",
    title: "Signal Test Transmission",
    division: "broadcast",
    medium: "audio",
    year: 2023,
    status: "public",
    project: "signal-architecture",
    archival: {
      state: "decayed",
      since: 2024,
      note: "Source media degraded. Metadata preserved."
    }
  },
  {
    id: "GC-R-008",
    title: "Research Index: Methodology Standards",
    division: "research",
    medium: "text",
    year: 2026,
    status: "registered",
    content: `
Standards for internal research documentation.

All studies must include: scope, methodology, findings, and limitations.
Field documentation follows separate protocols.
Internal publications require peer notation before filing.

Standards apply retroactively to unfiled research.
`
  },
  {
    id: "GC-R-009",
    title: "Narrative Style Guide",
    division: "narrative",
    medium: "text",
    year: 2026,
    status: "public",
    project: "continuity-ledger",
    content: `
Editorial standards for historical accounts and continuity records.

Tone: Neutral, factual, without embellishment.
Attribution: Required for all quoted material.
Revision: Changes must be logged, not overwritten.

Consistency over transparency. Accuracy over speed.
`
  },
  {
    id: "GC-R-010",
    title: "Partner Access Log: 2025",
    division: "exchange",
    medium: "dataset",
    year: 2025,
    status: "restricted"
  }
];
