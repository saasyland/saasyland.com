import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { removeUserData } from "~/src/integrations/better-auth/auth.session"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { confirmAccountDeletionMutation } from "~/src/modules/user/use-cases/confirm-account-deletion"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { onlyDeclaredSearch, searchText } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { AppDeleteAccountPending } from "~/src/presentation/components/custom/app/auth-pending"
import { ACCOUNT_DELETION_NOTICES, AccountDeletionConsequences } from "~/src/presentation/components/custom/settings/delete-account-card"

import { ROUTES } from "~/src/routes"

const deleteAccountSearchSchema = zod.object({ token: searchText() })

const DeleteAccountPage = (): JSX.Element => {
  const t = useTranslations("pages.app.delete-account")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { token } = Route.useSearch()

  const confirmDeletion = useMutation({
    ...confirmAccountDeletionMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      removeUserData(queryClient)
      await router.navigate({ replace: true, to: ROUTES.HOME })
      router.clearCache()
      toast.success(t("deleted"))
    },
  })

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader className="border-b">
          <CardTitle>
            <h2>{token === undefined ? t("missing.title") : t("confirm.title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {token === undefined && <p className="text-sm text-pretty text-muted-foreground">{t("missing.description")}</p>}
          {token !== undefined && <AccountDeletionConsequences />}
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton to={ROUTES.APP.SETTINGS.INDEX} size="sm" variant="outline">
              {token === undefined ? t("missing.back") : t("confirm.keep")}
            </LinkButton>
            {token !== undefined && (
              <Button
                isPending={confirmDeletion.isPending}
                onPress={() => {
                  confirmDeletion.mutate({ token })
                }}
                size="sm"
                variant="destructive"
              >
                {t("confirm.delete")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const NAMESPACE = "pages.app.delete-account"

export const Route = createFileRoute("/app/settings_/delete-account")({
  validateSearch: deleteAccountSearchSchema,
  component: DeleteAccountPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      ...ACCOUNT_DELETION_NOTICES.map(({ load }) => load({ queryClient: context.queryClient })),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.APP.SETTINGS.DELETE_ACCOUNT),
  pendingComponent: AppDeleteAccountPending,
  search: { middlewares: [onlyDeclaredSearch(deleteAccountSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
