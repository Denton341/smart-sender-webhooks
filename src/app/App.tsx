import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { LoginPage } from '../auth/LoginPage'
import { RequireAuth } from '../auth/RequireAuth'
import { EditWebhookDialog } from '../features/webhooks/EditWebhookDialog'
import { WebhooksPage } from '../features/webhooks/WebhooksPage'
import { AppLayout } from './AppLayout'
import { queryClient } from './query-client'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/webhooks" element={<WebhooksPage />}>
              <Route path=":id" element={<EditWebhookDialog />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/webhooks" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
