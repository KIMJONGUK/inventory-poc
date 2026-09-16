/**
 * 반출서에 보여줄 가용 재고의 표현 (S6).
 *
 * 클라이언트도 읽으므로 DB 를 import 하지 않는다 — 조회는 `inventory.getPlanStock`.
 */

/** 거점·상품 한 쌍의 키 — `${거점}:${상품}` */
export function planStockKey(locationId: number, productId: number) {
  return `${locationId}:${productId}`
}

export type PlanStock = Record<string, number>
