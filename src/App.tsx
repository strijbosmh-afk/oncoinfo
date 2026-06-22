import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HospitalProvider } from "@/contexts/HospitalContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const Index = lazy(() => import("./pages/Index"));
const DrugsPage = lazy(() => import("./pages/DrugsPage"));
const DrugDetailPage = lazy(() => import("./pages/DrugDetailPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const HospitalManagementPage = lazy(() => import("./pages/HospitalManagementPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ColorPreview = lazy(() => import("./pages/ColorPreview"));
const UserManualPage = lazy(() => import("./pages/UserManualPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DischargeTemplatesPage = lazy(() => import("./pages/DischargeTemplatesPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HospitalProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
                <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/drugs" element={<ProtectedRoute><DrugsPage /></ProtectedRoute>} />
                <Route path="/drugs/:id" element={<ProtectedRoute><DrugDetailPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
                <Route path="/admin/hospitals" element={<ProtectedRoute requireAdmin><HospitalManagementPage /></ProtectedRoute>} />
                <Route path="/color-preview" element={<ColorPreview />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/handleiding" element={<ProtectedRoute><UserManualPage /></ProtectedRoute>} />
                <Route path="/discharge-templates/:discipline" element={<ProtectedRoute><DischargeTemplatesPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </HospitalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
