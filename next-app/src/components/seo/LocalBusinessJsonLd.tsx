import { localBusinessSchema } from "@/lib/seo"
import type { Branch } from "@/types"
export default function LocalBusinessJsonLd({ branch }: { branch?: Branch }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema(branch)) }} /> }
