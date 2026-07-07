"use client";

import { subDays } from "date-fns";
import { create } from "zustand";

type Dates = {
	start: Date;
	end: Date;
};

interface ReportingStore {
	dates: Dates;
	setDates: (dates: Dates) => void;
}

const useReportingStore = create<ReportingStore>((set) => ({
	dates: {
		start: subDays(new Date(), 7),
		end: new Date(),
	},
	setDates: (dates: Dates) => set({ dates }),
}));

export { useReportingStore };
