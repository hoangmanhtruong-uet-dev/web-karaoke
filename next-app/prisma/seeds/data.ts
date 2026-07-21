type SeedBranch = {
  id: string
  name: string
  slug: string
  address: string
  district: string
  city: string
  phone: string
  email: string
  openingHours: { open: string; close: string }
  amenities: string[]
  status: "active" | "maintenance" | "coming-soon" | "comingSoon"
  imageUrl: string
}

type SeedRoom = {
  id: string
  branchId: string
  name: string
  slug: string
  tier: "standard" | "vip" | "premium" | "presidential"
  capacity: { min: number; max: number }
  hourlyRate: number
  features: string[]
  status: "available" | "occupied" | "maintenance"
  imageUrl: string
}

type SeedMenuItem = {
  id: string
  name: string
  slug: string
  category: "drink" | "food" | "combo" | "fruit" | "snack"
  description: string
  price: number
  imageUrl: string
  isSignature: boolean
  isAvailable: boolean
}

type SeedService = {
  id: string
  name: string
  slug: string
  category: "staff" | "decoration" | "equipment" | "event" | "other"
  description: string
  unit: "perBooking" | "perHour" | "perPerson" | "perItem"
  price: number
  isAvailable: boolean
  imageUrl: string | null
}

export const seedServices: SeedService[] = [
  {
    id: "service-dj",
    name: "DJ riêng tại phòng",
    slug: "dj-rieng-tai-phong",
    category: "staff",
    description: "DJ phối nhạc và hỗ trợ chương trình theo yêu cầu của nhóm khách.",
    unit: "perHour",
    price: 800_000,
    isAvailable: true,
    imageUrl: null,
  },
  {
    id: "service-birthday-decoration",
    name: "Trang trí sinh nhật",
    slug: "trang-tri-sinh-nhat",
    category: "decoration",
    description: "Bóng bay, banner tên, nến và bàn quà theo chủ đề cơ bản.",
    unit: "perBooking",
    price: 650_000,
    isAvailable: true,
    imageUrl: null,
  },
  {
    id: "service-photographer",
    name: "Chụp ảnh sự kiện",
    slug: "chup-anh-su-kien",
    category: "event",
    description: "Nhiếp ảnh gia chụp và bàn giao ảnh đã chỉnh màu sau sự kiện.",
    unit: "perHour",
    price: 900_000,
    isAvailable: true,
    imageUrl: null,
  },
  {
    id: "service-extra-microphone",
    name: "Micro không dây bổ sung",
    slug: "micro-khong-day-bo-sung",
    category: "equipment",
    description: "Micro không dây bổ sung ngoài thiết bị tiêu chuẩn của phòng.",
    unit: "perItem",
    price: 100_000,
    isAvailable: true,
    imageUrl: null,
  },
  {
    id: "service-party-host",
    name: "MC hoạt náo",
    slug: "mc-hoat-nao",
    category: "event",
    description: "MC dẫn chương trình, tổ chức trò chơi và kết nối khách mời.",
    unit: "perBooking",
    price: 1_500_000,
    isAvailable: true,
    imageUrl: null,
  },
]

// Data từ next-app/src/data/branches.ts
export const seedBranches: SeedBranch[] = [
  {
    id: "branch-01",
    name: "VivaStar Karaoke - Trung Tâm",
    slug: "vivastar-trung-tam",
    address: "123 Nguyễn Huệ, Phường Bến Nghé",
    district: "Quận 1",
    city: "Hồ Chí Minh",
    phone: "028 3822 6688",
    email: "trungtam@vivastar.vn",
    openingHours: { open: "09:00", close: "06:00" },
    amenities: [
      "Hồ bơi vô cực",
      "Sảnh chờ VIP",
      "Bar cao cấp",
      "Bãi đỗ xe miễn phí",
      "Wifi tốc độ cao",
    ],
    status: "active",
    imageUrl: "/images/branches/trung-tam.jpg",
  },
  {
    id: "branch-02",
    name: "VivaStar Karaoke - Sài Gòn Pearl",
    slug: "vivastar-sai-gon-pearl",
    address: "92 Nguyễn Hữu Cảnh, Phường 22",
    district: "Quận Bình Thạnh",
    city: "Hồ Chí Minh",
    phone: "028 3512 7799",
    email: "saigonpearl@vivastar.vn",
    openingHours: { open: "10:00", close: "06:00" },
    amenities: [
      "View sông Sài Gòn",
      "Sky Lounge",
      "Phòng hát đẳng cấp",
      "Ẩm thực cao cấp",
      "Bãi đỗ xe rộng",
    ],
    status: "active",
    imageUrl: "/images/branches/sai-gon-pearl.jpg",
  },
  {
    id: "branch-03",
    name: "VivaStar Karaoke - Landmark 81",
    slug: "vivastar-landmark-81",
    address: "Tầng 68, Landmark 81, 208 Nguyễn Hữu Cảnh",
    district: "Quận Bình Thạnh",
    city: "Hồ Chí Minh",
    phone: "028 3622 8811",
    email: "landmark81@vivastar.vn",
    openingHours: { open: "10:00", close: "05:00" },
    amenities: [
      "Toàn cảnh Sài Gòn",
      "Hệ thống âm thanh Dolby Atmos",
      "Phòng hát cách âm cao cấp",
      "Dịch vụ butler 24/7",
      "VIP Lounge",
    ],
    status: "active",
    imageUrl: "/images/branches/landmark-81.jpg",
  },
  {
    id: "branch-04",
    name: "VivaStar Karaoke - Phú Mỹ Hưng",
    slug: "vivastar-phu-my-hung",
    address: "Số 1 Nguyễn Đức Cảnh, Khu đô thị Phú Mỹ Hưng",
    district: "Quận 7",
    city: "Hồ Chí Minh",
    phone: "028 5411 3377",
    email: "phumyhung@vivastar.vn",
    openingHours: { open: "09:00", close: "06:00" },
    amenities: [
      "Khuôn viên xanh",
      "Hồ bơi ngoài trời",
      "Phòng gia đình",
      "Khu vui chơi trẻ em",
      "Nhà hàng Á - Âu",
    ],
    status: "active",
    imageUrl: "/images/branches/phu-my-hung.jpg",
  },
]

// Data từ next-app/src/data/rooms.ts
export const seedRooms: SeedRoom[] = [
  // Branch 1 - Trung Tâm (2 rooms)
  {
    id: "room-01",
    branchId: "branch-01",
    name: "Phòng Diamond",
    slug: "phong-diamond",
    tier: "presidential",
    capacity: { min: 2, max: 20 },
    hourlyRate: 1_200_000,
    features: [
      "Hệ thống âm thanh JBL Professional",
      "Màn hình LED 85 inch",
      "Đèn laser Axent",
      "Sofa da nhập khẩu Ý",
      "Karaoke Wifi không giới hạn",
      "Phòng tắm riêng Jacuzzi",
    ],
    status: "available",
    imageUrl: "/images/rooms/diamond.jpg",
  },
  {
    id: "room-02",
    branchId: "branch-01",
    name: "Phòng Ruby",
    slug: "phong-ruby",
    tier: "vip",
    capacity: { min: 2, max: 12 },
    hourlyRate: 700_000,
    features: [
      "Âm thanh Yamaha",
      "Màn hình 65 inch 4K",
      "Hệ thống đèn LED RGB",
      "Bàn pha chế tại chỗ",
    ],
    status: "available",
    imageUrl: "/images/rooms/ruby.jpg",
  },

  // Branch 2 - Sài Gòn Pearl (2 rooms)
  {
    id: "room-03",
    branchId: "branch-02",
    name: "Phòng Sky Pearl",
    slug: "phong-sky-pearl",
    tier: "premium",
    capacity: { min: 2, max: 16 },
    hourlyRate: 950_000,
    features: [
      "View toàn cảnh sông Sài Gòn",
      "Hệ thống âm thanh Bose",
      "Sân thượng riêng",
      "Khu vực bar mini",
      "Máy lọc không khí",
    ],
    status: "available",
    imageUrl: "/images/rooms/sky-pearl.jpg",
  },
  {
    id: "room-04",
    branchId: "branch-02",
    name: "Phòng Ocean",
    slug: "phong-ocean",
    tier: "standard",
    capacity: { min: 2, max: 8 },
    hourlyRate: 450_000,
    features: [
      "Âm thanh tiêu chuẩn",
      "Màn hình 55 inch",
      "Đèn LED cơ bản",
      "Micro không dây",
    ],
    status: "available",
    imageUrl: "/images/rooms/ocean.jpg",
  },

  // Branch 3 - Landmark 81 (2 rooms)
  {
    id: "room-05",
    branchId: "branch-03",
    name: "Phòng Cloud Nine",
    slug: "phong-cloud-nine",
    tier: "presidential",
    capacity: { min: 4, max: 30 },
    hourlyRate: 2_500_000,
    features: [
      "Tầm nhìn 360° Landmark 81",
      "Dolby Atmos 7.1.4",
      "Màn hình microLED 120 inch",
      "Phòng khách riêng",
      "Phòng tắm xông hơi",
      "Butler phục vụ 24/7",
    ],
    status: "available",
    imageUrl: "/images/rooms/cloud-nine.jpg",
  },
  {
    id: "room-06",
    branchId: "branch-03",
    name: "Phòng Starlight",
    slug: "phong-starlight",
    tier: "premium",
    capacity: { min: 2, max: 14 },
    hourlyRate: 1_100_000,
    features: [
      "Trần sao lấp lánh",
      "Âm thanh Harman Kardon",
      "Màn hình 75 inch OLED",
      "Bàn billiard mini",
      "Bar cocktail",
    ],
    status: "maintenance",
    imageUrl: "/images/rooms/starlight.jpg",
  },

  // Branch 4 - Phú Mỹ Hưng (2 rooms)
  {
    id: "room-07",
    branchId: "branch-04",
    name: "Phòng Garden",
    slug: "phong-garden",
    tier: "vip",
    capacity: { min: 2, max: 15 },
    hourlyRate: 800_000,
    features: [
      "View vườn nhiệt đới",
      "Âm thanh Sony",
      "Khu BBQ ngoài trời",
      "Màn hình 65 inch",
      "Bàn ghế ngoài hiên",
    ],
    status: "available",
    imageUrl: "/images/rooms/garden.jpg",
  },
  {
    id: "room-08",
    branchId: "branch-04",
    name: "Phòng Family",
    slug: "phong-family",
    tier: "standard",
    capacity: { min: 2, max: 10 },
    hourlyRate: 500_000,
    features: [
      "Không gian thân thiện gia đình",
      "Khu vui chơi trẻ em",
      "Âm thanh tiêu chuẩn",
      "Màn hình 55 inch",
      "Đồ chơi trẻ em",
    ],
    status: "available",
    imageUrl: "/images/rooms/family.jpg",
  },
]

// Data từ next-app/src/data/menu.ts
export const seedMenuItems: SeedMenuItem[] = [
  // Đồ uống - 8 items
  {
    id: "drink-01",
    name: "Rượu Vodka Stolichnaya",
    slug: "ruou-vodka-stolichnaya",
    category: "drink",
    description: "Rượu Vodka cao cấp từ Nga, nguyên chất 40%",
    price: 1_200_000,
    imageUrl: "/images/menu/vodka.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "drink-02",
    name: "Rượu Whiskey Jack Daniel's",
    slug: "ruou-whiskey-jack-daniels",
    category: "drink",
    description: "Whiskey hàng đầu thế giới, hương vị đậm đà",
    price: 1_800_000,
    imageUrl: "/images/menu/whiskey.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "drink-03",
    name: "Bia Tiger",
    slug: "bia-tiger",
    category: "drink",
    description: "Bia đậm vị, mát lạnh, 330ml",
    price: 60_000,
    imageUrl: "/images/menu/tiger.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "drink-04",
    name: "Bia Saigon Special",
    slug: "bia-saigon-special",
    category: "drink",
    description: "Bia đặc sản Sài Gòn, mát lạnh, 330ml",
    price: 55_000,
    imageUrl: "/images/menu/saigon.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "drink-05",
    name: "Nước Ép Cam Tươi",
    slug: "nuoc-ep-cam-tuoi",
    category: "drink",
    description: "Nước cam tươi 100%, không đường, 500ml",
    price: 95_000,
    imageUrl: "/images/menu/cam-tuoi.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "drink-06",
    name: "Cà phê Sữa Đá",
    slug: "ca-phe-sua-da",
    category: "drink",
    description: "Cà phê phin truyền thống, sữa đặc ngọt",
    price: 45_000,
    imageUrl: "/images/menu/ca-phe.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "drink-07",
    name: "Rượu Sake premium",
    slug: "ruou-sake-premium",
    category: "drink",
    description: "Sake cao cấp Nhật Bản, 720ml",
    price: 950_000,
    imageUrl: "/images/menu/sake.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "drink-08",
    name: "Nước Suối Lavie",
    slug: "nuoc-suoi-lavie",
    category: "drink",
    description: "Nước suối Lavie 500ml",
    price: 25_000,
    imageUrl: "/images/menu/lavie.jpg",
    isSignature: false,
    isAvailable: true,
  },

  // Đồ ăn - 7 items
  {
    id: "food-01",
    name: "Gà Tanpopo Number 1",
    slug: "ga-tanpopo-number-1",
    category: "food",
    description: "Gà chiên giòn số 1, ăn kèm tương ớt",
    price: 180_000,
    imageUrl: "/images/menu/ga-tanpopo.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "food-02",
    name: "Bò Tái Chanh",
    slug: "bo-tai-chanh",
    category: "food",
    description: "Thịt bò tái chanh tươi ngon, đậm vị",
    price: 220_000,
    imageUrl: "/images/menu/bo-tai.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "food-03",
    name: "Tôm Hùm Nướng Muối Ớt",
    slug: "tom-hum-nuong-muoi-ot",
    category: "food",
    description: "Tôm hùm Nha Trang nướng muối ớt cay nồng",
    price: 650_000,
    imageUrl: "/images/menu/tom-hum.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "food-04",
    name: "Nem Nướng Nha Trang",
    slug: "nem-nuong-nha-trang",
    category: "food",
    description: "Nem nướng đặc sản Nha Trang, 300g",
    price: 150_000,
    imageUrl: "/images/menu/nem-nuong.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "food-05",
    name: "Bắp Cải Nướng",
    slug: "bap-cai-nuong",
    category: "food",
    description: "Bắp cải nướng phô mai, 200g",
    price: 90_000,
    imageUrl: "/images/menu/bap-cai.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "food-06",
    name: "Heo Quay Croquet",
    slug: "heo-quay-croquet",
    category: "food",
    description: "Heo quay giòn, ăn kèm sốt TERIYAKI",
    price: 160_000,
    imageUrl: "/images/menu/heo-quay.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "food-07",
    name: "Chả Giò Giòn",
    slug: "cha-gio-gion",
    category: "food",
    description: "Chả giò ròn giòn, 6 cái",
    price: 120_000,
    imageUrl: "/images/menu/cha-gio.jpg",
    isSignature: false,
    isAvailable: true,
  },

  // Combo - 5 items
  {
    id: "combo-01",
    name: "Combo A - Standard",
    slug: "combo-a-standard",
    category: "combo",
    description: "Combo cho 2-4 người: Gà Tanpopo + 2 Bia Tiger + Nước Cam",
    price: 480_000,
    imageUrl: "/images/menu/combo-a.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "combo-02",
    name: "Combo B - VIP",
    slug: "combo-b-vip",
    category: "combo",
    description: "Combo cho 6-8 người: Gà Tanpopo + Bò Tái + Tôm Hùm + Rượu Vodka",
    price: 2_500_000,
    imageUrl: "/images/menu/combo-b.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "combo-03",
    name: "Combo C - gia đình",
    slug: "combo-c-gia-dinh",
    category: "combo",
    description: "Combo cho gia đình: Nem Nướng + Heo Quay + Bắp Cải + Nước Suối",
    price: 500_000,
    imageUrl: "/images/menu/combo-c.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "combo-04",
    name: "Combo D - Premium",
    slug: "combo-d-premium",
    category: "combo",
    description: "Combo cao cấp: Whiskey + Tôm Hùm + Bò Tái + Nem Nướng",
    price: 3_200_000,
    imageUrl: "/images/menu/combo-d.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "combo-05",
    name: "Combo E - Party",
    slug: "combo-e-party",
    category: "combo",
    description: "Combo tiệc tùng cho 10 người: Đồ ăn đa dạng + Rượu Sake + Bia",
    price: 4_500_000,
    imageUrl: "/images/menu/combo-e.jpg",
    isSignature: true,
    isAvailable: true,
  },

  // Trái cây - 6 items
  {
    id: "fruit-01",
    name: "Dưa Hấu",
    slug: "dua-hau",
    category: "fruit",
    description: "Dưa hấu đỏ ngọt lạnh, cắt miếng",
    price: 120_000,
    imageUrl: "/images/menu/dua-hau.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "fruit-02",
    name: "Dừa tươi",
    slug: "dua-tuoi",
    category: "fruit",
    description: "Dừa tươi nguyên trái, kèm đá",
    price: 45_000,
    imageUrl: "/images/menu/dua-tuoi.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "fruit-03",
    name: "Thanh Long",
    slug: "thanh-long",
    category: "fruit",
    description: "Thanh long đỏ cắt miếng, sốt dừa",
    price: 95_000,
    imageUrl: "/images/menu/thanh-long.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "fruit-04",
    name: "Dứa ( thơm ) cắt miếng",
    slug: "dua-cuat-mieng",
    category: "fruit",
    description: "Dứa cắt miếng tươi mát, không đường",
    price: 75_000,
    imageUrl: "/images/menu/dua.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "fruit-05",
    name: "Chuối",
    slug: "chuoi",
    category: "fruit",
    description: "Chuối tiêu ngọt, cung cấp năng lượng",
    price: 35_000,
    imageUrl: "/images/menu/chuoi.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "fruit-06",
    name: "Trái cây hộp",
    slug: "trai-cay-hop",
    category: "fruit",
    description: "Trái cây hộp đa dạng, 350g",
    price: 85_000,
    imageUrl: "/images/menu/trai-cay-hop.jpg",
    isSignature: false,
    isAvailable: true,
  },

  // Snack - 6 items
  {
    id: "snack-01",
    name: "Khoai Tây Chiên",
    slug: "khoai-tay-chien",
    category: "snack",
    description: "Khoai tây chiên giòn, sốt mayonnaise",
    price: 65_000,
    imageUrl: "/images/menu/khoai-tay.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "snack-02",
    name: "Bắp rang bơ",
    slug: "bap-rang-bo",
    category: "snack",
    description: "Bắp rang bơ thơm ngậy, 200g",
    price: 50_000,
    imageUrl: "/images/menu/bap-rang-bo.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "snack-03",
    name: "Hạt hướng dương",
    slug: "hat-huong-duong",
    category: "snack",
    description: "Hạt hướng dương rang muối, 100g",
    price: 40_000,
    imageUrl: "/images/menu/hat-huong-duong.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "snack-04",
    name: "Khô bò sợi",
    slug: "kho-bo-soi",
    category: "snack",
    description: "Khô bò sợi cay ngọt, 150g",
    price: 120_000,
    imageUrl: "/images/menu/kho-bo.jpg",
    isSignature: true,
    isAvailable: true,
  },
  {
    id: "snack-05",
    name: "Pía sô cô la",
    slug: "pia-so-co-la",
    category: "snack",
    description: "Pía sô cô la nóng giòn, 3 cái",
    price: 55_000,
    imageUrl: "/images/menu/pia.jpg",
    isSignature: false,
    isAvailable: true,
  },
  {
    id: "snack-06",
    name: "Bánh quy sô cô la",
    slug: "banh-quy-so-co-la",
    category: "snack",
    description: "Bánh quy sô cô la mềm, 200g",
    price: 70_000,
    imageUrl: "/images/menu/banh-quy.jpg",
    isSignature: false,
    isAvailable: true,
  },
]
