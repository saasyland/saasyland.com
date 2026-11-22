import { screen, waitFor } from "@testing-library/react"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderSettings, settingsSession } from "~/src/presentation/components/custom/settings/__test__/fixtures"
import { BackupCodes } from "~/src/presentation/components/custom/settings/backup-codes"

import authSecurityMessages from "~/messages/en-US/auth.security.json"
import { APP_NAME, APP_SLUG } from "~/src/presentation/branding"

const labels = authSecurityMessages.twoFactor
const BACKUP_CODES = ["first-backup-code", "second-backup-code"] as const
const DATA_URL_PREFIX = "data:text/plain;charset=utf-8,"

const renderCodes = (options: Parameters<typeof renderSettings>[1] = {}) => {
  const onDone = vi.fn<() => void>()
  return { ...renderSettings(<BackupCodes backupCodes={BACKUP_CODES} onDone={onDone} />, options), onDone }
}

const downloadedFile = (): string => {
  const href = screen.getByRole("link", { name: labels.downloadCodes }).getAttribute("href") ?? ""
  expect(href.startsWith(DATA_URL_PREFIX)).toBe(true)
  return decodeURIComponent(href.slice(DATA_URL_PREFIX.length))
}

const fileHeading = (email: string): string => labels.backupCodesFile.replace("{appName}", APP_NAME).replace("{email}", email)

beforeEach(() => {
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
})

describe("backup codes", () => {
  it("lists every code once", () => {
    renderCodes()

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual([...BACKUP_CODES])
  })

  it("copies the codes one per line", async () => {
    const { user } = renderCodes()
    await user.click(screen.getByRole("button", { name: labels.copyCodes }))

    expect(await navigator.clipboard.readText()).toBe(BACKUP_CODES.join("\n"))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledExactlyOnceWith(labels.codesCopied)
    })
  })

  it("asks to copy the codes by hand when the clipboard refuses", async () => {
    const { user } = renderCodes()
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("Clipboard denied"))
    await user.click(screen.getByRole("button", { name: labels.copyCodes }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(labels.copyFailed)
    })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("downloads a text file that names the account and lists the codes", () => {
    const session = settingsSession()
    renderCodes({ session })

    expect(screen.getByRole("link", { name: labels.downloadCodes })).toHaveAttribute("download", `${APP_SLUG}-backup-codes.txt`)
    expect(downloadedFile()).toBe([fileHeading(session.user.email), "", ...BACKUP_CODES, ""].join("\n"))
  })

  it("leaves the address out of the file when the session is gone", () => {
    renderCodes({ session: null })

    expect(downloadedFile()).toBe([fileHeading(""), "", ...BACKUP_CODES, ""].join("\n"))
  })

  it("finishes once the codes are saved", async () => {
    const { onDone, user } = renderCodes()
    await user.click(screen.getByRole("button", { name: labels.saved }))

    expect(onDone).toHaveBeenCalledOnce()
  })
})
