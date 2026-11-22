import { type JSX, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/src/presentation/components/shadcn/card"

import { ChangeEmailForm } from "~/src/presentation/components/custom/auth/change-email-form"

export const EmailCard = (): JSX.Element => {
  const t = useTranslations("auth.security.email")

  const [isChanging, setChanging] = useState(false)

  const user = useSuspenseQuery(getCurrentSessionQuery).data?.user
  const isVerified = user?.emailVerified === true

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Badge variant={isVerified ? "accent" : "warning"}>{isVerified ? t("verified") : t("unverified")}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pb-(--card-spacing)">
        <p className="text-sm font-medium break-all text-foreground">{user?.email}</p>
        {isChanging && (
          <ChangeEmailForm
            onDone={() => {
              setChanging(false)
            }}
          />
        )}
      </CardContent>
      {!isChanging && (
        <CardFooter className="justify-end">
          <Button
            onPress={() => {
              setChanging(true)
            }}
            size="sm"
            variant="outline"
          >
            {t("change")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
