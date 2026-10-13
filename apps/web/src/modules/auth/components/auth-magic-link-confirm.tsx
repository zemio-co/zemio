import { Button } from "@zemio/ui";
import Image from "next/image";
import { useTranslations } from "next-intl";
import ZemioIcon from "public/assets/zemio-icon-light.svg";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * The page a magic link lands on: one button that signs the person in.
 *
 * The button is the point. A mail scanner that fetches the link reaches this
 * page and stops; only a person pressing the button opens the endpoint that
 * spends the token. A plain GET form rather than a script, so it is a real
 * navigation — the endpoint's cookie and its redirects to the dashboard, to
 * onboarding, or back to sign-in with an error all work as before — and so it
 * works without JavaScript.
 */
function AuthMagicLinkConfirm({
	className,
	params,
	...props
}: React.ComponentProps<"div"> & {
	/** The link's own query, handed on to the endpoint unchanged. */
	params: Record<string, string>;
}) {
	const t = useTranslations("modules.auth.magicLink");

	return (
		<div className={cn("relative z-20 w-full max-w-sm", className)} {...props}>
			<Image alt="" className="size-8" src={ZemioIcon} />
			<h1 className="mt-10 font-semibold text-base-800 text-lg">{t("title")}</h1>
			<p className="mt-0.5 text-base-500 text-sm">{t("body")}</p>

			<form action={ROUTES.AUTH_MAGIC_LINK_VERIFY()} className="mt-8" method="get">
				{Object.entries(params).map(([name, value]) => (
					<input key={name} name={name} type="hidden" value={value} />
				))}
				<Button className="w-full" type="submit">
					{t("submit")}
				</Button>
			</form>
		</div>
	);
}

export { AuthMagicLinkConfirm };
