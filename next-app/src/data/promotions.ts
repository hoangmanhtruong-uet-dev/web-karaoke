export type Promotion = {
  id: string
  name: string
  description: string
  condition: string
  validTime: string
  highlight: string
}

export type PromotionFaq = {
  question: string
  answer: string
}

export const promotions: Promotion[] = [
  {
    id: "happy-hour",
    name: "Happy Hour",
    description:
      "Tận hưởng khung giờ vàng với mức ưu đãi hấp dẫn cho phòng hát và combo đồ uống chọn lọc.",
    condition:
      "Áp dụng cho khách đặt phòng từ 2 giờ trở lên, không cộng dồn cùng chương trình giảm giá khác.",
    validTime: "Thứ 2 - Thứ 6, 13:00 - 17:00",
    highlight: "Tiết kiệm đến 25%",
  },
  {
    id: "birthday",
    name: "Sinh nhật",
    description:
      "Biến buổi tiệc sinh nhật thành khoảnh khắc đáng nhớ với phòng hát sang trọng và setup tinh tế.",
    condition:
      "Áp dụng trong tuần sinh nhật, vui lòng xuất trình giấy tờ xác nhận ngày sinh khi nhận phòng.",
    validTime: "Tất cả các ngày trong tuần sinh nhật",
    highlight: "Tặng trang trí cơ bản",
  },
  {
    id: "friends-combo",
    name: "Combo nhóm bạn",
    description:
      "Gói ưu đãi dành cho nhóm bạn gồm giờ hát, đồ uống và món ăn nhẹ để cuộc vui trọn vẹn hơn.",
    condition:
      "Áp dụng cho nhóm từ 6 khách, cần đặt trước tối thiểu 2 giờ để chuẩn bị combo tốt nhất.",
    validTime: "Hằng ngày, 11:00 - 23:00",
    highlight: "Combo tiết kiệm",
  },
  {
    id: "early-booking",
    name: "Ưu đãi đặt sớm",
    description:
      "Chủ động chọn phòng đẹp và khung giờ lý tưởng với đặc quyền dành riêng cho khách đặt lịch sớm.",
    condition:
      "Áp dụng cho đặt phòng trước ít nhất 24 giờ và xác nhận giữ chỗ theo hướng dẫn của Royal Karaoke.",
    validTime: "Áp dụng quanh năm",
    highlight: "Ưu tiên phòng đẹp",
  },
]

export const promotionFaqs: PromotionFaq[] = [
  {
    question: "Ưu đãi có được cộng dồn với voucher khác không?",
    answer:
      "Mỗi lượt đặt phòng chỉ áp dụng một chương trình ưu đãi, trừ khi có thông báo riêng từ Royal Karaoke.",
  },
  {
    question: "Tôi cần đặt trước bao lâu để nhận ưu đãi?",
    answer:
      "Bạn nên đặt trước tối thiểu 2 giờ. Riêng ưu đãi đặt sớm cần đặt trước ít nhất 24 giờ.",
  },
  {
    question: "Ưu đãi có áp dụng vào cuối tuần không?",
    answer:
      "Một số ưu đãi áp dụng hằng ngày, một số chỉ áp dụng theo khung giờ hoặc ngày cụ thể. Vui lòng xem thời gian áp dụng trên từng thẻ ưu đãi.",
  },
]