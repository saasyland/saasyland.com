import { hashPassword } from "better-auth/crypto"
import { plugin } from "bun"
import { and, eq } from "drizzle-orm"
import { readFile } from "node:fs/promises"
import process from "node:process"
import { v7 } from "uuid"
import { getPlatformProxy } from "wrangler"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { account } from "~/src/modules/account/account.schema"
import { user } from "~/src/modules/user/user.schema"

import { LOCAL_ADMIN } from "./local-admin.ts"
import { licenseSeed } from "~/e2e/data/license.seed"
import { APP_NAME } from "~/src/presentation/branding"

const CURRICULUM = "content/courses/saasy-land-courses.json"

const platform = await getPlatformProxy<Cloudflare.Env>({ environment: ENVIRONMENT.DEVELOPMENT })

plugin({
  name: "cloudflare-workers",
  setup: (build) => {
    build.module("cloudflare:workers", () => ({ exports: { env: platform.env }, loader: "object" }))
  },
})

const seedAdmin = async (): Promise<void> => {
  const { db } = await import("~/src/integrations/drizzle-orm/drizzle.database")
  const password = strictPasswordSchema.parse(process.env[LOCAL_ADMIN.PASSWORD_VARIABLE] ?? LOCAL_ADMIN.DEFAULT_PASSWORD)
  const [admin] = await db
    .insert(user)
    .values({ email: LOCAL_ADMIN.EMAIL, emailVerified: true, id: v7(), name: APP_NAME, role: ROLE_CODES.ADMIN })
    .onConflictDoUpdate({ set: { emailVerified: true, role: ROLE_CODES.ADMIN }, target: user.email })
    .returning({ id: user.id })
  if (admin === undefined) {
    throw new Error(`Could not create ${LOCAL_ADMIN.EMAIL}`)
  }

  const credential = and(eq(account.userId, admin.id), eq(account.providerId, AUTH_PROVIDER.CREDENTIAL))
  await db.batch([
    db.delete(account).where(credential),
    db.insert(account).values({
      accountId: admin.id,
      id: v7(),
      password: await hashPassword(password),
      providerId: AUTH_PROVIDER.CREDENTIAL,
      userId: admin.id,
    }),
  ])

  const fallback = `the default password ${LOCAL_ADMIN.DEFAULT_PASSWORD}`
  const source = process.env[LOCAL_ADMIN.PASSWORD_VARIABLE] === undefined ? fallback : LOCAL_ADMIN.PASSWORD_VARIABLE
  process.stdout.write(`Admin: ${LOCAL_ADMIN.EMAIL}, signs in with ${source}\n`)
}

const seedCurriculum = async (): Promise<void> => {
  const { applyCourseImport, importSummary, planCourseImport, readCourseDocument } = await import("~/src/modules/course/course.transfer")
  const read = readCourseDocument(await readFile(CURRICULUM, "utf8"))
  if (!("document" in read)) {
    throw new Error(`${CURRICULUM} is not a course file this version can import: ${JSON.stringify(read.problems)}`)
  }

  const plan = await planCourseImport({ document: read.document, removeMissing: false })
  await applyCourseImport(plan)

  const { tallies, warnings } = importSummary(plan)
  const counts = Object.entries(tallies).map(
    ([entity, { create, unchanged, update }]) => `${entity} +${String(create)} ~${String(update)} =${String(unchanged)}`,
  )
  process.stdout.write(`Curriculum from ${CURRICULUM}: ${counts.join(", ")}; ${String(warnings.length)} missing videos\n`)
}

const seedLicences = async (): Promise<void> => {
  const { objects, statements } = await licenseSeed()
  await platform.env.DB.batch(statements.map((statement) => platform.env.DB.prepare(statement)))
  await Promise.all(
    objects.map(async ({ binding, file, key, metadata, type }) =>
      platform.env[binding].put(key, await readFile(file), { customMetadata: metadata, httpMetadata: { contentType: type } }),
    ),
  )
  process.stdout.write(`Licences, an order without a licence and a CLI template bundle: ${String(statements.length)} statements\n`)
}

try {
  await seedAdmin()
  await seedCurriculum()
  await seedLicences()
} finally {
  await platform.dispose()
}
