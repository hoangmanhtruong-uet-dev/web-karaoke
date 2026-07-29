import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { branches } from "@/data/branches"
import { pageMetadata } from "@/lib/seo"
import LocalBusinessJsonLd from "@/components/seo/LocalBusinessJsonLd"

export function generateStaticParams() { return branches.filter((branch) => branch.status === "active").map((branch) => ({ slug: branch.slug })) }
export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { return params.then(({ slug }) => { const branch = branches.find((item) => item.slug === slug && item.status === "active"); return branch ? pageMetadata(branch.name, `${branch.name}: dia chi, lien he va thong tin phuc vu.`, `/branches/${branch.slug}`) : pageMetadata("Chi nhanh", "Thong tin chi nhanh Royal Karaoke.", "/branches") }) }
export default async function BranchDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const branch = branches.find((item) => item.slug === slug && item.status === "active"); if (!branch) notFound(); return <main className="min-h-screen bg-[#07080c] px-6 py-32"><LocalBusinessJsonLd branch={branch} /><div className="mx-auto max-w-3xl"><p className="luxury-eyebrow">Chi nhanh</p><h1 className="mt-4 font-heading text-4xl font-bold text-foreground">{branch.name}</h1><p className="mt-6 text-muted-foreground">{branch.address}, {branch.district}, {branch.city}</p><p className="mt-2 text-muted-foreground">Lien he: {branch.phone}</p><div className="mt-8 flex flex-wrap gap-3">{branch.amenities.map((amenity) => <span key={amenity} className="rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-sm text-muted-foreground">{amenity}</span>)}</div><Link href="/booking" className="luxury-button mt-10 inline-flex rounded-full px-6 py-3">Dat phong tai chi nhanh nay</Link></div></main> }
