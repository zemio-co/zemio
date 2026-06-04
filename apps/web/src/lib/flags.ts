/**
 * Determines whether admins can update the status of their own reports.
 *
 * When set to true, admin will be able to update the status of their own reports.
 */
export const ADMINS_UPDATE_OWN_REPORT = true;

/**
 * Determines whether admins can promote other users to admins.
 *
 * When set to true, all admins will be able to promote other users to admins. When
 * set to false, only the superuser will be able to promote other users to admins.
 */
export const ADMINS_PROMOTE_OTHER_ADMIN = true;

/**
 * Determines whether admins can demote other admins to regular users.
 *
 * When set to true, all admins will be able to demote other admins (except for the
 * superuser) to regular users. When set to false, only the superuser will be able
 * to demote other admins to regular users.
 */
export const ADMINS_DEMOTE_OTHER_ADMIN = false;
