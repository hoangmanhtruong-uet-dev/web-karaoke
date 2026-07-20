export type BranchStatus = "active" | "maintenance" | "coming-soon";

export type RoomTier = "standard" | "vip" | "premium" | "presidential";

export type RoomStatus = "available" | "occupied" | "maintenance";

export type MenuCategory = "drink" | "food" | "combo" | "fruit" | "snack";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checkedIn"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  email: string;
  openingHours: {
    open: string;
    close: string;
  };
  amenities: string[];
  status: BranchStatus;
  imageUrl: string;
}

export interface Room {
  id: string;
  branchId: Branch["id"];
  name: string;
  slug: string;
  tier: RoomTier;
  capacity: {
    min: number;
    max: number;
  };
  hourlyRate: number;
  features: string[];
  status: RoomStatus;
  imageUrl: string;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  category: MenuCategory;
  description: string;
  price: number;
  imageUrl: string;
  isSignature: boolean;
  isAvailable: boolean;
}

export interface Booking {
  id: string;
  branchId: Branch["id"];
  roomId: Room["id"];
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guestCount: number;
  date: string;
  startTime: string;
  durationHours: number;
  status: BookingStatus;
  note?: string;
  createdAt: string;
}
