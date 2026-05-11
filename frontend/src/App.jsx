import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { MainLayout } from './components/layout/MainLayout'
import { LoginPage }            from './pages/auth/LoginPage'
import { RegisterPage }         from './pages/auth/RegisterPage'
import { ForgotPasswordPage }   from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage }    from './pages/auth/ResetPasswordPage'
import { VerifyEmailPage }      from './pages/auth/VerifyEmailPage'
import { DashboardPage }    from './pages/DashboardPage'
import { SearchPage }       from './pages/SearchPage'
import { InsightsPage }     from './pages/InsightsPage'
import { DealsPage }        from './pages/DealsPage'
import { AddDataPage }      from './pages/AddDataPage'
import { BenchmarkPage }    from './pages/BenchmarkPage'
import { MyRoutesPage }     from './pages/MyRoutesPage'
import { SettingsPage }     from './pages/SettingsPage'
import { MarketplacePage }  from './pages/MarketplacePage'
import { SubscriptionPage } from './pages/SubscriptionPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/register"         element={<RegisterPage />} />
            <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
            <Route path="/reset-password"   element={<ResetPasswordPage />} />
            <Route path="/verify-email"     element={<VerifyEmailPage />} />

            <Route element={<MainLayout />}>
              <Route path="/"              element={<DashboardPage />} />
              <Route path="/search"        element={<SearchPage />} />
              <Route path="/insights"      element={<InsightsPage />} />
              <Route path="/deals"         element={<DealsPage />} />
              <Route path="/add-data"      element={<AddDataPage />} />
              <Route path="/benchmark"     element={<BenchmarkPage />} />
              <Route path="/my-routes"     element={<MyRoutesPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
              <Route path="/marketplace"   element={<MarketplacePage />} />
              <Route path="/subscription"  element={<SubscriptionPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
