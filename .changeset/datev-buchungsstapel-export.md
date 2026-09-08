---
"@zemio/web": minor
"@zemio/api": minor
---

Export paid reports as a DATEV Buchungsstapel (EXTF-CSV, format version 13), so
a tax advisor can import a month's bookings instead of retyping them.

An organization configures what only its Kanzlei can supply — Berater- and
Mandantennummer, the start of the fiscal year, the Sachkontenlänge, SKR03 or
SKR04, and one expense account per expense type plus the contra account — under
Settings › DATEV export. Nothing is defaulted: a made-up Sachkonto reaches the
Kanzlei looking like a deliberate one. The export refuses to run while anything
is missing and names the fields rather than writing placeholders.

Receipts now state the input tax they carry (19 %, 7 %, or none). It is required
and deliberately not preselected, because 19 % assumed on a reduced-rate receipt
is a wrong deduction claimed in the customer's name — and a paid report can
never be corrected. Travel and meal allowances are not asked: a Pauschale has no
invoice behind it and carries no input tax.

The stated rate is shown wherever an expense is read — in the submitter's own
list and in the reviewer's table — and can be corrected while the report is
still a draft. Paying a report freezes it, so that draft is the only window
there is, and a correction is recorded in the report's history.

Admins pick a month under Admin › DATEV export, see what it would contain, and
build the file. A report enters exactly one export; every file stays downloadable
afterwards, since the reports it covered can never be exported again.

"Exportiert von" carries the exporter's name rather than their user id, folded
to the only characters DATEV's header field 9 accepts — `Jürgen Müller` reaches
the Kanzlei as `JuergenMueller`, not as a cuid.

An expense's history no longer loses a date change. Days and the input tax rate
were absent from the recorded diff, and since an empty diff counted as "nothing
changed", an edit that moved only a date wrote no entry at all.

Expense dates become calendar days (`@db.Date`). They were written as local
midnight and read back with UTC getters in one place and local ones in another,
so on a host east of UTC the PDF and the export disagreed by a day. Existing
rows are rounded to the nearest midnight, which recovers the intended day
whatever timezone wrote them.
