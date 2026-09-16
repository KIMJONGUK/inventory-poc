import { PopupCreateForm } from '@/components/PopupCreateForm'
import { db } from '@/lib/db'
import { LOCATION_TYPES } from '@/lib/constants'
import { getPlanStock } from '@/lib/inventory'
import { formatDate, today } from '@/lib/date'

export const dynamic = 'force-dynamic'

export default async function NewPopupPage() {
  const [products, sources] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, unit: true },
      orderBy: { name: 'asc' },
    }),
    db.location.findMany({
      where: { isActive: true, type: LOCATION_TYPES.OWN },
      select: { id: true, name: true },
    }),
  ])

  // 반출서에서 고를 수 있는 거점의 재고를 한 번에 받아 둔다 — 거점을 바꿔도 다시 묻지 않는다
  const stock = await getPlanStock(sources.map((s) => s.id))

  return (
    <PopupCreateForm
      products={products}
      sources={sources}
      stock={stock}
      today={formatDate(today())}
    />
  )
}
