import type { ComponentProps, JSX } from "react"

import { Accordion, Accordions } from "fumadocs-ui/components/accordion"
import { Step, Steps } from "fumadocs-ui/components/steps"
import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import defaultMdxComponents from "fumadocs-ui/mdx"

import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
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

const INTERNAL_PREFIX = "/"

const MdxLink = ({ href, ...props }: ComponentProps<"a">): JSX.Element => {
  if (href?.startsWith(INTERNAL_PREFIX) === true) {
    return <a href={localizePathname({ locale: getCurrentLocale(), pathname: href })} {...props} />
  }

  return <a href={href} {...props} />
}

export const mdxComponents = {
  ...defaultMdxComponents,
  Accordion,
  Accordions,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
  a: MdxLink,
}
