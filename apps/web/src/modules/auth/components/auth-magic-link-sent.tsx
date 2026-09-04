"use client";

import { ArrowLeftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import React from "react";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import ZemioIcon from "../../../../public/assets/zemio-icon-light.svg";

function AuthMagicLinkSent({
	className,
	...props
}: React.ComponentProps<"div">) {
	const params = useSearchParams();

	const email = React.useMemo(() => {
		const email = params.get("email");

		if (!email) {
			return "your email adress";
		}

		return email;
	}, [params]);

	return (
		<div className={cn("relative z-20 w-full max-w-sm", className)} {...props}>
			<Image alt="" className="size-8" src={ZemioIcon} />
			<p className="mt-10 font-semibold text-base-800 text-lg">
				Please check your inbox
			</p>
			<p className="mt-0.5 text-base-500 text-sm">
				We have sent a linkt to{" "}
				<span className="font-medium text-base-700">{email}</span>. Please click it
				to verify your email.
			</p>

			<Link
				className="mt-6 flex w-fit items-center justify-center gap-1.5 font-medium text-accent-600 text-sm"
				href={ROUTES.AUTH()}
			>
				<ArrowLeftIcon className="size-3.5 shrink-0" />
				Go back
			</Link>
		</div>
	);
}

export { AuthMagicLinkSent };
