"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"

import { imageFallbacks, normalizeImagePath, type ImageFallbackKind } from "@/lib/image"

type SafeImageProps = Omit<ImageProps, "alt" | "src" | "onError"> & {
  src: string | null | undefined
  alt: string
  fallbackKind?: ImageFallbackKind
}

export default function SafeImage({
  src,
  alt,
  fallbackKind = "general",
  className,
  ...props
}: SafeImageProps) {
  const fallback = imageFallbacks[fallbackKind]
  const [currentSrc, setCurrentSrc] = useState(() => normalizeImagePath(src, fallbackKind))
  const [fallbackFailed, setFallbackFailed] = useState(false)

  if (fallbackFailed) {
    return <div role="img" aria-label={alt} className={className} />
  }

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback)
        } else {
          setFallbackFailed(true)
        }
      }}
    />
  )
}
