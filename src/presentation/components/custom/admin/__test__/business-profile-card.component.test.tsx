import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { stubImageEncoding } from "~/src/platform/testing/mocks/canvas"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  BUSINESS_NAME_MAX_LENGTH,
  BUSINESS_PROFILE_MUTATION_KEYS,
  BUSINESS_PROFILE_QUERY_KEYS,
} from "~/src/modules/business-profile/business-profile.constants"
import { BUSINESS_LOGO_MAX_BYTES, BUSINESS_LOGO_STORED_TYPES, logoEntries } from "~/src/modules/business-profile/business-profile.logo"
import type { BusinessProfile } from "~/src/modules/business-profile/business-profile.types"
import { businessProfileQuery } from "~/src/modules/business-profile/use-cases/get-business-profile"
import type { removeBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/remove-business-logo"
import type { updateBusinessProfileMutation } from "~/src/modules/business-profile/use-cases/update-business-profile"
import type { uploadBusinessLogoMutation } from "~/src/modules/business-profile/use-cases/upload-business-logo"

import { adminBusinessProfile } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { BusinessLogoCard, BusinessProfileCard } from "~/src/presentation/components/custom/admin/business-profile-card"

import validations from "~/messages/en-US/business-profile.validations.json"
import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.settings.json"

const mocks = vi.hoisted(() => ({
  remove: vi.fn<NonNullable<typeof removeBusinessLogoMutation.mutationFn>>(),
  update: vi.fn<NonNullable<typeof updateBusinessProfileMutation.mutationFn>>(),
  upload: vi.fn<NonNullable<typeof uploadBusinessLogoMutation.mutationFn>>(),
}))

vi.mock(import("~/src/modules/business-profile/use-cases/update-business-profile"), () => ({
  updateBusinessProfileMutation: { mutationFn: mocks.update, mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/business-profile/use-cases/upload-business-logo"), () => ({
  uploadBusinessLogoMutation: { mutationFn: mocks.upload, mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.UPLOAD_LOGO },
}))
vi.mock(import("~/src/modules/business-profile/use-cases/remove-business-logo"), () => ({
  removeBusinessLogoMutation: { mutationFn: mocks.remove, mutationKey: BUSINESS_PROFILE_MUTATION_KEYS.REMOVE_LOGO },
}))

const { business, logo: logoMessages } = labels
const LOGO = "logos/0195a2b4-6c8d-7e9f-8a0b-00000000b0b0.webp"
const PHOTO = new File([new Uint8Array(2500)], "logo.png", { type: "image/png" })
const SAVED = { address: "2 Market Square\nKraków", name: "Example Studio", supportEmail: "help@example.test" }

const renderCard = (card: "logo" | "profile", profile: BusinessProfile["detail"] = adminBusinessProfile()) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(businessProfileQuery.queryKey, profile)
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const ui = card === "logo" ? <BusinessLogoCard /> : <BusinessProfileCard />

  return {
    ...renderAdmin(ui, { path: "/admin/settings", queryClient }),
    invalidateQueries,
    user: userEvent.setup({ delay: null }),
  }
}

const fileInput = (): HTMLInputElement => {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")
  if (input === null) {
    throw new Error("Missing file input")
  }
  return input
}

beforeEach(() => {
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  stubImageEncoding()
  mocks.update.mockResolvedValue(SAVED)
  mocks.upload.mockResolvedValue({ logo: LOGO })
  mocks.remove.mockResolvedValue({ id: "business" })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("business profile card", () => {
  it("fills the form from the saved profile and saves the edited one", async () => {
    const { invalidateQueries, user } = renderCard("profile")
    const name = screen.getByRole("textbox", { name: business.name })

    expect(screen.getByRole("heading", { level: 2, name: business.title })).toBeVisible()
    expect(name).toHaveValue(adminBusinessProfile().name)
    expect(screen.getByRole("textbox", { name: business.supportEmail })).toHaveValue(adminBusinessProfile().supportEmail)
    expect(screen.getByRole("textbox", { name: business.address })).toHaveValue(adminBusinessProfile().address)

    await user.clear(name)
    await user.type(name, SAVED.name)
    await user.clear(screen.getByRole("textbox", { name: business.supportEmail }))
    await user.type(screen.getByRole("textbox", { name: business.supportEmail }), SAVED.supportEmail)
    await user.clear(screen.getByRole("textbox", { name: business.address }))
    await user.type(screen.getByRole("textbox", { name: business.address }), "2 Market Square{Enter}Kraków")
    await user.click(screen.getByRole("button", { name: business.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(business.saved)
    })
    expect(mocks.update.mock.calls[0]?.[0]).toStrictEqual(SAVED)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: BUSINESS_PROFILE_QUERY_KEYS.ALL })
  })

  it("explains each field it refuses after the field loses focus, and saves nothing", async () => {
    const { user } = renderCard("profile")

    await user.clear(screen.getByRole("textbox", { name: business.name }))
    await user.clear(screen.getByRole("textbox", { name: business.supportEmail }))
    await user.type(screen.getByRole("textbox", { name: business.supportEmail }), "help")
    await user.tab()
    await user.click(screen.getByRole("button", { name: business.save }))

    expect(await screen.findByText(validations.nameRequired)).toBeVisible()
    expect(screen.getByText(validations.emailInvalid)).toBeVisible()
    expect(screen.getByRole("textbox", { name: business.name })).toHaveAttribute("aria-invalid", "true")
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("names the length a long name may have", async () => {
    const { user } = renderCard("profile")

    await user.type(screen.getByRole("textbox", { name: business.name }), "x".repeat(BUSINESS_NAME_MAX_LENGTH))
    await user.tab()

    const message = validations.nameMaxLength.replace("{max}", String(BUSINESS_NAME_MAX_LENGTH))

    expect(await screen.findByText(message)).toBeVisible()
  })

  it("explains a save that failed", async () => {
    mocks.update.mockRejectedValueOnce(new Error(ERROR_CODES.FORBIDDEN))
    const { user } = renderCard("profile")

    await user.click(screen.getByRole("button", { name: business.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.FORBIDDEN)
    })
  })
})

describe("business logo card", () => {
  it("shows a placeholder for a profile without a logo and offers only an upload", () => {
    const { container } = renderCard("logo")

    expect(screen.getByRole("heading", { level: 2, name: logoMessages.title })).toBeVisible()
    expect(container.querySelector("[data-slot=business-logo] img")).toBeNull()
    expect(screen.getByText(/^AVIF, JPEG, PNG, or WEBP, up to 10 MB\. It is scaled to fit within 512 × 512 pixels/u)).toBeVisible()
    expect(screen.getByRole("button", { name: logoMessages.upload })).toBeVisible()
    expect(screen.queryByRole("button", { name: logoMessages.remove })).toBeNull()
  })

  it("scales the chosen image to fit and uploads it, after checking that one is chosen", async () => {
    const { invalidateQueries, user } = renderCard("logo")

    await user.click(screen.getByRole("button", { name: logoMessages.upload }))
    expect(await screen.findByText(validations.fileRequired)).toBeVisible()

    await user.upload(fileInput(), PHOTO)
    expect(screen.getByText("logo.png · 2.5 kB")).toBeVisible()
    await user.click(screen.getByRole("button", { name: logoMessages.upload }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(logoMessages.uploaded)
    })
    expect(createImageBitmap).toHaveBeenCalledWith(PHOTO)
    const [form] = mocks.upload.mock.calls[0] ?? []
    if (!(form instanceof FormData)) {
      throw new TypeError("The upload sent no form")
    }
    const { image } = logoEntries(form)
    expect(image instanceof File && image.type).toBe(BUSINESS_LOGO_STORED_TYPES.webp)
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: BUSINESS_PROFILE_QUERY_KEYS.ALL })
    await waitFor(() => {
      expect(screen.queryByText("logo.png · 2.5 kB")).toBeNull()
    })
  })

  it.each([
    { file: new File(["gif"], "logo.gif", { type: "image/gif" }), message: validations.logoTypeUnsupported },
    {
      file: new File([new Uint8Array(BUSINESS_LOGO_MAX_BYTES + 1)], "huge.png", { type: "image/png" }),
      message: validations.logoTooLarge.replace("{max}", "10"),
    },
  ])("refuses $file.name before encoding it", async ({ file, message }) => {
    renderCard("logo")
    const user = userEvent.setup({ applyAccept: false, delay: null })

    await user.upload(fileInput(), file)
    await user.click(screen.getByRole("button", { name: logoMessages.upload }))

    expect(await screen.findByText(message)).toBeVisible()
    expect(createImageBitmap).not.toHaveBeenCalled()
  })

  it("says so when the browser cannot read the image, and uploads nothing", async () => {
    stubImageEncoding({ decodes: false })
    const { user } = renderCard("logo")

    await user.upload(fileInput(), PHOTO)
    await user.click(screen.getByRole("button", { name: logoMessages.upload }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(logoMessages.unreadable)
    })
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("explains an upload that failed and keeps the chosen image", async () => {
    mocks.upload.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    const { user } = renderCard("logo")

    await user.upload(fileInput(), PHOTO)
    await user.click(screen.getByRole("button", { name: logoMessages.upload }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.TOO_MANY_REQUESTS)
    })
    expect(screen.getByText("logo.png · 2.5 kB")).toBeVisible()
  })

  it("shows the stored logo, offers to replace it and removes it", async () => {
    const { invalidateQueries, user } = renderCard("logo", adminBusinessProfile({ logo: LOGO }))

    const preview = logoMessages.preview.replace("{name}", adminBusinessProfile().name)

    expect(screen.getByRole("img", { name: preview })).toHaveAttribute("src", `/media/${LOGO}`)
    expect(screen.getByRole("button", { name: logoMessages.replace })).toBeVisible()

    await user.click(screen.getByRole("button", { name: logoMessages.remove }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(logoMessages.removed)
    })
    expect(mocks.remove).toHaveBeenCalledOnce()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: BUSINESS_PROFILE_QUERY_KEYS.ALL })
  })

  it("explains a removal that failed", async () => {
    mocks.remove.mockRejectedValueOnce(new Error(ERROR_CODES.NOT_FOUND))
    const { user } = renderCard("logo", adminBusinessProfile({ logo: LOGO }))

    await user.click(screen.getByRole("button", { name: logoMessages.remove }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })
})
