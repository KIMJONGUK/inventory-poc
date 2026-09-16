import Link from 'next/link'
import { ExpiryBadge } from '@/components/StatusBadge'
import { Qty } from '@/components/Qty'
import { getExpiringLots } from '@/lib/inventory'
import { formatDate, humanizeRemaining } from '@/lib/date'

export const dynamic = 'force-dynamic'

/**
 * 임박·만료 로트 목록 (F9).
 * 홈의 할 일 배너가 여기로 들어온다 — 보기만 하는 화면이다.
 * 폐기 확정은 재고를 움직이므로 여기 없다.
 */
export default async function ExpiryPage() {
  const lots = await getExpiringLots()
  const expired = lots.filter((l) => l.status === 'EXPIRED').length
  const soon = lots.length - expired

  return (
    <main className="pb-24">
      <header className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-[13px] text-sub">
            ‹
          </Link>
          <h1 className="text-[15px] font-extrabold tracking-tight">유통기한 확인</h1>
        </div>
        <p className="mt-1 text-[11.5px] text-sub">
          만료 <b className="tnum text-red">{expired}</b>건 · 임박{' '}
          <b className="tnum text-amber">{soon}</b>건 — 급한 것부터 보여줍니다
        </p>
      </header>

      {lots.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] text-sub">
          임박하거나 만료된 로트가 없습니다
        </p>
      ) : (
        <ul>
          {lots.map((lot) => (
            <li
              key={lot.lotId}
              className="flex items-center justify-between border-b border-line px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold tracking-tight">{lot.productName}</p>
                <p className="mt-[2px] text-[11px] text-sub">
                  📍 {lot.locationName} · <span className="tnum">{formatDate(lot.expiryDate)}</span>{' '}
                  · {humanizeRemaining(lot.expiryDate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Qty value={lot.quantity} unit={lot.unit} size="lg" />
                <ExpiryBadge status={lot.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
