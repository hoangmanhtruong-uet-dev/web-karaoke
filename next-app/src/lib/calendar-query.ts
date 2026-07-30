import { Prisma, BookingStatus } from "@prisma/client"
import type { AdminPrincipal } from "@/lib/admin-auth"
import { getBookingBranchScope } from "@/lib/admin-branch-scope"
import prisma from "@/lib/prisma"
export class CalendarQueryError extends Error {
  constructor(message: string) { super(message); this.name = "CalendarQueryError" }
}
export function parseCalendarRange(from: string | null, to: string | null) { if (!from || !to) throw new CalendarQueryError("from and to are required"); const start=new Date(from), end=new Date(to); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start>=end) throw new CalendarQueryError("Invalid date range"); if (end.getTime()-start.getTime()>31*86400000) throw new CalendarQueryError("Calendar range is limited to 31 days"); return {start,end} }
export async function listCalendarBookings(input:{from:string|null;to:string|null;branchId?:string;roomId?:string}, principal:AdminPrincipal) { const {start,end}=parseCalendarRange(input.from,input.to); const scope:Prisma.BookingWhereInput=getBookingBranchScope(principal,input.branchId); return prisma.booking.findMany({where:{...(input.roomId?{roomId:input.roomId}:{}),startAt:{lt:end},endAt:{gt:start},status:{notIn:[BookingStatus.cancelled,BookingStatus.rejected,BookingStatus.expired]},...scope},orderBy:{startAt:"asc"},select:{id:true,code:true,customerName:true,startAt:true,endAt:true,status:true,branch:{select:{id:true,name:true}},room:{select:{id:true,name:true}}}}).then(items=>items.map(x=>({...x,customerName:x.customerName.length>2?x.customerName[0]+"•••":"•••"}))) }