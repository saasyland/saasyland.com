import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Laptop, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { isMobileSession, sessionDeviceLabel } from "~/src/modules/session/session.utils"
import { listUserSessionsQuery } from "~/src/modules/session/use-cases/list-user-sessions"
import { revokeUserSessionMutation } from "~/src/modules/session/use-cases/revoke-user-session"
import { revokeUserSessionsMutation } from "~/src/modules/session/use-cases/revoke-user-sessions"
import type { User } from "~/src/modules/user/user.types"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

export const UserSessions = ({ user }: { readonly user: User["select"] }): JSX.Element => {
  const t = useTranslations("pages.admin.users.profile.sessions")
  const format = useFormatter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { data: sessions, dataUpdatedAt } = useSuspenseQuery(listUserSessionsQuery({ userId: user.id }))

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const revokeSession = useMutation({
    ...revokeUserSessionMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.USER })
      toast.success(t("feedback.revokeSuccess"))
    },
  })
  const revokeSessions = useMutation({
    ...revokeUserSessionsMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.USER })
      toast.success(t("feedback.revokeAllSuccess", { name: user.name }))
    },
  })

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description", { name: user.name })}</CardDescription>
        <CardAction>
          <AlertDialogTrigger>
            <Button isDisabled={sessions.length === 0 || revokeSessions.isPending} size="sm" variant="outline">
              {t("revokeAll")}
            </Button>
            <AlertDialog>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("revokeAllDialog.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("revokeAllDialog.description", { name: user.name })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("revokeAllDialog.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onPress={() => {
                    revokeSessions.mutate({ userId: user.id })
                  }}
                  variant="destructive"
                >
                  {t("revokeAllDialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialog>
          </AlertDialogTrigger>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {sessions.length === 0 && <p className="px-(--card-spacing) text-sm text-muted-foreground">{t("empty")}</p>}
        {sessions.length > 0 && (
          <ul className="divide-y divide-border">
            {sessions.map((session) => (
              <li className="flex items-center justify-between gap-4 px-(--card-spacing) py-3" key={session.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
                    {isMobileSession(session) && <Smartphone aria-hidden className="size-4" />}
                    {!isMobileSession(session) && <Laptop aria-hidden className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{sessionDeviceLabel(session) ?? t("unknownDevice")}</p>
                    <p className="text-spec text-muted-foreground">
                      {t("activity", { signedIn: session.createdAt, time: format.relativeTime(session.updatedAt, dataUpdatedAt) })}
                    </p>
                  </div>
                </div>
                <Button
                  className="h-8 shrink-0 px-3 text-spec text-destructive hover:bg-destructive/10 hover:text-destructive"
                  isDisabled={revokeSession.isPending}
                  onPress={() => {
                    revokeSession.mutate({ sessionId: session.id })
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {t("revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
