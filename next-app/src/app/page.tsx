import HeroSection from "@/components/sections/HeroSection"
import FeaturedRooms from "@/components/sections/FeaturedRooms"
import MenuPreview from "@/components/sections/MenuPreview"
import BranchPreview from "@/components/sections/BranchPreview"
import BookingCTA from "@/components/sections/BookingCTA"
import GalleryPreview from "@/components/sections/GalleryPreview"
import Testimonials from "@/components/sections/Testimonials"
import ContactCTA from "@/components/sections/ContactCTA"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07080c]">
      <HeroSection />
      <FeaturedRooms />
      <MenuPreview />
      <BranchPreview />
      <BookingCTA />
      <GalleryPreview />
      <Testimonials />
      <ContactCTA />
    </main>
  )
}