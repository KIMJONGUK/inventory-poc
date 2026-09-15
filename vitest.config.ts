import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    // 테스트는 재고를 실제로 움직인다. 개발용 dev.db 가 아니라 검증 전용 DB 를 쓴다
    // (scripts/prepare-verify.ts 가 매번 새로 만든다)
    env: { DATABASE_URL: 'file:./prisma/verify.db' },
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
