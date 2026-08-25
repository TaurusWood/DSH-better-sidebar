import { describe, expect, it } from 'vitest'
import { parseUnifiedDiff } from '../src/client/DiffView.tsx'

describe('rename-only unified diffs', () => {
  it('uses rename metadata when git emits no --- / +++ headers', () => {
    const parsed = parseUnifiedDiff([
      'diff --git a/src/old-name.ts b/src/new-name.ts',
      'similarity index 100%',
      'rename from src/old-name.ts',
      'rename to src/new-name.ts',
      '',
    ].join('\n'))

    expect(parsed.files).toHaveLength(1)
    expect(parsed.files[0]).toEqual({
      oldPath: 'src/old-name.ts',
      newPath: 'src/new-name.ts',
      binary: false,
      hunks: [],
    })
  })
})
