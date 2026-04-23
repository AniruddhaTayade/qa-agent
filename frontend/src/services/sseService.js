/**
 * SSE via fetch() + ReadableStream so we have access to HTTP status codes.
 * Native EventSource can't distinguish 401 / 429 / 400 from a network drop.
 */
import { getToken } from './tokenService'
import useTestStore from '../store/useTestStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

let _controller = null

export async function startSSE(url) {
  const store = useTestStore.getState()

  // Abort any in-flight scan
  if (_controller) {
    _controller.abort()
    _controller = null
  }

  _controller = new AbortController()

  try {
    const token = await getToken()

    const sseUrl =
      `${API_BASE}/api/run-tests` +
      `?url=${encodeURIComponent(url)}` +
      `&token=${encodeURIComponent(token)}`

    const response = await fetch(sseUrl, {
      signal: _controller.signal,
    })

    // Handle HTTP-level errors (rate limit, etc.) before the stream starts
    if (!response.ok) {
      let message = `Server error (${response.status})`

      if (response.status === 429) {
        message = 'Rate limit exceeded. Please wait a moment before retrying.'
      } else {
        // Try to extract FastAPI detail message
        try {
          const body = await response.json()
          if (body.detail) message = body.detail
        } catch {
          // ignore parse errors
        }
      }

      store.setError(message)
      return
    }

    // Stream the response as SSE
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines
      const parts = buffer.split('\n\n')
      // The last element is an incomplete chunk — keep it in the buffer
      buffer = parts.pop()

      for (const part of parts) {
        // Find the data line inside this event block
        const dataLine = part
          .split('\n')
          .find((l) => l.startsWith('data: '))

        if (!dataLine) continue

        let data
        try {
          data = JSON.parse(dataLine.slice(6))
        } catch {
          continue
        }

        switch (data.type) {
          case 'test-update':
            useTestStore.getState().updateTest(data.test)
            break

          case 'complete':
            useTestStore.getState().completeScan(data.summary, data.tests)
            break

          case 'error':
            useTestStore.getState().setError(data.message || 'Unknown error from server')
            break

          case 'status':
            // Informational messages — no store update needed
            break

          default:
            break
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return // intentional cancel — no error state

    const currentStatus = useTestStore.getState().status
    if (currentStatus === 'scanning') {
      useTestStore.getState().setError(err.message || 'Connection lost. Please try again.')
    }
  } finally {
    _controller = null
  }
}

export function stopSSE() {
  _controller?.abort()
  _controller = null
}
