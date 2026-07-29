import type { Metadata } from "next"
import { siteConfig } from "@/config/site"

export function absoluteUrl(path: string) { return new URL(path, siteConfig.siteUrl).toString() }
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = `${title} | ${siteConfig.brandName}`
  const url = absoluteUrl(path)
  const image = absoluteUrl(siteConfig.ogImage)
  return { title: fullTitle, description, alternates: { canonical: url }, openGraph: { title: fullTitle, description, url, siteName: siteConfig.brandName, locale: "vi_VN", type: "website", images: [{ url: image, alt: siteConfig.brandName }] }, twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] } }
}
export function localBusinessSchema(branch?: { name: string; address: string; city: string; phone: string; openingHours?: { open: string; close: string } }) {
  const data: Record<string, unknown> = { "@context": "https://schema.org", "@type": "Karaoke", name: branch?.name || siteConfig.brandName, url: absoluteUrl("/"), telephone: branch?.phone || siteConfig.hotline, address: { "@type": "PostalAddress", streetAddress: branch?.address || siteConfig.address, addressLocality: branch?.city || "TP. Hồ Chí Minh", addressCountry: "VN" } }
  if (branch?.openingHours) data.openingHours = `${branch.openingHours.open}-${branch.openingHours.close}`
  return data
}
