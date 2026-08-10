import HeroSection from "@/components/sections/HeroSection"
import FeaturedRooms from "@/components/sections/FeaturedRooms"
import LocalBusinessJsonLd from "@/components/seo/LocalBusinessJsonLd"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata("Karaoke cao cấp tại TP. Hồ Chí Minh", "Không gian phòng hát riêng tư, âm thanh chất lượng và đội ngũ tư vấn đặt phòng theo nhu cầu.", "/")

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07080c]">
      <LocalBusinessJsonLd />
      <HeroSection />
      <FeaturedRooms />
    </main>
  )
}