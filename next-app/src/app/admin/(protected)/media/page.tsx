import { requirePermissionPage } from "@/lib/admin-auth"
import prisma from "@/lib/prisma"
import { MediaManager } from "@/components/admin/media-manager"
export default async function MediaPage(){await requirePermissionPage("room.manage");const [branches,rooms,menu]=await Promise.all([prisma.branch.findMany({select:{id:true,name:true,imageUrl:true}}),prisma.room.findMany({select:{id:true,name:true,imageUrl:true,branch:{select:{name:true}}}}),prisma.menuItem.findMany({select:{id:true,name:true,imageUrl:true}})]);return <MediaManager branches={branches} rooms={rooms} menu={menu} />}