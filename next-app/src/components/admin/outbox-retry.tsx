"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
export function OutboxRetry({id}:{id:string}){const router=useRouter();const[pending,setPending]=useState(false);return <button disabled={pending} onClick={async()=>{setPending(true);await fetch(`/api/admin/outbox/${id}/retry`,{method:"POST"});setPending(false);router.refresh()}} className="mt-3 text-sm text-gold">{pending?"Đang retry...":"Retry dead-letter"}</button>}
