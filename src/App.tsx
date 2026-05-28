import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HospitalProvider } from "@/contexts/HospitalContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import WelcomePage from "./pages/WelcomePage";
import Index from "./pages/Index";
import DrugsPage from "./pages/DrugsPage";
import DrugDetailPage from "./pages/DrugDetailPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import HospitalManagementPage from "./pages/HospitalManagementPage";
import NotFound from "./pages/NotFound";
import ColorPreview from "./pages/ColorPreview";
import UserManualPage from "./pages/UserManualPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DischargeTemplatesPage from "./pages/DischargeTemplatesPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HospitalProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </HospitalProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;