import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import SafeImage from "@/components/ui/SafeImage"
import { availableImagePaths, imageFallbacks } from "@/lib/image"

afterEach(() => {
  availableImagePaths.delete("/images/test-room.jpg")
})

describe("SafeImage", () => {
  it("uses the local category fallback for a missing asset", () => {
    render(
      <SafeImage
        src="/images/rooms/missing.jpg"
        alt="Phòng chưa có ảnh"
        fallbackKind="room"
        fill
        sizes="100vw"
      />
    )

    expect(screen.getByAltText("Phòng chưa có ảnh").getAttribute("src")).toContain(imageFallbacks.room)
  })

  it("switches once on load failure and stops if the fallback also fails", () => {
    availableImagePaths.add("/images/test-room.jpg")
    render(
      <SafeImage
        src="/images/test-room.jpg"
        alt="Phòng thử nghiệm"
        fallbackKind="room"
        fill
        sizes="100vw"
      />
    )

    const image = screen.getByAltText("Phòng thử nghiệm")
    fireEvent.error(image)
    expect(screen.getByAltText("Phòng thử nghiệm").getAttribute("src")).toContain(imageFallbacks.room)

    fireEvent.error(screen.getByAltText("Phòng thử nghiệm"))
    expect(screen.getByRole("img", { name: "Phòng thử nghiệm" })).not.toBe(
      image
    )
  })
})
