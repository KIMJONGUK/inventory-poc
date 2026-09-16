import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db, ids, totalStock } from './helpers'
import { getExpiringLots } from '@/lib/inventory'
import { applyMovement } from '@/lib/stock'
import { addDays, dateOnly, today } from '@/lib/date'

/**
 * 임박·만료 로트 목록 (F9, 이슈 #5).
 *
 * 경고 기준일은 상품마다 다르므로 전용 상품을 하나 만들어 쓴다 (기준 10일).
 * 시연용 시드는 건드리지 않는다.
 */
const SKU = '__TEST-EXPIRY-LIST'
const NAME = '__테스트 임박목록'
const ALERT_DAYS = 10

const EXPIRED_AT = dateOnly(addDays(today(), -1))
const BOUNDARY_AT = dateOnly(addDays(today(), ALERT_DAYS)) // 경고 기준일 당일 — 임박
const OUTSIDE_AT = dateOnly(addDays(today(), ALERT_DAYS + 1)) // 하루 뒤 — 정상

async function cleanup() {
  const product = await db.product.findUnique({ where: { sku: SKU } })
  if (!product) return
  await db.movement.deleteMany({ where: { productId: product.id } })
  await db.lot.deleteMany({ where: { productId: product.id } })
  await db.product.delete({ where: { id: product.id } })
}

async function seedLots() {
  const { own, user } = await ids()
  const product = await db.product.create({
    data: { sku: SKU, name: NAME, unit: '개', expiryAlertDays: ALERT_DAYS },
  })

  await db.$transaction(async (tx) => {
    for (const [expiryDate, quantity] of [
      [EXPIRED_AT, 3],
      [BOUNDARY_AT, 5],
      [OUTSIDE_AT, 7],
    ] as const) {
      await applyMovement(tx, {
        type: 'INBOUND',
        reason: 'PURCHASE',
        productId: product.id,
        expiryDate,
        quantity,
        toLocationId: own.id,
        userId: user.id,
      })
    }
  })

  return product
}

describe('임박·만료 로트 목록', () => {
  beforeAll(async () => {
    await cleanup()
    await seedLots()
  })
  afterAll(async () => {
    await cleanup()
    await db.$disconnect()
  })

  it('만료와 임박만 나오고 만료가 먼저다', async () => {
    const lots = await getExpiringLots()

    // 정상 로트는 목록에 없다 (경계 밖 날짜가 안 섞였는지로 확인한다)
    expect(lots.some((l) => l.sku === SKU && l.expiryDate.getTime() === OUTSIDE_AT.getTime())).toBe(
      false
    )

    // 만료가 임박보다 앞에 온다
    const lastExpired = lots.map((l) => l.status).lastIndexOf('EXPIRED')
    const firstSoon = lots.map((l) => l.status).indexOf('SOON')
    if (lastExpired >= 0 && firstSoon >= 0) expect(lastExpired).toBeLessThan(firstSoon)

    const mine = lots.filter((l) => l.sku === SKU)
    expect(mine.map((l) => l.status)).toEqual(['EXPIRED', 'SOON'])
  })

  it('경고 기준일 당일은 임박에 들어간다', async () => {
    const lots = await getExpiringLots()
    const mine = lots.filter((l) => l.sku === SKU)

    const boundary = mine.find((l) => l.expiryDate.getTime() === BOUNDARY_AT.getTime())
    expect(boundary?.status).toBe('SOON')
    expect(boundary?.quantity).toBe(5)

    // 하루 뒤는 경계 밖이다
    expect(mine.some((l) => l.expiryDate.getTime() === OUTSIDE_AT.getTime())).toBe(false)
  })

  it('임박 목록 조회는 재고를 움직이지 않는다', async () => {
    const before = await totalStock()
    const movementsBefore = await db.movement.count()

    await getExpiringLots()
    await getExpiringLots()

    expect(await totalStock()).toBe(before)
    expect(await db.movement.count()).toBe(movementsBefore)
  })
})
