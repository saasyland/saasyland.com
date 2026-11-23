import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const AUTH_FLOWS = [
  {
    area: FLOW_AREA.ACCOUNT,
    id: "sign-up-and-verify",
    outcome:
      "A visitor signs up and is signed straight into /app, which asks them to confirm the address, and the one verification email's link confirms it",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › signs a new account in straight away, and its link confirms the address" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "verification-elsewhere",
    outcome: "A verify page left open continues to its return path by itself once the link is opened in another tab",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth-journeys.spec.ts", title: "the verify page › continues by itself once the link is opened in another tab" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "sign-up-taken-address",
    outcome:
      "Signing up with the address of a confirmed account creates no second account and no session, shows the same screen as for an unconfirmed one, and emails the account a sign-in link and a reset link instead",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › sign-up signs a new account in at once, shows one screen for an existing confirmed and an existing unconfirmed email, and the existing account resets its password and signs in" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "sign-up-email-suggestion",
    outcome: "After a misspelt email domain, sign-up suggests the likely address once the field is left, and one press fills it in",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "form-validation.spec.ts", title: "form validation timing › a misspelt email domain gets a suggestion once the visitor leaves the field" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "sign-in-with-password",
    outcome: "A verified account signs in with its email and password and lands in its workspace: /admin for an admin, /app for a customer",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "admin can sign in and load the permitted workspace" },
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
    ],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "sign-in-last-used",
    outcome: "The sign-in page lists GitHub first and marks the way the browser signed in last time",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth-journeys.spec.ts", title: "signing in again › lists GitHub first and marks the way the visitor signed in last time" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "session-ended",
    outcome: "A visitor whose session ended is sent to sign-in, which says so and names the page it returns to",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-journeys.spec.ts", title: "signing in again › says a session ended and names the page it returns to" },
      { spec: "auth-routing.spec.ts", title: "a client navigation once the cached session is stale rechecks an ended session despite cached workspace data" },
    ],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    ],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "workspace-wordmark-home",
    outcome: "The wordmark in the admin console and in the customer workspace opens the home page, in the visitor's language",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "the wordmark takes admin from the workspace to the home page, in English and in Polish" },
      { spec: "workspaces.spec.ts", title: "the wordmark takes customer from the workspace to the home page, in English and in Polish" },
    ],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "sign-out",
    outcome: "Signing out ends the session, and /app, /app/settings and /app/license then lead to sign-in with the page as the return path",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can use the mobile app sidebar and signing out protects both app pages" },
      { spec: "license.spec.ts", title: "customer opens the licence from the mobile app sidebar and signing out protects it" },
    ],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "return-path-across-sign-up",
    outcome: "The return path survives switching from sign-in to sign-up and back",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth-redirect.spec.ts", title: "returning after sign-in › the return path survives the switch from sign-in to sign-up and back" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
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
    area: FLOW_AREA.ACCOUNT,
    id: "password-reset-invalid-token",
    outcome: "A reset link without a token, or with a used or expired one, changes no password and offers a new link",
    reason: "The spec opens the page without a token; no spec submits a password with a used or expired one.",
    status: FLOW_STATUS.MISSING,
    tests: [{ spec: "auth.spec.ts", title: "auth › reset-password page without token shows invalid link state" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "password-reset-unknown-address",
    outcome: "Asking to reset the password of an address without an account sends no email and answers as for any other address",
    reason: "No spec asks for a password reset.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "sign-in-with-github",
    outcome: "A visitor signs in with GitHub and lands in /app with an account for the GitHub address",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › connects and disconnects GitHub, and keeps the only way an account signs in until it sets a password" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "sign-in-with-google",
    outcome: "A visitor signs in with Google and lands in /app with an account for the Google address",
    reason: "No spec presses the Google button; signing in needs a stub of Google's OAuth endpoints.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "two-factor-sign-in",
    outcome: "An account with two-factor authentication is sent to /auth/two-factor after its password and gets a session only with a valid code",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "two-factor-backup-code",
    outcome: "A backup code signs the account in once and is refused the second time, and new backup codes replace every old one",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "change-password",
    outcome:
      "A user changes their password in Settings with the current one: every other device is signed out, only the new password signs in, and an email says the password changed",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › changes the password: every other device is signed out, only the new password signs in, and an email says so" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "own-sessions",
    outcome:
      "Settings lists the account's devices by browser, system and country with this one first, signs out one other device, then every other device, and keeps this one signed in",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › signs out one other device, then every other device, and keeps this one signed in" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "two-factor-settings",
    outcome:
      "A user turns on two-factor authentication with their password, a QR setup key and a code, saves backup codes shown once, replaces them, and turns it off with their password, after which signing in asks for no code",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › turns on two-factor authentication, replaces the backup codes, signs in with a code and once with each new backup code, and turns it off" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "connected-accounts",
    outcome:
      "A user connects GitHub from Settings and disconnects it, an account that signs in only with GitHub cannot disconnect it and is told to set a password, and once it sets one it can disconnect GitHub and sign in with the password",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › connects and disconnects GitHub, and keeps the only way an account signs in until it sets a password" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "change-email",
    outcome: "A user changes their email address, confirms the change from the old address and verifies the new one",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › changes the email: the old address confirms the change and the new address verifies it" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "delete-account",
    outcome:
      "A user asks to delete their account with their password, confirms it on the page the emailed link opens, and is signed out, after which the address no longer signs in",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "account-security.spec.ts", title: "account security settings › deletes the account through the emailed link, after which its address no longer signs in" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "display-time-zone",
    outcome: "A saved time zone moves every time shown in /app and names the zone, and Detect from this browser picks the browser's zone",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "license.spec.ts", title: "display preferences › a saved time zone moves every time in the app and names the zone" }],
  },
  {
    area: FLOW_AREA.ACCOUNT,
    id: "app-overview",
    outcome: "/app opens on the overview with the signed-in account's email, and Settings opens from the app navigation",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-user-table",
    outcome: "The admin sorts the user table by name in both directions and selects every row",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin sorts the user table by name and selects every row" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-user-search",
    outcome: "The admin finds users by name or email, filters them by role and status, and pages through the results",
    reason: "No spec types a search, applies a filter or changes the page.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-create-user",
    outcome: "The admin adds a user with a name, an email and a password and lands on the new profile, where the role is Customer",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-rename-user",
    outcome: "The admin renames a user, and the profile shows the new name",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-set-role",
    outcome: "The admin makes a customer an admin, the profile shows the role, and Impersonate is no longer offered for them",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin adds a user, renames them and makes them an admin" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-impersonate",
    outcome:
      "The admin impersonates a customer, sees /app as them under the impersonation banner after a reload, and Stop impersonating returns to the profile",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-users.spec.ts", title: "admin impersonates a customer and stops impersonating" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
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
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-revoke-one-session",
    outcome: "Revoking one of a user's sessions signs out that browser and keeps the others",
    reason: "The spec revokes every session at once.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-ban-user",
    outcome: "Banning a user ends their sessions and refuses their sign-in, and unbanning lets them sign in again",
    reason: "No spec bans or unbans a user.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-set-password",
    outcome: "The admin sets a new password for a user, who then signs in with it and not with the old one",
    reason: "No spec sets a user's password.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-delete-user",
    outcome: "Deleting a user removes them from the table, and their address can no longer sign in",
    reason: "No spec deletes a user.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
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
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-only-working-screens",
    outcome: "The admin menu and the command palette list only working screens, and the removed demo screens answer 404",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "admin-dashboard.spec.ts", title: "the admin menu and the command palette list only working screens" },
      { spec: "admin-dashboard.spec.ts", title: "/admin/analytics is gone and answers 404 to an admin" },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
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
    area: FLOW_AREA.ADMIN_USERS,
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
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-dashboard-refused",
    outcome: "A customer who opens /admin is sent to the workspace and sees none of the dashboard's figures",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "admin-dashboard.spec.ts", title: "a customer is sent to the workspace and never sees the dashboard's figures" }],
  },
  {
    area: FLOW_AREA.ADMIN_USERS,
    id: "admin-users-refused",
    outcome:
      "A customer and a signed-out visitor are refused by every user-management server function (list, read, create, update, role, ban, unban, password, impersonate, sessions, delete), and nothing changes",
    reason: "The specs check that /admin sends a customer to /app; no spec calls a user-management server function without the permission.",
    status: FLOW_STATUS.MISSING,
    tests: [{ spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" }],
  },
  {
    area: FLOW_AREA.ADMIN_SETTINGS,
    id: "admin-change-password",
    outcome: "An admin changes their password in Settings with the current one, and only the new password signs them in",
    reason: "The customer's settings spec submits the same PasswordCard; no spec submits it in /admin/settings.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_SETTINGS,
    id: "admin-two-factor-enrol",
    outcome: "An admin turns on two-factor authentication with their password and a code from an authenticator, and receives backup codes",
    reason: "The customer's settings spec turns on two-factor authentication with the same TwoFactorCard; no spec does so in /admin/settings.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_SETTINGS,
    id: "admin-two-factor-disable",
    outcome: "An admin turns two-factor authentication off with their password, and signing in asks for no code again",
    reason: "The customer's settings spec turns it off with the same TwoFactorCard; no spec does so in /admin/settings.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_SETTINGS,
    id: "admin-own-sessions",
    outcome: "An admin signs out one of their other sessions, or all of them, from Settings, and those browsers are signed out",
    reason: "The customer's settings spec signs out other devices with the same SessionsCard; no spec does so in /admin/settings.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_SETTINGS,
    id: "admin-workspace-profile",
    outcome: "The admin saves the workspace name, support email, address and logo",
    reason: "The Profile card's fields and buttons save nothing.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "external-return-path",
    outcome: "A return path or callback URL that leaves the site is ignored",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "auth-redirect.spec.ts", title: "returning after sign-in › a return path that leaves the site is ignored" },
      { spec: "auth.spec.ts", title: "auth › localized verification errors preserve the locale and ignore an untrusted callback URL" },
    ],
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "verification-marker",
    outcome: "The verification page's success marker does not sign in a signed-out visitor",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › a verification success marker cannot authenticate a signed-out visitor" }],
  },
  {
    area: FLOW_AREA.SECURITY,
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
    area: FLOW_AREA.SECURITY,
    id: "customer-kept-out-of-admin",
    outcome: "A customer who opens /admin or an admin page lands on /app",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
      { spec: "videos.spec.ts", title: "video library › a customer cannot open the library or stream without a signed path" },
    ],
  },
  {
    area: FLOW_AREA.SECURITY,
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
    area: FLOW_AREA.SECURITY,
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
    area: FLOW_AREA.SECURITY,
    id: "auth-rate-limit",
    outcome: "A sensitive request (sign-up, reset request, verification email, two-factor code) over the limit for one address is refused",
    reason: "Every spec sends its requests from an address of its own to stay under the limit; none asserts the refusal.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "email-recipient-limit",
    outcome: "A verification, reset or newsletter email over the hourly limit for one recipient is skipped without an error",
    reason: "No spec sends more emails to one address than the hourly limit allows.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "cross-origin-auth",
    outcome: "A sign-in or sign-out request from another origin is refused",
    reason: "The specs send the site's own Origin header; none sends another.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.I18N,
    id: "localized-verification",
    outcome: "A verification link opened under /pl-PL lands the new account on /pl-PL/app",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "auth.spec.ts", title: "auth › verification redirects a new account to its localized app" }],
  },
  {
    area: FLOW_AREA.I18N,
    id: "localized-auth-email",
    outcome: "A visitor who signs up on /pl-PL receives the verification email in Polish, with a link back under /pl-PL",
    reason: "Every sign-up in the specs is in English, and expectVerificationEmail expects an English email.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.I18N,
    id: "localized-workspace",
    outcome: "/pl-PL/app shows the workspace navigation, the settings and the licence in Polish",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "workspaces.spec.ts", title: "customer can sign in and load the permitted workspace" },
      { spec: "license.spec.ts", title: "customer opens the licence from the app navigation in English and Polish" },
    ],
  },
] as const satisfies readonly Flow[]
