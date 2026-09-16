import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db, ids, totalStock } from './helpers'
import { getPlanStock } from '@/lib/inventory'
import { planStockKey } from '@/lib/plan-stock'
import { createPopupTx } from '@/lib/popup'
import { applyMovement } from '@/lib/stock'
import { addDays, dateOnly, today } from '@/lib/date'

/**
 * 반출서(S6)의 가용 재고 안내.
 *
 * 반출서는 계획이다 — 여기서 재고는 1개도 움직이지 않는다.
 * 그래서 보여줄 숫자는 "그 거점 로트의 단순 합"이고, 다른 팝업의 계획분을 빼지 않는다.
 * 시연용 시드는 건드리지 않고 테스트 전용 상품·팝업을 만들어 쓴다.
 */
const NAME = '__테스트 반출서'
const SKU = '__TEST-NOSTOCK'
const EXPIRY = dateOnly(addDays(today(), 200))

async function cleanup() {
  const popup = await db.popup.findFirst({ where: { name: NAME } })
  if (popup) {
    await db.popupPlan.deleteMany({ where: { popupId: popup.id } })
    await db.popup.delete({ where: { id: popup.id } })
    await db.lot.deleteMany({ where: { locationId: popup.locationId } })
    await db.location.delete({ where: { id: popup.locationId } })
  }
  await db.movement.deleteMany({ where: { expiryDate: EXPIRY } })
  await db.lot.deleteMany({ where: { expiryDate: EXPIRY } })
  const bare = await db.product.findUnique({ where: { sku: SKU } })
  if (bare) await db.product.delete({ where: { id: bare.id } })
}

describe('반출서 가용 재고', () => {
  beforeAll(cleanup)
  afterAll(async () => {
    await cleanup()
    await db.$disconnect()
  })

  it('반출서의 가용 재고는 출발 거점 로트 합계와 같다', async () => {
    const { own, ff, user, product } = await ids()

    await db.$transaction(async (tx) => {
      await applyMovement(tx, {
        type: 'INBOUND',
        reason: 'PURCHASE',
        productId: product.id,
        expiryDate: EXPIRY,
        quantity: 50,
        toLocationId: own.id,
        userId: user.id,
      })
    })

    const sum = async (locationId: number) => {
      const lots = await db.lot.findMany({ where: { locationId, productId: product.id } })
      return lots.reduce((s, l) => s + l.quantity, 0)
    }

    const stock = await getPlanStock([own.id, ff.id])
    expect(stock[planStockKey(own.id, product.id)] ?? 0).toBe(await sum(own.id))
    expect(stock[planStockKey(ff.id, product.id)] ?? 0).toBe(await sum(ff.id))

    // 거부 — 묻지 않은 거점의 재고는 섞이지 않는다
    const onlyOwn = await getPlanStock([own.id])
    expect(onlyOwn[planStockKey(ff.id, product.id)]).toBeUndefined()
  })

  it('재고 0 인 상품도 반출서에 담긴다', async () => {
    const { own } = await ids()
    const bare = await db.product.create({ data: { sku: SKU, name: NAME, unit: '개' } })

    const stock = await getPlanStock([own.id])
    expect(stock[planStockKey(own.id, bare.id)] ?? 0).toBe(0)

    const popupId = await db.$transaction((tx) =>
      createPopupTx(tx, {
        name: NAME,
        startDate: today(),
        endDate: addDays(today(), 3),
        sourceLocationId: own.id,
        planLines: [{ productId: bare.id, plannedQty: 5 }],
      })
    )

    const plan = await db.popupPlan.findFirstOrThrow({
      where: { popupId, productId: bare.id },
    })
    expect(plan.plannedQty).toBe(5)
  })

  it('반출서 저장은 재고를 움직이지 않는다', async () => {
    const { own, product } = await ids()
    const before = await totalStock()
    const movementsBefore = await db.movement.count()
    const stockBefore = (await getPlanStock([own.id]))[planStockKey(own.id, product.id)] ?? 0

    const popup = await db.popup.findFirstOrThrow({ where: { name: NAME } })
    await db.popupPlan.create({
      data: { popupId: popup.id, productId: product.id, plannedQty: stockBefore + 999 },
    })

    // 보유보다 많이 계획해도 재고는 그대로다 — 차감은 반출 확정이 한다
    expect(await totalStock()).toBe(before)
    expect(await db.movement.count()).toBe(movementsBefore)
    expect((await getPlanStock([own.id]))[planStockKey(own.id, product.id)] ?? 0).toBe(stockBefore)
  })
})
