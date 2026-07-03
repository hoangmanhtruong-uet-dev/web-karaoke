"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { menuItems } from "@/data/menuItems"

const categories = {
  combo: "Combo",
  drink: "Đồ uống",
  food: "Đồ ăn",
} as const

const categoryKeys = Object.keys(categories) as Array<keyof typeof categories>

export default function MenuPreview() {
  const [activeTab, setActiveTab] = useState<"combo" | "drink" | "food">("combo")

  const items = menuItems.filter((item) => item.category === activeTab).slice(0, 6)

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c12] via-[#07080c] to-[#0a0c12]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(214_180_106/0.11),transparent_32%)]" />

      <div className="container-custom relative z-10">
        <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
          <p className="luxury-eyebrow mb-4">Menu lounge</p>
          <h2 className="section-title">Thực đơn tinh tuyển cho buổi hát trọn vẹn</h2>
          <p className="section-description mx-auto max-w-2xl">
            Đồ uống, món nhẹ và combo được trình bày gọn gàng, sang trọng để
            giữ nhịp vui xuyên suốt buổi tiệc.
          </p>
        </div>

        <Tabs
          defaultValue="combo"
          className="mx-auto max-w-5xl"
           onValueChange={(v) => setActiveTab(v as "combo" | "drink" | "food")}
        >
          <div className="mb-10 flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3 rounded-full border border-gold/15 bg-white/[0.035] p-1.5 backdrop-blur-xl">
              {categoryKeys.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="rounded-full text-sm text-muted-foreground data-[state=active]:bg-gold/12 data-[state=active]:text-gold-soft"
                >
                  {categories[cat]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="glass-panel overflow-hidden rounded-2xl">
                  <div className="relative h-44 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#191815] via-[#0a0c12] to-[#151923]" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598997435713-5f21e3c64f32?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-45 transition-transform duration-700 hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/45 to-transparent" />
                  </div>
                  <CardHeader className="px-6 pt-6">
                    <CardTitle className="font-heading text-xl tracking-tight">
                      {item.name}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    <div className="font-heading text-2xl font-semibold text-gold-soft">
                      {item.price.toLocaleString("vi-VN")}đ
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 pb-6">
                    <Button asChild variant="outline" className="luxury-button-outline w-full">
                      <Link href="/menu">
                        Xem chi tiết
                        <ChevronRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </Tabs>

        <div className="mt-10 text-center">
          <Button asChild className="luxury-button">
            <Link href="/menu">
              Xem toàn bộ menu
              <ChevronRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}