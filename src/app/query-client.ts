import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // HTTP errors are final here: 401/419 are already retried by the transport.
      // Only network failures get another try.
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})
