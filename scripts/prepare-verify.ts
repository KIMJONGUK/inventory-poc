/**
 * 검증 전 DB 초기화.
 *
 * 테스트는 재고를 실제로 움직인다(tests/stock-invariant, popup-settle).
 * 이전 실행이 남긴 상태 위에서 다시 돌리면 매번 다른 데이터로 검증하게 되므로,
 * 여기서 DB를 지우고 다시 만들어 항상 같은 시드에서 출발시킨다.
 *
 * dev.db 가 아니라 verify.db 를 쓴다 —
 * 개발 서버가 dev.db 를 열어둔 채여도 검증이 돌아가야 하고(Windows 파일 잠금),
 * 검증이 개발 중인 로컬 데이터를 지우지 않아야 한다.
 */
import { rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'

export const VERIFY_DATABASE_URL = 'file:./prisma/verify.db'

const dbPath = path.resolve(process.cwd(), VERIFY_DATABASE_URL.replace(/^file:/, ''))

// SQLite 는 본체 외에 저널·WAL 파일을 남긴다. 같이 지우지 않으면 이전 상태가 되살아난다.
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(`${dbPath}${suffix}`, { force: true })
}

// dotenv 는 이미 설정된 값을 덮어쓰지 않는다 → .env 의 dev.db 대신 이 값이 쓰인다
const env = { ...process.env, DATABASE_URL: VERIFY_DATABASE_URL }
const run = (cmd: string) => execSync(cmd, { stdio: 'inherit', env })

console.log(`\n▸ 검증용 DB 초기화 — ${VERIFY_DATABASE_URL}`)

run('npx prisma migrate deploy')
run('npx prisma generate')
run('npx tsx prisma/seed.ts')

console.log('\n▸ 초기화 완료 — 매 검증이 같은 시드에서 출발합니다\n')
