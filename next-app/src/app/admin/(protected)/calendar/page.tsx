import { CalendarView } from "@/components/admin/calendar-view"
import { requirePermissionPage } from "@/lib/admin-auth"
import { resolveAdminBranchId } from "@/lib/admin-branch-scope"
import prisma from "@/lib/prisma"
export default async function AdminCalendarPage(){const admin=await requirePermissionPage("booking.read");const branchId=resolveAdminBranchId(admin);const [branches,rooms]=await Promise.all([prisma.branch.findMany({where:{status:"active",...(branchId?{id:branchId}:{})},select:{id:true,name:true},orderBy:{name:"asc"}}),prisma.room.findMany({where:branchId?{branchId}:{},select:{id:true,name:true,branch:{select:{name:true}}},orderBy:{name:"asc"}})]);return <CalendarView branches={branches} rooms={rooms}/>}