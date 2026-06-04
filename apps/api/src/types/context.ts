import type { Member, Session, User } from "@zemio/db";

export type AuthVariables = {
	session: Session;
	user: User;
	member: Member;
};
