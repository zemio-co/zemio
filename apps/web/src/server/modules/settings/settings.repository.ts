import type { Prisma, PrismaClient } from "@zemio/db";

type Db = PrismaClient;

/** Mirrors the schema default, applied when a row is created on first read. */
const DEFAULT_KILOMETER_RATE = 0.3;

const settingsSelect = {
	id: true,
	organizationId: true,
	kilometerRate: true,
	reviewerEmail: true,
	costUnitInfoUrl: true,
	dailyFoodAllowance: true,
	breakfastDeduction: true,
	lunchDeduction: true,
	dinnerDeduction: true,
	datevBeraternummer: true,
	datevMandantennummer: true,
	datevWirtschaftsjahrBeginn: true,
	datevSachkontenlaenge: true,
	datevKontenrahmen: true,
	datevExpenseAccountReceipt: true,
	datevExpenseAccountTravel: true,
	datevExpenseAccountFood: true,
	datevContraAccount: true,
	datevFestschreibung: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.SettingsSelect;

export type SettingsRow = Prisma.SettingsGetPayload<{
	select: typeof settingsSelect;
}>;

/**
 * The writable scalar columns. Kept as plain values rather than Prisma's update
 * input so the same object can seed a create and drive an update.
 */
export type SettingsWriteData = {
	kilometerRate?: number;
	reviewerEmail?: string | null;
	costUnitInfoUrl?: string | null;
	dailyFoodAllowance?: number;
	breakfastDeduction?: number;
	lunchDeduction?: number;
	dinnerDeduction?: number;
	datevBeraternummer?: number | null;
	datevMandantennummer?: number | null;
	datevWirtschaftsjahrBeginn?: Date | null;
	datevSachkontenlaenge?: number | null;
	datevKontenrahmen?: "03" | "04" | null;
	datevExpenseAccountReceipt?: string | null;
	datevExpenseAccountTravel?: string | null;
	datevExpenseAccountFood?: string | null;
	datevContraAccount?: string | null;
	datevFestschreibung?: boolean;
};

/**
 * Settings are created lazily: an organization has none until something reads
 * or writes them, so every entry point upserts rather than assuming a row.
 */
export const settingsRepository = {
	upsert(
		db: Db,
		args: { organizationId: string; data: SettingsWriteData },
	): Promise<SettingsRow> {
		return db.settings.upsert({
			where: { organizationId: args.organizationId },
			create: {
				organizationId: args.organizationId,
				kilometerRate: DEFAULT_KILOMETER_RATE,
				...args.data,
			},
			update: args.data,
			select: settingsSelect,
		});
	},
} as const;

export type SettingsRepository = typeof settingsRepository;
