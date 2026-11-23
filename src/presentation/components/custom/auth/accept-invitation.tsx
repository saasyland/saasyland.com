import type { JSX, ReactNode } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery, refreshUserData } from "~/src/integrations/better-auth/auth.session"

import { signOutUserMutation } from "~/src/modules/account/use-cases/sign-out-user"
import { INVITATION_QUERY_KEYS, INVITATION_STATUS, type InvitationStatus } from "~/src/modules/invitation/invitation.constants"
import { claimInvitationMutation } from "~/src/modules/invitation/use-cases/claim-invitation"
import { invitationQuery } from "~/src/modules/invitation/use-cases/get-invitation"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"

import { AcceptInvitationForm } from "~/src/presentation/components/custom/auth/accept-invitation-form"
import { OAuthButtons, OAuthDivider } from "~/src/presentation/components/custom/auth/oauth-buttons"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const UNKNOWN_LINK = "invalid"

const LINK_CLASS = "font-medium text-foreground underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

const PageHeading = ({ children, description }: { readonly children: ReactNode; readonly description: ReactNode }): JSX.Element => (
  <>
    <h1 className="text-headline-support text-balance text-foreground">{children}</h1>
    <p className="mt-3 text-body text-pretty text-muted-foreground">{description}</p>
  </>
)

export const InvitationUnavailable = ({
  status,
}: {
  readonly status?: Exclude<InvitationStatus, typeof INVITATION_STATUS.PENDING>
}): JSX.Element => {
  const t = useTranslations("pages.auth.invite")

  const kind = status ?? UNKNOWN_LINK

  return (
    <>
      <PageHeading description={t(`${kind}.description`)}>{t(`${kind}.title`)}</PageHeading>
      <LinkButton className="mt-10 h-11 w-full text-body-sm font-semibold" to={ROUTES.SIGN_IN}>
        {t("signIn")}
      </LinkButton>
    </>
  )
}

const ClaimInvitation = ({
  email,
  role,
  token,
}: {
  readonly email: string
  readonly role: string
  readonly token: string
}): JSX.Element => {
  const t = useTranslations("pages.auth.invite")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { finishSignIn } = useAuthRedirect()

  const claim = useMutation({
    ...claimInvitationMutation,
    onError: async (error) => {
      toast.error(errorMessage(error))
      await queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEYS.DETAIL })
    },
    onSuccess: async () => {
      await finishSignIn()
      toast.success(t("welcome", { appName: APP_NAME }))
    },
  })

  return (
    <>
      <PageHeading description={t("claim.description", { email, role })}>{t("claim.title")}</PageHeading>
      <Button
        className="mt-10 h-11 w-full text-body-sm font-semibold"
        isPending={claim.isPending}
        onPress={() => {
          claim.mutate({ token })
        }}
      >
        {t("claim.submit")}
      </Button>
    </>
  )
}

const InvitationMismatch = ({ current, invited }: { readonly current: string; readonly invited: string }): JSX.Element => {
  const t = useTranslations("pages.auth.invite")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const signOut = useMutation({
    ...signOutUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => refreshUserData(queryClient),
  })

  return (
    <>
      <PageHeading description={t("mismatch.description", { current, invited })}>{t("mismatch.title")}</PageHeading>
      <Button
        className="mt-10 h-11 w-full text-body-sm font-semibold"
        isPending={signOut.isPending}
        onPress={() => {
          signOut.mutate()
        }}
        variant="outline"
      >
        {t("mismatch.signOut")}
      </Button>
    </>
  )
}

export const AcceptInvitation = ({ token }: { readonly token: string }): JSX.Element => {
  const t = useTranslations("pages.auth.invite")

  const { invitation } = useSuspenseQuery(invitationQuery({ token })).data
  const session = useSuspenseQuery(getCurrentSessionQuery).data

  if (invitation === undefined) {
    return <InvitationUnavailable />
  }
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    return <InvitationUnavailable status={invitation.status} />
  }

  const role = t(`roles.${invitation.role}`)

  if (session !== null && session.user.email.toLowerCase() === invitation.email) {
    return <ClaimInvitation email={invitation.email} role={role} token={token} />
  }
  if (session !== null) {
    return <InvitationMismatch current={session.user.email} invited={invitation.email} />
  }

  const invitePage = `${ROUTES.ACCEPT_INVITATION}?${new URLSearchParams({ token }).toString()}`

  return (
    <>
      <PageHeading description={t("form.description", { email: invitation.email, role })}>
        {t("form.title", { appName: APP_NAME })}
      </PageHeading>
      <div className="mt-10 flex flex-col gap-6">
        <OAuthButtons redirect={invitePage} />
        <OAuthDivider />
        <AcceptInvitationForm email={invitation.email} token={token} />
      </div>
      <p className="mt-10 text-body-sm text-muted-foreground">
        {t.rich("form.hasAccount", {
          link: (chunks: ReactNode) => (
            <Link className={LINK_CLASS} search={{ redirect: invitePage }} to={ROUTES.SIGN_IN}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  )
}
