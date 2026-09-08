/**
 * The 125 columns of a DATEV-Format Buchungsstapel, in DATEV's order.
 *
 * Column names come from the heading row of DATEV's official sample file;
 * the quoting per column follows the FormatType in
 * `Format_Buchungsstapel.xml` (Version 13) shipped with the DATEV-Format
 * Pruefprogramm 2.2.3.0. Every data row carries all 125 positions; the ones
 * we do not fill are written empty.
 *
 * Generated from those two sources - do not edit by hand.
 */
export const COLUMNS = [
	"Umsatz (ohne Soll/Haben-Kz)", // 1
	"Soll/Haben-Kennzeichen", // 2
	"WKZ Umsatz", // 3
	"Kurs", // 4
	"Basis-Umsatz", // 5
	"WKZ Basis-Umsatz", // 6
	"Konto", // 7
	"Gegenkonto (ohne BU-Schlüssel)", // 8
	"BU-Schlüssel", // 9
	"Belegdatum", // 10
	"Belegfeld 1", // 11
	"Belegfeld 2", // 12
	"Skonto", // 13
	"Buchungstext", // 14
	"Postensperre", // 15
	"Diverse Adressnummer", // 16
	"Geschäftspartnerbank", // 17
	"Sachverhalt", // 18
	"Zinssperre", // 19
	"Beleglink", // 20
	"Beleginfo - Art 1", // 21
	"Beleginfo - Inhalt 1", // 22
	"Beleginfo - Art 2", // 23
	"Beleginfo - Inhalt 2", // 24
	"Beleginfo - Art 3", // 25
	"Beleginfo - Inhalt 3", // 26
	"Beleginfo - Art 4", // 27
	"Beleginfo - Inhalt 4", // 28
	"Beleginfo - Art 5", // 29
	"Beleginfo - Inhalt 5", // 30
	"Beleginfo - Art 6", // 31
	"Beleginfo - Inhalt 6", // 32
	"Beleginfo - Art 7", // 33
	"Beleginfo - Inhalt 7", // 34
	"Beleginfo - Art 8", // 35
	"Beleginfo - Inhalt 8", // 36
	"KOST1 - Kostenstelle", // 37
	"KOST2 - Kostenstelle", // 38
	"Kost-Menge", // 39
	"EU-Land u. UStID (Bestimmung)", // 40
	"EU-Steuersatz (Bestimmung)", // 41
	"Abw. Versteuerungsart", // 42
	"Sachverhalt L+L", // 43
	"Funktionsergänzung L+L", // 44
	"BU 49 Hauptfunktionstyp", // 45
	"BU 49 Hauptfunktionsnummer", // 46
	"BU 49 Funktionsergänzung", // 47
	"Zusatzinformation - Art 1", // 48
	"Zusatzinformation- Inhalt 1", // 49
	"Zusatzinformation - Art 2", // 50
	"Zusatzinformation- Inhalt 2", // 51
	"Zusatzinformation - Art 3", // 52
	"Zusatzinformation- Inhalt 3", // 53
	"Zusatzinformation - Art 4", // 54
	"Zusatzinformation- Inhalt 4", // 55
	"Zusatzinformation - Art 5", // 56
	"Zusatzinformation- Inhalt 5", // 57
	"Zusatzinformation - Art 6", // 58
	"Zusatzinformation- Inhalt 6", // 59
	"Zusatzinformation - Art 7", // 60
	"Zusatzinformation- Inhalt 7", // 61
	"Zusatzinformation - Art 8", // 62
	"Zusatzinformation- Inhalt 8", // 63
	"Zusatzinformation - Art 9", // 64
	"Zusatzinformation- Inhalt 9", // 65
	"Zusatzinformation - Art 10", // 66
	"Zusatzinformation- Inhalt 10", // 67
	"Zusatzinformation - Art 11", // 68
	"Zusatzinformation- Inhalt 11", // 69
	"Zusatzinformation - Art 12", // 70
	"Zusatzinformation- Inhalt 12", // 71
	"Zusatzinformation - Art 13", // 72
	"Zusatzinformation- Inhalt 13", // 73
	"Zusatzinformation - Art 14", // 74
	"Zusatzinformation- Inhalt 14", // 75
	"Zusatzinformation - Art 15", // 76
	"Zusatzinformation- Inhalt 15", // 77
	"Zusatzinformation - Art 16", // 78
	"Zusatzinformation- Inhalt 16", // 79
	"Zusatzinformation - Art 17", // 80
	"Zusatzinformation- Inhalt 17", // 81
	"Zusatzinformation - Art 18", // 82
	"Zusatzinformation- Inhalt 18", // 83
	"Zusatzinformation - Art 19", // 84
	"Zusatzinformation- Inhalt 19", // 85
	"Zusatzinformation - Art 20", // 86
	"Zusatzinformation- Inhalt 20", // 87
	"Stück", // 88
	"Gewicht", // 89
	"Zahlweise", // 90
	"Forderungsart", // 91
	"Veranlagungsjahr", // 92
	"Zugeordnete Fälligkeit", // 93
	"Skontotyp", // 94
	"Auftragsnummer", // 95
	"Buchungstyp", // 96
	"USt-Schlüssel (Anzahlungen)", // 97
	"EU-Land (Anzahlungen)", // 98
	"Sachverhalt L+L (Anzahlungen)", // 99
	"EU-Steuersatz (Anzahlungen)", // 100
	"Erlöskonto (Anzahlungen)", // 101
	"Herkunft-Kz", // 102
	"Buchungs GUID", // 103
	"KOST-Datum", // 104
	"SEPA-Mandatsreferenz", // 105
	"Skontosperre", // 106
	"Gesellschaftername", // 107
	"Beteiligtennummer", // 108
	"Identifikationsnummer", // 109
	"Zeichnernummer", // 110
	"Postensperre bis", // 111
	"Bezeichnung SoBil-Sachverhalt", // 112
	"Kennzeichen SoBil-Buchung", // 113
	"Festschreibung", // 114
	"Leistungsdatum", // 115
	"Datum Zuord. Steuerperiode", // 116
	"Fälligkeit", // 117
	"Generalumkehr (GU)", // 118
	"Steuersatz", // 119
	"Land", // 120
	"Abrechnungsreferenz", // 121
	"BVV-Position", // 122
	"EU-Land u. UStID (Ursprung)", // 123
	"EU-Steuersatz (Ursprung)", // 124
	"Abw. Skontokonto", // 125
] as const;

export type Column = (typeof COLUMNS)[number];

/** True where DATEV expects the value wrapped in double quotes. */
export const QUOTED: readonly boolean[] = [
	false, // 1 Umsatz (ohne Soll/Haben-Kz) (Betrag)
	true, // 2 Soll/Haben-Kennzeichen (Text)
	true, // 3 WKZ Umsatz (Text)
	false, // 4 Kurs (Zahl)
	false, // 5 Basis-Umsatz (Betrag)
	true, // 6 WKZ Basis-Umsatz (Text)
	false, // 7 Konto (Konto)
	false, // 8 Gegenkonto (ohne BU-Schlüssel) (Konto)
	true, // 9 BU-Schlüssel (Text)
	false, // 10 Belegdatum (Datum)
	true, // 11 Belegfeld 1 (Text)
	true, // 12 Belegfeld 2 (Text)
	false, // 13 Skonto (Betrag)
	true, // 14 Buchungstext (Text)
	false, // 15 Postensperre (Zahl)
	true, // 16 Diverse Adressnummer (Text)
	false, // 17 Geschäftspartnerbank (Zahl)
	false, // 18 Sachverhalt (Zahl)
	false, // 19 Zinssperre (Zahl)
	true, // 20 Beleglink (Text)
	true, // 21 Beleginfo - Art 1 (Text)
	true, // 22 Beleginfo - Inhalt 1 (Text)
	true, // 23 Beleginfo - Art 2 (Text)
	true, // 24 Beleginfo - Inhalt 2 (Text)
	true, // 25 Beleginfo - Art 3 (Text)
	true, // 26 Beleginfo - Inhalt 3 (Text)
	true, // 27 Beleginfo - Art 4 (Text)
	true, // 28 Beleginfo - Inhalt 4 (Text)
	true, // 29 Beleginfo - Art 5 (Text)
	true, // 30 Beleginfo - Inhalt 5 (Text)
	true, // 31 Beleginfo - Art 6 (Text)
	true, // 32 Beleginfo - Inhalt 6 (Text)
	true, // 33 Beleginfo - Art 7 (Text)
	true, // 34 Beleginfo - Inhalt 7 (Text)
	true, // 35 Beleginfo - Art 8 (Text)
	true, // 36 Beleginfo - Inhalt 8 (Text)
	true, // 37 KOST1 - Kostenstelle (Text)
	true, // 38 KOST2 - Kostenstelle (Text)
	false, // 39 Kost-Menge (Zahl)
	true, // 40 EU-Land u. UStID (Bestimmung) (Text)
	false, // 41 EU-Steuersatz (Bestimmung) (Zahl)
	true, // 42 Abw. Versteuerungsart (Text)
	false, // 43 Sachverhalt L+L (Zahl)
	false, // 44 Funktionsergänzung L+L (Zahl)
	false, // 45 BU 49 Hauptfunktionstyp (Zahl)
	false, // 46 BU 49 Hauptfunktionsnummer (Zahl)
	false, // 47 BU 49 Funktionsergänzung (Zahl)
	true, // 48 Zusatzinformation - Art 1 (Text)
	true, // 49 Zusatzinformation- Inhalt 1 (Text)
	true, // 50 Zusatzinformation - Art 2 (Text)
	true, // 51 Zusatzinformation- Inhalt 2 (Text)
	true, // 52 Zusatzinformation - Art 3 (Text)
	true, // 53 Zusatzinformation- Inhalt 3 (Text)
	true, // 54 Zusatzinformation - Art 4 (Text)
	true, // 55 Zusatzinformation- Inhalt 4 (Text)
	true, // 56 Zusatzinformation - Art 5 (Text)
	true, // 57 Zusatzinformation- Inhalt 5 (Text)
	true, // 58 Zusatzinformation - Art 6 (Text)
	true, // 59 Zusatzinformation- Inhalt 6 (Text)
	true, // 60 Zusatzinformation - Art 7 (Text)
	true, // 61 Zusatzinformation- Inhalt 7 (Text)
	true, // 62 Zusatzinformation - Art 8 (Text)
	true, // 63 Zusatzinformation- Inhalt 8 (Text)
	true, // 64 Zusatzinformation - Art 9 (Text)
	true, // 65 Zusatzinformation- Inhalt 9 (Text)
	true, // 66 Zusatzinformation - Art 10 (Text)
	true, // 67 Zusatzinformation- Inhalt 10 (Text)
	true, // 68 Zusatzinformation - Art 11 (Text)
	true, // 69 Zusatzinformation- Inhalt 11 (Text)
	true, // 70 Zusatzinformation - Art 12 (Text)
	true, // 71 Zusatzinformation- Inhalt 12 (Text)
	true, // 72 Zusatzinformation - Art 13 (Text)
	true, // 73 Zusatzinformation- Inhalt 13 (Text)
	true, // 74 Zusatzinformation - Art 14 (Text)
	true, // 75 Zusatzinformation- Inhalt 14 (Text)
	true, // 76 Zusatzinformation - Art 15 (Text)
	true, // 77 Zusatzinformation- Inhalt 15 (Text)
	true, // 78 Zusatzinformation - Art 16 (Text)
	true, // 79 Zusatzinformation- Inhalt 16 (Text)
	true, // 80 Zusatzinformation - Art 17 (Text)
	true, // 81 Zusatzinformation- Inhalt 17 (Text)
	true, // 82 Zusatzinformation - Art 18 (Text)
	true, // 83 Zusatzinformation- Inhalt 18 (Text)
	true, // 84 Zusatzinformation - Art 19 (Text)
	true, // 85 Zusatzinformation- Inhalt 19 (Text)
	true, // 86 Zusatzinformation - Art 20 (Text)
	true, // 87 Zusatzinformation- Inhalt 20 (Text)
	false, // 88 Stück (Zahl)
	false, // 89 Gewicht (Zahl)
	false, // 90 Zahlweise (Zahl)
	true, // 91 Forderungsart (Text)
	false, // 92 Veranlagungsjahr (Zahl)
	false, // 93 Zugeordnete Fälligkeit (Datum)
	false, // 94 Skontotyp (Zahl)
	true, // 95 Auftragsnummer (Text)
	true, // 96 Buchungstyp (Text)
	false, // 97 USt-Schlüssel (Anzahlungen) (Zahl)
	true, // 98 EU-Land (Anzahlungen) (Text)
	false, // 99 Sachverhalt L+L (Anzahlungen) (Zahl)
	false, // 100 EU-Steuersatz (Anzahlungen) (Zahl)
	false, // 101 Erlöskonto (Anzahlungen) (Konto)
	true, // 102 Herkunft-Kz (Text)
	true, // 103 Buchungs GUID (Text)
	false, // 104 KOST-Datum (Datum)
	true, // 105 SEPA-Mandatsreferenz (Text)
	false, // 106 Skontosperre (Zahl)
	true, // 107 Gesellschaftername (Text)
	false, // 108 Beteiligtennummer (Zahl)
	true, // 109 Identifikationsnummer (Text)
	true, // 110 Zeichnernummer (Text)
	false, // 111 Postensperre bis (Datum)
	true, // 112 Bezeichnung SoBil-Sachverhalt (Text)
	false, // 113 Kennzeichen SoBil-Buchung (Zahl)
	false, // 114 Festschreibung (Zahl)
	false, // 115 Leistungsdatum (Datum)
	false, // 116 Datum Zuord. Steuerperiode (Datum)
	false, // 117 Fälligkeit (Datum)
	true, // 118 Generalumkehr (GU) (Text)
	false, // 119 Steuersatz (Zahl)
	true, // 120 Land (Text)
	true, // 121 Abrechnungsreferenz (Text)
	false, // 122 BVV-Position (Zahl)
	true, // 123 EU-Land u. UStID (Ursprung) (Text)
	false, // 124 EU-Steuersatz (Ursprung) (Zahl)
	false, // 125 Abw. Skontokonto (Konto)
];

/** Maximum length DATEV accepts, per column. */
export const MAX_LENGTH: readonly number[] = [
	10, // 1 Umsatz (ohne Soll/Haben-Kz)
	1, // 2 Soll/Haben-Kennzeichen
	3, // 3 WKZ Umsatz
	5, // 4 Kurs
	10, // 5 Basis-Umsatz
	3, // 6 WKZ Basis-Umsatz
	9, // 7 Konto
	9, // 8 Gegenkonto (ohne BU-Schlüssel)
	4, // 9 BU-Schlüssel
	8, // 10 Belegdatum
	36, // 11 Belegfeld 1
	12, // 12 Belegfeld 2
	8, // 13 Skonto
	60, // 14 Buchungstext
	1, // 15 Postensperre
	9, // 16 Diverse Adressnummer
	3, // 17 Geschäftspartnerbank
	2, // 18 Sachverhalt
	1, // 19 Zinssperre
	210, // 20 Beleglink
	20, // 21 Beleginfo - Art 1
	210, // 22 Beleginfo - Inhalt 1
	20, // 23 Beleginfo - Art 2
	210, // 24 Beleginfo - Inhalt 2
	20, // 25 Beleginfo - Art 3
	210, // 26 Beleginfo - Inhalt 3
	20, // 27 Beleginfo - Art 4
	210, // 28 Beleginfo - Inhalt 4
	20, // 29 Beleginfo - Art 5
	210, // 30 Beleginfo - Inhalt 5
	20, // 31 Beleginfo - Art 6
	210, // 32 Beleginfo - Inhalt 6
	20, // 33 Beleginfo - Art 7
	210, // 34 Beleginfo - Inhalt 7
	20, // 35 Beleginfo - Art 8
	210, // 36 Beleginfo - Inhalt 8
	36, // 37 KOST1 - Kostenstelle
	36, // 38 KOST2 - Kostenstelle
	12, // 39 Kost-Menge
	15, // 40 EU-Land u. UStID (Bestimmung)
	2, // 41 EU-Steuersatz (Bestimmung)
	1, // 42 Abw. Versteuerungsart
	3, // 43 Sachverhalt L+L
	3, // 44 Funktionsergänzung L+L
	1, // 45 BU 49 Hauptfunktionstyp
	2, // 46 BU 49 Hauptfunktionsnummer
	3, // 47 BU 49 Funktionsergänzung
	20, // 48 Zusatzinformation - Art 1
	210, // 49 Zusatzinformation- Inhalt 1
	20, // 50 Zusatzinformation - Art 2
	210, // 51 Zusatzinformation- Inhalt 2
	20, // 52 Zusatzinformation - Art 3
	210, // 53 Zusatzinformation- Inhalt 3
	20, // 54 Zusatzinformation - Art 4
	210, // 55 Zusatzinformation- Inhalt 4
	20, // 56 Zusatzinformation - Art 5
	210, // 57 Zusatzinformation- Inhalt 5
	20, // 58 Zusatzinformation - Art 6
	210, // 59 Zusatzinformation- Inhalt 6
	20, // 60 Zusatzinformation - Art 7
	210, // 61 Zusatzinformation- Inhalt 7
	20, // 62 Zusatzinformation - Art 8
	210, // 63 Zusatzinformation- Inhalt 8
	20, // 64 Zusatzinformation - Art 9
	210, // 65 Zusatzinformation- Inhalt 9
	20, // 66 Zusatzinformation - Art 10
	210, // 67 Zusatzinformation- Inhalt 10
	20, // 68 Zusatzinformation - Art 11
	210, // 69 Zusatzinformation- Inhalt 11
	20, // 70 Zusatzinformation - Art 12
	210, // 71 Zusatzinformation- Inhalt 12
	20, // 72 Zusatzinformation - Art 13
	210, // 73 Zusatzinformation- Inhalt 13
	20, // 74 Zusatzinformation - Art 14
	210, // 75 Zusatzinformation- Inhalt 14
	20, // 76 Zusatzinformation - Art 15
	210, // 77 Zusatzinformation- Inhalt 15
	20, // 78 Zusatzinformation - Art 16
	210, // 79 Zusatzinformation- Inhalt 16
	20, // 80 Zusatzinformation - Art 17
	210, // 81 Zusatzinformation- Inhalt 17
	20, // 82 Zusatzinformation - Art 18
	210, // 83 Zusatzinformation- Inhalt 18
	20, // 84 Zusatzinformation - Art 19
	210, // 85 Zusatzinformation- Inhalt 19
	20, // 86 Zusatzinformation - Art 20
	210, // 87 Zusatzinformation- Inhalt 20
	8, // 88 Stück
	8, // 89 Gewicht
	2, // 90 Zahlweise
	10, // 91 Forderungsart
	4, // 92 Veranlagungsjahr
	8, // 93 Zugeordnete Fälligkeit
	1, // 94 Skontotyp
	30, // 95 Auftragsnummer
	2, // 96 Buchungstyp
	2, // 97 USt-Schlüssel (Anzahlungen)
	2, // 98 EU-Land (Anzahlungen)
	3, // 99 Sachverhalt L+L (Anzahlungen)
	2, // 100 EU-Steuersatz (Anzahlungen)
	9, // 101 Erlöskonto (Anzahlungen)
	2, // 102 Herkunft-Kz
	36, // 103 Buchungs GUID
	8, // 104 KOST-Datum
	35, // 105 SEPA-Mandatsreferenz
	1, // 106 Skontosperre
	76, // 107 Gesellschaftername
	4, // 108 Beteiligtennummer
	11, // 109 Identifikationsnummer
	20, // 110 Zeichnernummer
	8, // 111 Postensperre bis
	30, // 112 Bezeichnung SoBil-Sachverhalt
	2, // 113 Kennzeichen SoBil-Buchung
	1, // 114 Festschreibung
	8, // 115 Leistungsdatum
	8, // 116 Datum Zuord. Steuerperiode
	8, // 117 Fälligkeit
	1, // 118 Generalumkehr (GU)
	2, // 119 Steuersatz
	2, // 120 Land
	50, // 121 Abrechnungsreferenz
	1, // 122 BVV-Position
	15, // 123 EU-Land u. UStID (Ursprung)
	2, // 124 EU-Steuersatz (Ursprung)
	8, // 125 Abw. Skontokonto
];
