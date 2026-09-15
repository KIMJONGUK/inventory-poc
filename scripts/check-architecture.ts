/**
 * 아키텍처 경로 규칙 정적 검사 (docs/06-architecture.md)
 *
 * 테스트가 "동작이 맞는가"를 보는 것과 달리, 여기서는
 * "정해진 통로를 거쳤는가"만 본다.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'src'
const EXCLUDED_DIRS = ['src/generated']

type Rule = {
  id: string
  /** docs/06-architecture.md 의 근거 절 */
  doc: string
  why: string
  /** 이 규칙을 적용할 파일인지 */
  applies: (path: string) => boolean
  /** 위반이면 메시지, 아니면 null */
  check: (path: string, line: string) => string | null
}

const WRITE_OPS = 'create|update|upsert|delete|createMany|updateMany|deleteMany|upsertMany'

const RULES: Rule[] = [
  {
    id: 'stock-single-channel',
    doc: '§2, §4.1',
    why: '재고 수량을 바꾸는 코드는 lib/stock.ts 의 applyMovement() 한 곳에만 둔다',
    applies: (p) => p !== 'src/lib/stock.ts',
    check: (_p, line) =>
      new RegExp(`\\b(db|tx)\\.lot\\.(${WRITE_OPS})\\b`).test(line)
        ? 'Lot 을 직접 변경했다. applyMovement() 를 거쳐야 한다'
        : null,
  },
  {
    id: 'movement-single-channel',
    doc: '§4.1',
    why: '이력은 재고 변경과 항상 같은 트랜잭션에서 함께 기록된다',
    applies: (p) => p !== 'src/lib/stock.ts',
    check: (_p, line) =>
      new RegExp(`\\b(db|tx)\\.movement\\.(${WRITE_OPS})\\b`).test(line)
        ? 'Movement 를 직접 기록했다. applyMovement() 를 거쳐야 한다'
        : null,
  },
  {
    id: 'writes-in-actions-only',
    doc: '§2, §7.5',
    why: '쓰기는 전부 actions/ 에 둔다. 화면이 Prisma 를 직접 호출하지 않는다',
    applies: (p) => p.startsWith('src/app/') || p.startsWith('src/components/'),
    check: (_p, line) =>
      new RegExp(`\\b(db|tx)\\.\\w+\\.(${WRITE_OPS})\\b`).test(line)
        ? '화면 코드에서 DB 에 직접 썼다. Server Action(actions/) 을 거쳐야 한다'
        : null,
  },
  {
    id: 'tx-required',
    doc: '§4.1',
    why: 'applyMovement() 는 반드시 트랜잭션 안에서 호출한다',
    applies: (p) => p !== 'src/lib/stock.ts',
    check: (_p, line) => {
      if (/function\s+applyMovement/.test(line)) return null
      return /\bapplyMovement\s*\(\s*(?!tx\b)/.test(line)
        ? 'applyMovement() 의 첫 인자가 트랜잭션(tx) 이 아니다'
        : null
    },
  },
]

/** 줄 단위 검사의 오탐 방지 — 주석 줄은 건너뛴다 */
function isComment(line: string): boolean {
  const t = line.trimStart()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
}

function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((f) => join(SRC, f).replaceAll('\\', '/'))
    .filter((p) => /\.tsx?$/.test(p))
    .filter((p) => !EXCLUDED_DIRS.some((d) => p.startsWith(`${d}/`)))
}

type Violation = { rule: Rule; path: string; line: number; text: string; message: string }

const violations: Violation[] = []

for (const path of sourceFiles()) {
  const source = readFileSync(path, 'utf8')
  const lines = source.split('\n')

  // 파일 단위 규칙 — Server Action 은 actions/ 밖에 둘 수 없다 (§2)
  if (/^\s*['"]use server['"]/m.test(source) && !path.startsWith('src/actions/')) {
    violations.push({
      rule: {
        id: 'use-server-in-actions-only',
        doc: '§2',
        why: 'Server Action 은 actions/ 에만 둔다',
      } as Rule,
      path,
      line: lines.findIndex((l) => /['"]use server['"]/.test(l)) + 1,
      text: "'use server'",
      message: 'Server Action 이 actions/ 밖에 있다',
    })
  }

  lines.forEach((text, i) => {
    if (isComment(text)) return
    for (const rule of RULES) {
      if (!rule.applies(path)) continue
      const message = rule.check(path, text)
      if (message) violations.push({ rule, path, line: i + 1, text: text.trim(), message })
    }
  })
}

const checked = sourceFiles().length

if (violations.length === 0) {
  console.log(`✔ 아키텍처 규칙 5건 통과 — ${checked}개 파일 검사`)
  process.exit(0)
}

console.error(`\n✘ 아키텍처 규칙 위반 ${violations.length}건\n`)
for (const v of violations) {
  console.error(`  ${v.path}:${v.line}`)
  console.error(`    ${v.message}`)
  console.error(`    규칙: ${v.rule.why} (06-architecture.md ${v.rule.doc})`)
  console.error(`    코드: ${v.text}\n`)
}
console.error('docs/06-architecture.md 를 확인하고, 규칙이 바뀌어야 한다면 사람에게 먼저 묻는다.\n')
process.exit(1)
