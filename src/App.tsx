import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { HospitalProvider } from "@/contexts/HospitalContext";
import WelcomePage from "./pages/WelcomePage";
import Index from "./pages/Index";
import DrugsPage from "./pages/DrugsPage";
import DrugDetailPage from "./pages/DrugDetailPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </HospitalProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;