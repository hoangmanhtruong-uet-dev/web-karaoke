"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Filter, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { menuItems, popularCombos, type CategoryKey } from "@/data/menu"

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | "all">("all")

  const filteredItems = selectedCategory === "all"
    ? menuItems
    : menuItems.filter((item) => item.category === selectedCategory)

  const categoryKeys: Array<CategoryKey | "all"> = ["all", "combo", "drink", "food", "fruit", "snack"]

  const categoryLabels = {
    all: "Tất cả",
    combo: "Combo",
    drink: "Đồ uống",
    food: "Đồ ăn",
    fruit: "Trái cây",
    snack: "Snack",
  }

  return (
    <main className="min-h-screen bg-[#07080c]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c12] via-[#07080c] to-[#0a0c12]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgb(214_180_106/0.15),transparent_40%)]" />
        
        <div className="container-custom relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge variant="outline" className="mb-6 border-gold/30 bg-[#10131b]/60 text-gold hover:bg-[#10131b]/80">
              <Star className="mr-2 size-3 fill-gold text-gold" />
              Thực đơn sang trọng
            </Badge>
            
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              Menu đồ ăn & thức uống
            </h1>
            
            <p className="mt-6 max-w-xl mx-auto text-lg text-muted-foreground">
              Thưởng thức ẩm thực đa dạng trong không gian karaoke sang trọng
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="relative py-4">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap justify-center gap-2"
          >
            {categoryKeys.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`
                  relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-out
                  ${selectedCategory === cat 
                    ? "bg-gold text-[#08080b] shadow-[0_0_20px_rgba(214,180,106,0.3)]" 
                    : "bg-[#10131b] text-muted-foreground hover:text-foreground hover:bg-[#151923] border border-[#1f2330]"
                  }
                `}
              >
                {categoryLabels[cat]}
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-gold/20 to-transparent pointer-events-none"
                  />
                )}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Menu Items Grid */}
      <section className="relative py-16 lg:py-24">
        <div className="container-custom">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              {selectedCategory === "all" ? "Tất cả món ăn" : categoryLabels[selectedCategory]}
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                ({filteredItems.length} món)
              </span>
            </h2>
          </div>

          {filteredItems.length > 0 ? (
            <motion.div
              layout
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Card className="glass-panel transition-all duration-300 hover:border-gold/30 hover:shadow-[0_20px_60px_rgb(0_0_0/0.4)] hover:-translate-y-1">
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden rounded-t-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#10131b] via-[#0a0c12] to-[#151923]" />
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80')] bg-cover bg-center transition-transform duration-700 hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-transparent to-transparent" />
                      
                      {/* Category Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge variant="secondary" className="bg-[#10131b]/80 backdrop-blur border border-gold/20 text-gold shadow-sm">
                          {categoryLabels[item.category as CategoryKey] || item.category}
                        </Badge>
                      </div>
                      
                      {item.isSignature && (
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-gold text-[#08080b] shadow-lg shadow-gold/20">
                            <Star className="mr-1 size-3 fill-[#08080b] text-[#08080b]" />
                            Nổi bật
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading truncate text-lg font-bold text-foreground" title={item.name}>
                            {item.name}
                          </h3>
                          <p className="mt-1 truncate text-sm text-muted-foreground" title={item.description}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-3">
                      <div className="text-lg font-bold text-gold">
                        {item.price.toLocaleString("vi-VN")}đ
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        asChild
                        variant="outline"
                        className="luxury-button-outline w-full"
                      >
                        <Link href="/booking" className="flex items-center justify-center">
                          Đặt cùng phòng
                          <ChevronRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-[#10131b] p-6">
                <Filter className="size-12 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">Không tìm thấy món ăn</h3>
              <p className="mt-2 text-muted-foreground">Vui lòng chọn danh mục khác</p>
            </div>
          )}
        </div>
      </section>

      {/* Popular Combos Section */}
      <section className="relative py-16 lg:py-24 bg-[#0a0c12]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080c] via-[#0a0c12] to-[#07080c]" />
        <div className="container-custom relative z-10">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4 border-gold/30 bg-[#10131b]/60 text-gold hover:bg-[#10131b]/80">
              <Star className="mr-2 size-3 fill-gold text-gold" />
              Combo được đặt nhiều
            </Badge>
            <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Combo tiết kiệm nhất
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Các combo được khách hàng yêu thích và đặt nhiều nhất
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {popularCombos.map((combo, idx) => (
              <motion.div
                key={combo.id}
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="glass-panel overflow-hidden transition-all duration-300 hover:border-gold/30 hover:shadow-[0_20px_60px_rgba(214,180,106,0.25)]">
                  <div className="relative h-52 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#10131b] via-[#0a0c12] to-[#151923]" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80')] bg-cover bg-center transition-transform duration-700 hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-transparent to-transparent" />
                    
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-gold text-[#08080b] shadow-lg shadow-gold/20">
                        <Star className="mr-1 size-3 fill-[#08080b] text-[#08080b]" />
                        Phổ biến
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <h3 className="font-heading text-xl font-bold text-foreground">{combo.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{combo.description}</p>
                  </CardHeader>

                  <CardContent>
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Giá combo</span>
                      <span className="text-2xl font-bold text-gold">
                        {combo.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button asChild className="luxury-button w-full">
                      <Link href="/booking">
                        Đặt combo này
                        <ChevronRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 lg:py-28">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl bg-[#10131b] p-8 text-center sm:p-16 lg:p-20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#d6b46a/5] via-[#d6b46a/10] to-[#d6b46a/5]" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c756d?w=1200&q=80')] bg-cover bg-center opacity-10" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                Chọn món trước khi đặt phòng để được phục vụ nhanh hơn
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Đặt trước để chúng tôi chuẩn bị sẵn, tiết kiệm thời gian chờ đợi và tận hưởng trọn vẹn không gian karaoke sang trọng của chúng tôi
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild className="luxury-button h-14 px-8 text-lg shadow-lg shadow-gold/20">
<Link href="/booking">Đặt phòng ngay</Link>
                </Button>
                <Button asChild variant="outline" className="luxury-button-outline h-14 px-8 text-lg">
                  <Link href="/rooms">Xem phòng</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}