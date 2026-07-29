export type ImageFallbackKind = "branch" | "room" | "menu" | "general"

export const imageFallbacks: Record<ImageFallbackKind, string> = {
  branch: "/images/placeholders/branch-placeholder.svg",
  room: "/images/placeholders/room-placeholder.svg",
  menu: "/images/placeholders/menu-placeholder.svg",
  general: "/images/placeholders/general-placeholder.svg",
}

// Keep this manifest in sync when real files are added under public/images.
// Unknown local paths are normalized to a local fallback before rendering, so
// missing assets do not create avoidable 404 requests.
export const availableImagePaths = new Set<string>()

export function normalizeImagePath(
  source: string | null | undefined,
  kind: ImageFallbackKind = "general"
): string {
  const fallback = imageFallbacks[kind]
  const normalized = source?.trim() ?? ""

  if (!normalized || !normalized.startsWith("/")) return fallback
  if (normalized === fallback || availableImagePaths.has(normalized)) return normalized

  return fallback
}

export function isSupportedImagePath(source: string | null | undefined): boolean {
  const normalized = source?.trim() ?? ""
  return normalized.startsWith("/") && availableImagePaths.has(normalized)
}
