import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { queryClient } from "@/lib/queryClient";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { LoginPage } from "@/pages/Login";
import { SignupPage } from "@/pages/Signup";
import { DashboardPage } from "@/pages/Dashboard";
import { ApiKeysPage } from "@/pages/ApiKeys";
import { AgentsPage } from "@/pages/Agents";
import { AgentFormPage } from "@/pages/AgentForm";
import { CallsPage } from "@/pages/Calls";
import { CallDetailPage } from "@/pages/CallDetail";

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="agents" element={<AgentsPage />} />
                <Route path="agents/new" element={<AgentFormPage />} />
                <Route path="agents/:id" element={<AgentFormPage />} />
                <Route path="api-keys" element={<ApiKeysPage />} />
                <Route path="calls" element={<CallsPage />} />
                <Route path="calls/:id" element={<CallDetailPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
