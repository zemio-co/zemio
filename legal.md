1. Christoph Langer, trading as Zemio
2. invoice on request, custom arrangements, customers should only be able to be terminated at the end of each billing period
3. yes, use German law and Münster venue
4. use a
5. use your provided recommendations
6. yes, they should be able to export their data
7. in most cases it will be the student initiative itsel or a representative. student initiatives in germany are mostly e.V.s
8. Users with any microsoft tenant can log in, but they will see a screen saying that no organization is available for them if an admin hast set up an org for them before.
9. Use better stack only
10. only the imprint

1. What exact name should appear as provider name in the documents?
     Right now I only have your personal name. Should the provider be:
     Christoph Langer, trading as Zemio
     or something else?
  2. What billing model should the Terms use?
     I need one concrete rule:
     a) monthly subscription per organization
     b) yearly subscription per organization
     c) invoice on request / custom arrangement
     Also: can you terminate customers at any time, or only for cause / end of billing period?
  3. Do you want German law and German courts in the Terms?
     Given the target group, my default would be German law and Münster venue, but I want you to
     confirm.
  4. What support commitment do you want to promise?
     Pick one:
     a) best effort, no guaranteed response times
     b) informal target like 5 business days
     c) stricter SLA
     If you don’t care, I’ll default to a).
  5. I need baseline retention rules. My recommended defaults are:

  - account data: while account exists, then 30 days soft-delete window, then delete unless legal
    need remains
  - session/auth logs: 90 days
  - invitations: 180 days after expiry
  - reports and attachments: for contract term plus 12 months after termination, unless customer
    requests earlier deletion and no legal hold applies
  - banking details: while needed for reports, then delete with account or earlier on request
    unless linked to retained reports
  - backups: 30 days
  - operational monitoring logs: 30 days
    Use these, or give your own.

  6. Do you want customers to be able to export their data before termination?
     If yes, I’ll include a short export/cooperation clause.
  7. Who is the customer legally?
     The student initiative itself, a university chair, an association (e.V.), or whoever orders
     the service? If unclear, I’ll define “Customer” broadly as the organization represented by
     the person registering.
  8. For Microsoft login: should access be restricted to approved domains/tenants only, or can
     any Microsoft account log in once invited?
     This affects the privacy and security wording.
  9. Confirm the monitoring vendor name.
     You wrote “Better Stack (uses Sentry SDK)”. Do you want the docs to name:
     Better Stack
     or Sentry
     or both because traffic may flow through both?
     If unsure, I’ll draft conservatively and say “Better Stack and/or Sentry-based error
     monitoring, depending on final production setup”.
  10. Do you want an Impressum only, or also a separate Contact / Legal Notice section inside the
     app footer?
     If you don’t care, I’ll just draft the Impressum.