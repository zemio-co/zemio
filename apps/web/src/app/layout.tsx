import "@/styles/globals.css";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { PublicEnvScript } from "@/lib/runtime-env/public-env-script";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
	metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
	title: {
		default: "Zemio",
		template: "%s | Zemio",
	},
	description: "Expense reports for student initiatives",
	icons: {
		icon: [
			{
				url: "/icons/zemio-icon-light-filled.svg",
				type: "image/svg+xml",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/icons/zemio-icon-dark-filled.svg",
				type: "image/svg+xml",
				media: "(prefers-color-scheme: dark)",
			},
		],
		apple: "/icons/zemio-icon-light-filled.svg",
	},
	openGraph: {
		title: "Zemio",
		description: "Expense reports for student initiatives",
		images: ["/assets/zemio-logo-woodmark.png"],
		type: "website",
	},
};

const inter = Inter({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-inter",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={inter.variable} lang="en" suppressHydrationWarning>
			<head>
				{/* Injects runtime public env before deferred client bundles run. */}
				<PublicEnvScript />
			</head>
			<body className="min-h-screen bg-background font-sans antialiased">
				<Providers>
					<TRPCReactProvider>
						{children}
						<ReactQueryDevtools />
					</TRPCReactProvider>
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
