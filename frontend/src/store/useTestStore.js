import { create } from 'zustand'

const useTestStore = create((set) => ({
  url: '',
  status: 'idle',       // idle | scanning | complete | error
  tests: [],
  fullTests: [],        // complete test objects with playwrightCode (from complete event)
  summary: { total: 0, passed: 0, failed: 0, running: 0 },
  error: null,

  setUrl: (url) => set({ url }),

  startScan: () => set({
    status: 'scanning',
    tests: [],
    fullTests: [],
    summary: { total: 0, passed: 0, failed: 0, running: 0 },
    error: null,
  }),

  updateTest: (update) =>
    set((state) => {
      const idx = state.tests.findIndex((t) => t.id === update.id)
      let newTests

      if (idx >= 0) {
        newTests = state.tests.map((t) =>
          t.id === update.id ? { ...t, ...update } : t
        )
      } else {
        newTests = [...state.tests, update]
      }

      const summary = {
        total:   newTests.length,
        passed:  newTests.filter((t) => t.status === 'passed').length,
        failed:  newTests.filter((t) => t.status === 'failed').length,
        running: newTests.filter((t) => t.status === 'running').length,
      }

      return { tests: newTests, summary }
    }),

  completeScan: (summary, fullTests) =>
    set((state) => ({
      status: 'complete',
      fullTests: fullTests || state.tests,
      summary: {
        total:   summary.total,
        passed:  summary.passed,
        failed:  summary.failed,
        running: 0,
      },
    })),

  setError: (error) => set({ status: 'error', error }),

  reset: () =>
    set({
      url: '',
      status: 'idle',
      tests: [],
      fullTests: [],
      summary: { total: 0, passed: 0, failed: 0, running: 0 },
      error: null,
    }),
}))

export default useTestStore
