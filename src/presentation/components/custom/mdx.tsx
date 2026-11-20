import type { ComponentProps, JSX } from "react"

import { Accordion, Accordions } from "@fumadocs/base-ui/components/accordion"
import { Card } from "@fumadocs/base-ui/components/card"
import { Step, Steps } from "@fumadocs/base-ui/components/steps"
import { Tab, Tabs } from "@fumadocs/base-ui/components/tabs"
import defaultMdxComponents from "@fumadocs/base-ui/mdx"

import { localizeHref } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { Alert, AlertDescription, AlertTitle } from "~/src/presentation/components/shadcn/alert"
import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Card as ShadcnCard,
} from "~/src/presentation/components/shadcn/card"
import { Separator } from "~/src/presentation/components/shadcn/separator"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { ActivationLimit } from "~/src/presentation/components/custom/activation-limit"
import { HeadStartTable } from "~/src/presentation/components/custom/blog/head-start-table"
import { PostFaq } from "~/src/presentation/components/custom/blog/post-faq"
import { ChangelogLinks } from "~/src/presentation/components/custom/changelog-links"
import { RegionalDiscounts } from "~/src/presentation/components/custom/regional-discounts"
import { RepositoryFact, RepositoryTable } from "~/src/presentation/components/custom/repository-fact"
import { ScaffoldCommand } from "~/src/presentation/components/custom/scaffold-command"
import { TierPrice } from "~/src/presentation/components/custom/tier-price"

const INTERNAL_PREFIX = "/"
const TASK_LIST_ITEM = "task-list-item"

const MdxLink = ({ href, ...props }: ComponentProps<"a">): JSX.Element => {
  if (href?.startsWith(INTERNAL_PREFIX) === true) {
    return <a href={localizeHref({ href, locale: getCurrentLocale() })} {...props} />
  }

  return <a href={href} {...props} />
}

const MdxCard = (props: ComponentProps<typeof Card>): JSX.Element => {
  const { href } = props

  if (href?.startsWith(INTERNAL_PREFIX) === true) {
    return <Card {...props} href={localizeHref({ href, locale: getCurrentLocale() })} />
  }

  return <Card {...props} />
}

const MdxListItem = ({ children, ...props }: ComponentProps<"li">): JSX.Element => {
  if (props.className === TASK_LIST_ITEM) {
    return (
      <li {...props}>
        <label>{children}</label>
      </li>
    )
  }

  return <li {...props}>{children}</li>
}

export const mdxComponents = {
  ...defaultMdxComponents,
  Accordion,
  Accordions,
  ActivationLimit,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card: MdxCard,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChangelogLinks,
  HeadStartTable,
  PostFaq,
  RegionalDiscounts,
  RepositoryFact,
  RepositoryTable,
  ScaffoldCommand,
  Separator,
  ShadcnCard,
  Step,
  Steps,
  Tab,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TierPrice,
  a: MdxLink,
  li: MdxListItem,
}
