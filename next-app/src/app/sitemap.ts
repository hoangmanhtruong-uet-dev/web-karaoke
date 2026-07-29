import type { MetadataRoute } from "next"
import { branches } from "@/data/branches"
import { siteConfig } from "@/config/site"
export default function sitemap(): MetadataRoute.Sitemap { const now = new Date(); return [{ url: siteConfig.siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 }, ...["rooms","gallery","menu","branches","promotions","contact","booking"].map((path) => ({ url: `${siteConfig.siteUrl}/${path}`, lastModified: now, changeFrequency: "weekly" as const, priority: path === "booking" ? 0.8 : 0.7 })), ...branches.filter((branch) => branch.status === "active").map((branch) => ({ url: `${siteConfig.siteUrl}/branches/${branch.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 }))] }
