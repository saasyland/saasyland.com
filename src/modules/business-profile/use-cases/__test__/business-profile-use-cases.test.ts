import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { BUSINESS_ADDRESS_MAX_LENGTH, BUSINESS_NAME_MAX_LENGTH } from "~/src/modules/business-profile/business-profile.constants"
import {
  BUSINESS_LOGO_MAX_BYTES,
  BUSINESS_LOGO_STORED_TYPES,
  BUSINESS_LOGO_UPLOADS_PER_MINUTE,
  logoFormData,
} from "~/src/modules/business-profile/business-profile.logo"
import { businessProfile } from "~/src/modules/business-profile/business-profile.schema"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import { removeBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/remove-business-logo"
import { updateBusinessProfileMutation } from "~/src/modules/business-profile/use-cases/update-business-profile"
import { uploadBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/upload-business-logo"

import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"

const LOGO_KEY = /^logos\/[\da-f-]{36}\.webp$/u

const PROFILE = { address: "1 Example Street\n00-001 Warsaw", name: "Example Ltd", supportEmail: "support@example.test" }

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: "business-admin" }))
}

const image = (type: string = BUSINESS_LOGO_STORED_TYPES.webp, body: BlobPart = "logo"): File => new File([body], "blob", { type })

const upload = (file: File = image()) => executeMutation(uploadBusinessLogoMutation, logoFormData(file))

const storedText = async (key: string): Promise<string | null> => {
  const object = await env.MEDIA.get(key)

  return object && new Response(object.body).text()
}

const removeProfile = (): PromiseLike<unknown> => db.delete(businessProfile)

beforeEach(async () => {
  await removeProfile()
  await db.insert(businessProfile).values({})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getBusinessProfile", () => {
  it("starts from the site's name and contact address, with no postal address and no logo", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(businessProfileQuery)).resolves.toStrictEqual({
      address: "",
      logo: null,
      name: APP_NAME,
      supportEmail: CONTACT_EMAIL,
    })
  })

  it("reports a missing profile as not found", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await removeProfile()

    await expect(executeQuery(businessProfileQuery)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("requires the settings permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(businessProfileQuery)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("updateBusinessProfile", () => {
  it("saves the trimmed name, support email and address, and keeps the logo", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { logo } = await upload()

    const saved = await executeMutation(updateBusinessProfileMutation, {
      address: `  ${PROFILE.address}  `,
      name: ` ${PROFILE.name} `,
      supportEmail: ` ${PROFILE.supportEmail} `,
    })

    expect(saved).toStrictEqual(PROFILE)
    await expect(executeQuery(businessProfileQuery)).resolves.toStrictEqual({ ...PROFILE, logo })
  })

  it.each([
    { input: { ...PROFILE, name: "  " }, name: "an empty name" },
    { input: { ...PROFILE, name: "x".repeat(BUSINESS_NAME_MAX_LENGTH + 1) }, name: "a name over the limit" },
    { input: { ...PROFILE, supportEmail: "support" }, name: "an address that is no email" },
    { input: { ...PROFILE, address: "x".repeat(BUSINESS_ADDRESS_MAX_LENGTH + 1) }, name: "an address over the limit" },
  ])("refuses $name and keeps the saved profile", async ({ input }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateBusinessProfileMutation, input)).rejects.toThrow(ERROR_CODES.VALIDATION)
    await expect(executeQuery(businessProfileQuery)).resolves.toMatchObject({ name: APP_NAME })
  })

  it("reports a missing profile as not found", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await removeProfile()

    await expect(executeMutation(updateBusinessProfileMutation, PROFILE)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("requires the settings permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(updateBusinessProfileMutation, PROFILE)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("uploadBusinessLogo", () => {
  it("stores the logo in R2 under the logos prefix with its type and records its key", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    const { logo } = await upload()

    expect(logo).toMatch(LOGO_KEY)
    await expect(storedText(logo ?? "")).resolves.toBe("logo")
    expect(put.mock.calls.map(([key, , options]) => [key, options])).toStrictEqual([
      [logo, { httpMetadata: { contentType: BUSINESS_LOGO_STORED_TYPES.webp } }],
    ])
  })

  it("stores a PNG logo under a png key", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { logo } = await upload(image(BUSINESS_LOGO_STORED_TYPES.png))

    expect(logo).toMatch(/\.png$/u)
  })

  it("replaces the logo and deletes the file of the one it replaces", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const first = await upload()

    const second = await upload()

    expect(second.logo).not.toBe(first.logo)
    await expect(storedText(first.logo ?? "")).resolves.toBeNull()
    await expect(storedText(second.logo ?? "")).resolves.toBe("logo")
  })

  it.each([
    { file: image("image/gif"), name: "a type it would not serve" },
    { file: image(BUSINESS_LOGO_STORED_TYPES.webp, ""), name: "an empty file" },
    { file: image(BUSINESS_LOGO_STORED_TYPES.webp, new Uint8Array(BUSINESS_LOGO_MAX_BYTES + 1)), name: "a file over the limit" },
  ])("refuses $name and stores nothing", async ({ file }) => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload(file)).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(put).not.toHaveBeenCalled()
  })

  it("reports a missing profile as not found and stores nothing", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await removeProfile()
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload()).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    expect(put).not.toHaveBeenCalled()
  })

  it("deletes the stored file when the profile disappears while it uploads", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = env.MEDIA.put.bind(env.MEDIA)
    const keys: string[] = []
    vi.spyOn(env.MEDIA, "put").mockImplementation(async (key, value, options) => {
      keys.push(key)
      await removeProfile()
      return put(key, value, options)
    })

    await expect(upload()).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    await expect(Promise.all(keys.map((key) => env.MEDIA.head(key)))).resolves.toStrictEqual([null])
  })

  it("limits how often one address uploads", async () => {
    signInAs(ROLE_CODES.ADMIN)
    for (let count = 0; count < BUSINESS_LOGO_UPLOADS_PER_MINUTE; count++) {
      await upload()
    }

    await expect(upload()).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })

  it("requires the settings permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(upload()).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("removeBusinessLogo", () => {
  it("clears the logo and deletes its file", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { logo } = await upload()

    await executeMutation(removeBusinessLogoMutation, undefined)

    await expect(executeQuery(businessProfileQuery)).resolves.toMatchObject({ logo: null })
    await expect(storedText(logo ?? "")).resolves.toBeNull()
  })

  it("leaves a profile without a logo as it is", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const remove = vi.spyOn(env.MEDIA, "delete")

    await executeMutation(removeBusinessLogoMutation, undefined)

    expect(remove).not.toHaveBeenCalled()
  })

  it("reports a missing profile as not found", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await removeProfile()

    await expect(executeMutation(removeBusinessLogoMutation, undefined)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("requires the settings permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(removeBusinessLogoMutation, undefined)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
