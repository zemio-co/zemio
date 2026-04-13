import { PageTitle } from "@/components/page-title";
import { UserList } from "./user-list";

export function UsersPage() {
	return (
		<section>
			<PageTitle>Mitglieder</PageTitle>
			<div className="mt-12">
				<UserList />
			</div>
		</section>
	);
}
