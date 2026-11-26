import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

export const AUTH_FLOWS = [
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-up-and-verify",
    outcome:
      "A visitor signs up and is signed straight into /app, which asks them to confirm the address, and the one verification email's link confirms it",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › signs a new account in straight away, and its link confirms the address" }],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "verification-link-single-use",
    outcome: "A verification link opened again after signing out signs nobody in and says the address is already confirmed",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth.spec.ts", title: "auth › signs a new account in straight away, and its link confirms the address" },
      {
        spec: "auth-journeys.spec.ts",
        title:
          "the verify page › names the address of a link that no longer works and leads with a new one, and says when the address is already confirmed",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "verification-invalid-token",
    outcome:
      "A wrong or expired verification token says the link no longer works, names the address it carried, leads with a new link, offers sign-in and creates no session",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title:
          "the verify page › names the address of a link that no longer works and leads with a new one, and says when the address is already confirmed",
      },
      { spec: "auth.spec.ts", title: "auth › verify-email page with an invalid token offers sign-in and resend recovery" },
      { spec: "auth.spec.ts", title: "auth › localized verification errors preserve the locale and ignore an untrusted callback URL" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "verification-resend",
    outcome: "Signing up again with an unverified address, and pressing Resend, each send a new verification email whose link works",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › repeating signup for an unconfirmed email sends another link to the inbox and resend still works",
      },
      {
        spec: "auth.spec.ts",
        title:
          "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "verification-resend-limit",
    outcome:
      "Resend waits out a countdown between sends, and once the address has had its emails for the hour it sends nothing and says so instead of claiming a send",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title: "the verify page › resends to the account's address after a countdown, and says so honestly when the hourly limit stops a send",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "verification-elsewhere",
    outcome: "A verify page left open continues to its return path by itself once the link is opened in another tab",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth-journeys.spec.ts", title: "the verify page › continues by itself once the link is opened in another tab" }],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-up-taken-address",
    outcome:
      "Signing up with the address of a confirmed account creates no second account and no session, shows the same screen as for an unconfirmed one, and emails the account a sign-in link and a reset link instead",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-up-password-rules",
    outcome:
      "The sign-up form ticks off the length rule as the visitor types, and refuses a password that is too short or found in a known data breach under the password field, creating no account",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth.spec.ts", title: "auth › sign-up page shows its own headline and ticks off the password length as the visitor types" },
      {
        spec: "form-validation.spec.ts",
        title: "form validation timing › a password that is too short or found in a known data breach is refused under the password field",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "form-error-timing",
    outcome:
      "A field reports its mistake only once the visitor leaves it, clears it on the keystroke that fixes it, and a submit with mistakes shows every error and focuses the first field while the button stays enabled",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "form-validation.spec.ts",
        title: "form validation timing › a password being typed updates the requirement live but is reported only after the visitor leaves it",
      },
      {
        spec: "form-validation.spec.ts",
        title: "form validation timing › Continue stays enabled, and pressing it with mistakes reveals every error and focuses the first field",
      },
      { spec: "form-validation.spec.ts", title: "form validation timing › sign-in reports an invalid email only after the visitor leaves the field" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-up-email-suggestion",
    outcome: "After a misspelt email domain, sign-up suggests the likely address once the field is left, and one press fills it in",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "form-validation.spec.ts",
        title: "form validation timing › a misspelt email domain gets a suggestion once the visitor leaves the field",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-with-password",
    outcome: "A verified account signs in with its email and password and lands in its workspace: /admin for an admin, /app for a customer",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "admin can sign in and load the permitted workspace" },
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-wrong-password",
    outcome:
      "A wrong password is refused with an error that stays above the button, with a password reset and GitHub and Google, and creates no session",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title: "signing in again › keeps a wrong password on the page, and a reset keeps the address and the return path all the way back",
      },
      {
        spec: "auth.spec.ts",
        title:
          "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-last-used",
    outcome: "The sign-in page lists GitHub first and marks the way the browser signed in last time",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title: "signing in again › lists GitHub first and marks the way the visitor signed in last time",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "session-ended",
    outcome: "A visitor whose session ended is sent to sign-in, which says so and names the page it returns to",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-journeys.spec.ts", title: "signing in again › says a session ended and names the page it returns to" },
      { spec: "auth-routing.spec.ts", title: "a client navigation once the cached session is stale rechecks an ended session despite cached workspace data" },
      {
        spec: "auth-routing.spec.ts",
        title: "a workspace link pressed after hovering it, which already found the ended session, still says the session ended",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "header-account",
    outcome:
      "A signed-in visitor sees Your account instead of Sign in in the site header, the footer and the mobile menu, and it opens /admin for an admin and /app for a customer, in the visitor's language",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title: "signing in again › leads a signed-in admin from Your account in the header, the footer and the mobile menu to their workspace",
      },
      {
        spec: "auth-journeys.spec.ts",
        title: "signing in again › leads a signed-in customer from Your account in the header, the footer and the mobile menu to their workspace",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › says Your account before any script runs for a signed-in visitor, and Sign in for everyone else",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › leads a signed-in admin from Your account, pressed before any script runs, to the admin console",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › leads a signed-in customer from Your account, pressed while the session is still loading, to the workspace",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "header-account-steady",
    outcome:
      "The header's links stay in place from the first paint on, whether the visitor is signed in or not, in every language, the account link is spaced like the others, and a signed-out visitor's pages ask for no session",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › keeps every header link in place at / while the page loads, signed out and signed in, and spaces the account link like the others",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › keeps every header link in place at /pl-PL while the page loads, signed out and signed in, and spaces the account link like the others",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › asks for no session after sign-out, though the browser keeps the last sign-in method, and asks once while signed in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "header-account-ended",
    outcome: "A browser whose session ended elsewhere sees Sign in again once the page has checked, and Your account leads it to the sign-in form",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › turns Your account back to Sign in once the check finds that the session behind the cookie has ended, laid out as for any signed-out visitor, and asks no more after",
      },
      {
        spec: "header-session.spec.ts",
        title: "the header's account link › leads a visitor whose session has ended from Your account, pressed before any script runs, to the sign-in form, which clears the cookie",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "workspace-wordmark-home",
    outcome: "The wordmark in the admin console and in the customer workspace opens the home page, in the visitor's language",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "the wordmark takes admin from the workspace to the home page, in English and in Polish" },
      { spec: "workspaces.spec.ts", title: "the wordmark takes customer from the workspace to the home page, in English and in Polish" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-unverified",
    outcome:
      "An unverified account that signs in gets a fresh verification email and is sent to verify its address, and the emailed link signs it into /app",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "a user the admin adds verifies their email, signs in and is signed out when the admin revokes every session",
      },
      { spec: "auth.spec.ts", title: "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-out",
    outcome: "Signing out ends the session, and /app, /app/settings and /app/license then lead to sign-in with the page as the return path",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can use the mobile app sidebar and signing out protects both app pages" },
      { spec: "license.spec.ts", title: "customer opens the licence from the mobile app sidebar and signing out protects it" },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "return-after-sign-in",
    outcome: "A signed-out visitor sent from a workspace page to sign-in lands back on that page after signing in, in English and Polish",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-redirect.spec.ts", title: "returning after sign-in › a signed-out visitor who opens /app/settings signs in and lands back on it" },
      {
        spec: "auth-redirect.spec.ts",
        title: "returning after sign-in › a signed-out visitor who opens /pl-PL/app/settings signs in and lands back on it",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "return-path-across-sign-up",
    outcome: "The return path survives switching from sign-in to sign-up and back",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-redirect.spec.ts",
        title: "returning after sign-in › the return path survives the switch from sign-in to sign-up and back",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "signed-in-skips-auth-pages",
    outcome: "A signed-in account that opens sign-in or sign-up, directly or by a link, goes to its workspace or the link's return path instead",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-routing.spec.ts", title: "admin bypasses sign-in and sign-up on direct and client navigation" },
      { spec: "auth-routing.spec.ts", title: "customer bypasses sign-in and sign-up on direct and client navigation" },
      {
        spec: "auth-redirect.spec.ts",
        title: "returning after sign-in › a signed-in visitor who follows a sign-in link goes straight to its return path",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "password-reset",
    outcome:
      "A user asks for a reset, opens the emailed link, sets a new password and signs in with it, keeping the address and the return path from sign-in to the end, while the old password and the user's other sessions stop working and an email says the password changed",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-journeys.spec.ts",
        title: "signing in again › keeps a wrong password on the page, and a reset keeps the address and the return path all the way back",
      },
      {
        spec: "auth.spec.ts",
        title:
          "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "password-reset-invalid-token",
    outcome: "A reset link without a token, or with a used or expired one, changes no password and offers a new link",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › reset-password page without token shows invalid link state" }, { spec: "auth.spec.ts", title: "auth › a used or an expired reset link changes no password and offers a new link",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "password-reset-unknown-address",
    outcome: "Asking to reset the password of an address without an account sends no email and answers as for any other address",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › asking to reset the password of an address without an account sends no email and answers as for an account",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-with-github",
    outcome: "A visitor signs in with GitHub and lands in /app with an account for the GitHub address",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › connects and disconnects GitHub, and keeps the only way an account signs in until it sets a password",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "sign-in-with-google",
    outcome: "A visitor signs in with Google and lands in /app with an account for the Google address",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › signs a visitor in with Google and lands in /app with an account for the Google address",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "two-factor-sign-in",
    outcome: "An account with two-factor authentication is sent to /auth/two-factor after its password and gets a session only with a valid code",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "two-factor-backup-code",
    outcome: "A backup code signs the account in once and is refused the second time, and new backup codes replace every old one",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "change-password",
    outcome:
      "A user changes their password in Settings with the current one: every other device is signed out, only the new password signs in, and an email says the password changed",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › changes the password: every other device is signed out, only the new password signs in, and an email says so",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "own-sessions",
    outcome:
      "Settings lists the account's devices by browser, system and country with this one first, signs out one other device, then every other device, and keeps this one signed in",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › signs out one other device, then every other device, and keeps this one signed in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "two-factor-settings",
    outcome:
      "A user turns on two-factor authentication with their password, a QR setup key and a code, saves backup codes shown once, replaces them, and turns it off with their password, after which signing in asks for no code",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "connected-accounts",
    outcome:
      "A user connects GitHub from Settings and disconnects it, an account that signs in only with GitHub cannot disconnect it and is told to set a password, and once it sets one it can disconnect GitHub and sign in with the password",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › connects and disconnects GitHub, and keeps the only way an account signs in until it sets a password",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "change-email",
    outcome: "A user changes their email address, confirms the change from the old address and verifies the new one",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › changes the email: the old address confirms the change and the new address verifies it",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "delete-account",
    outcome:
      "A user asks to delete their account with their password, confirms it on the page the emailed link opens, and is signed out, after which the address no longer signs in",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "account-security.spec.ts",
        title: "account security settings › deletes the account through the emailed link, after which its address no longer signs in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "display-time-zone",
    outcome: "A saved time zone moves every time shown in /app and names the zone, and Detect from this browser picks the browser's zone",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "display preferences › a saved time zone moves every time in the app and names the zone" }],
  },
  {
    feature: FLOW_FEATURE.ACCOUNT,
    id: "app-overview",
    outcome: "/app opens on the overview with the signed-in account's email, and Settings opens from the app navigation",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-user-table",
    outcome: "The admin sorts the user table by name in both directions and selects every row on the page",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin sorts the user table by name and selects every row" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-user-search",
    outcome:
      "The admin finds users by name or email and filters them by role and status on the server, sees the filtered empty state and clears the search and filters from it",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "the admin finds users by name or email and filters them by role and status on the server",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-invitations-grid",
    outcome:
      "/admin/users/invitations searches the open invitations by email, filters them by role, and keeps a hidden column after a reload until the layout is reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-invitations.spec.ts",
        title: "the admin searches the open invitations, filters them by role, hides a column and keeps the layout after a reload",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-user-layout",
    outcome:
      "/admin/users/all hides and shows its columns from the Columns menu and a column's menu, keeps that layout after a reload with the user column pinned, and puts the defaults back on reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-users.spec.ts", title: "the admin hides and shows the users' columns, keeps the layout after a reload and resets it" },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-create-user",
    outcome: "The admin adds a user with a name, an email and a password and lands on the new profile, where the role is Customer",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-rename-user",
    outcome: "The admin renames a user, and the profile shows the new name",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-set-role",
    outcome: "The admin makes a customer an admin, the profile shows the role, and Impersonate is no longer offered for them",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-impersonate",
    outcome:
      "The admin impersonates a customer, sees /app as them under the impersonation banner after a reload, and Stop impersonating returns to the profile",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin impersonates a customer and stops impersonating" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-revoke-all-sessions",
    outcome: "Revoking all of a user's sessions signs that user out in their own browser",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "a user the admin adds verifies their email, signs in and is signed out when the admin revokes every session",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-revoke-one-session",
    outcome: "Revoking one of a user's sessions signs out that browser and keeps the others",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "revoking one of a user's sessions signs out that browser and keeps the others" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-ban-user",
    outcome: "Banning a user ends their sessions and refuses their sign-in, and unbanning lets them sign in again",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "banning a user ends their sessions and refuses their sign-in, and unbanning lets them sign in again",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-set-password",
    outcome: "The admin sets a new password for a user, who then signs in with it and not with the old one",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "the admin sets a new password for a user, who then signs in with it and not with the old one",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-delete-user",
    outcome: "Deleting a user removes them from the table, and their address can no longer sign in",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "deleting a user removes them from the table, and their address can no longer sign in" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-dashboard-users-grid",
    outcome:
      "The dashboard's newest users are searched, filtered by status and role and sorted by join day on the server across every account, each role is shown by its name, and a column the admin hides stays hidden after a reload until the layout is reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-dashboard.spec.ts",
        title: "the admin filters the newest users by status, sorts them by join day, hides a column and keeps it after a reload",
      },
      {
        spec: "admin-dashboard.spec.ts",
        title: "the admin finds any account from the newest users on the server and reads each role by its name",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-dashboard-users",
    outcome: "The dashboard counts the users and lists the newest accounts, each linked to its profile",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-dashboard.spec.ts", title: "the dashboard counts the accounts and links the newest to their profiles" },
      {
        spec: "admin-users.spec.ts",
        title: "a browser whose clock and time zone are not the server's › hydrates the dashboard and a user's sessions as the server printed them",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-only-working-screens",
    outcome: "The admin menu and the command palette list only working screens, and the removed demo screens answer 404",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-dashboard.spec.ts", title: "the admin menu and the command palette list only working screens" },
      { spec: "admin-dashboard.spec.ts", title: "/admin/analytics is gone and answers 404 to an admin" },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-instant-navigation",
    outcome:
      "An admin opens a console page they hovered, or one they opened before, without waiting for the server: while the cached session is fresh the click needs no session check and no server function",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-navigation.spec.ts", title: "an admin opens every console page again without a request, so returning to a page waits for nothing" },
      { spec: "admin-navigation.spec.ts", title: "hovering a console entry loads its page, so the click opens it while every server function is held" },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-command-palette",
    outcome:
      "The admin opens the command palette with ⌘K or Ctrl+K, finds a user by email and an order by its ID on the server, opens each with the pointer or the keyboard, and finds the last one under Recent",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-command-palette.spec.ts",
        title: "an administrator finds a user by email and an order by its ID from the command palette and opens each",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-dashboard-refused",
    outcome: "A customer who opens /admin is sent to the workspace and sees none of the dashboard's figures",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-dashboard.spec.ts", title: "a customer is sent to the workspace and never sees the dashboard's figures" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-missing-user",
    outcome: "An admin who opens a user that does not exist gets a 404 with the not-found page, titled as one and kept out of search",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "a user who does not exist answers 404 with the not-found page and its title" }],
  },
  {
    feature: FLOW_FEATURE.ADMIN_USERS,
    id: "admin-users-refused",
    outcome:
      "A customer and a signed-out visitor are refused by every user-management server function (list, read, create, update, role, ban, unban, password, impersonate, sessions, delete), and nothing changes",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-users.spec.ts",
        title: "a customer and a signed-out visitor are refused by every user-management server function, and nothing changes",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_SETTINGS,
    id: "admin-change-password",
    outcome: "An admin changes their password in Settings with the current one, and only the new password signs them in",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-settings.spec.ts",
        title: "admin security settings › an admin changes their password with the current one, and only the new password signs them in",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_SETTINGS,
    id: "admin-two-factor-enrol",
    outcome: "An admin turns on two-factor authentication with their password and a code from an authenticator, and receives backup codes",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-settings.spec.ts",
        title: "admin security settings › an admin turns on two-factor authentication with a code and gets backup codes, then turns it off so signing in asks for no code",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_SETTINGS,
    id: "admin-two-factor-disable",
    outcome: "An admin turns two-factor authentication off with their password, and signing in asks for no code again",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-settings.spec.ts",
        title: "admin security settings › an admin turns on two-factor authentication with a code and gets backup codes, then turns it off so signing in asks for no code",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_SETTINGS,
    id: "admin-own-sessions",
    outcome: "An admin signs out one of their other sessions, or all of them, from Settings, and those browsers are signed out",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "admin-settings.spec.ts",
        title: "admin security settings › an admin signs out one other device, then every other device, and stays signed in here",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.ADMIN_SETTINGS,
    id: "admin-business-profile",
    outcome:
      "The admin saves the business name, support email and postal address, finds them after a reload, and uploads, replaces and removes the business logo, which the site serves from its own path",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-settings.spec.ts", title: "admin general settings › the admin saves the business profile, and uploads, replaces and removes its logo" }],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "external-return-path",
    outcome: "A return path or callback URL that leaves the site is ignored",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-redirect.spec.ts", title: "returning after sign-in › a return path that leaves the site is ignored" },
      { spec: "auth.spec.ts", title: "auth › localized verification errors preserve the locale and ignore an untrusted callback URL" },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "verification-marker",
    outcome: "The verification page's success marker does not sign in a signed-out visitor",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › a verification success marker cannot authenticate a signed-out visitor" }],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "workspace-guard",
    outcome: "A signed-out visitor who opens /app, /admin or the sign-in callback, with or without a locale prefix, is sent to sign-in",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-routing.spec.ts", title: "auth routing › unauthenticated /admin redirects to sign-in" },
      { spec: "auth-routing.spec.ts", title: "auth routing › unauthenticated /en/admin redirects to sign-in (default locale drops /en prefix)" },
      { spec: "auth-routing.spec.ts", title: "auth routing › unauthenticated /app redirects to sign-in" },
      { spec: "auth-routing.spec.ts", title: "auth routing › unauthenticated localized /pl/app redirects to localized sign-in" },
      { spec: "auth-routing.spec.ts", title: "auth routing › auth callback without session redirects to sign-in" },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "customer-kept-out-of-admin",
    outcome: "A customer who opens /admin or an admin page lands on /app",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
      { spec: "course-videos.spec.ts", title: "lesson videos › a customer cannot open the course admin or stream a video without a signed path" },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "account-switch-clears-data",
    outcome:
      "After another account signs in, no page shows the previous account's licence or email: a sign-in in the same tab or after signing out clears it at once, one in another tab at the first navigation once the cached session is stale",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "license.spec.ts",
        title:
          "cached data when the account changes › a client navigation once the cached session is stale after another account signs in shows that account's licence, not the previous one's",
      },
      {
        spec: "license.spec.ts",
        title: "cached data when the account changes › signing out and signing in as another account leaves none of the first account's data",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "ended-session-recheck",
    outcome:
      "After the session ended elsewhere, the first server function that refuses it or a client navigation once the cached session is stale leads to sign-in and shows none of the account's data",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-routing.spec.ts", title: "a client navigation once the cached session is stale rechecks an ended session despite cached workspace data" },
      { spec: "admin-navigation.spec.ts", title: "an admin whose session ended elsewhere is sent to sign-in by the first server function that refuses it" },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "auth-rate-limit",
    outcome: "A sensitive request (sign-up, reset request, verification email, two-factor code) over the limit for one address is refused",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-limits.spec.ts",
        title: "auth limits › a sign-up, reset request, verification email or two-factor code over the limit for one address is refused",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "email-recipient-limit",
    outcome: "A verification, reset or newsletter email over the hourly limit for one recipient is skipped without an error",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth-limits.spec.ts",
        title: "auth limits › a reset or newsletter email over the hourly limit for one recipient is skipped without an error",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "cross-origin-auth",
    outcome: "A sign-in or sign-out request from another origin is refused",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth-limits.spec.ts", title: "auth limits › a sign-in or a sign-out from another origin is refused" }],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "localized-verification",
    outcome: "A verification link opened under /pl-PL lands the new account on /pl-PL/app",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › verification redirects a new account to its localized app" }],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "localized-auth-email",
    outcome: "A visitor who signs up on /pl-PL receives the verification email in Polish, with a link back under /pl-PL",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "auth.spec.ts",
        title: "auth › a visitor who signs up on /pl-PL receives the verification email in Polish, with a link back under /pl-PL",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "localized-workspace",
    outcome: "/pl-PL/app shows the workspace navigation, the settings and the licence in Polish",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
    ],
  },
] as const satisfies readonly Flow[]
