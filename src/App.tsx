import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/layout/protected-route";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Approvals from "./pages/Approvals";
import Family from "./pages/Family";
import Statement from "./pages/Statement";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Invites from "@/pages/Invites";
import InviteSignup from "@/pages/InviteSignup";
import TaskInstances from "@/pages/TaskInstances";
import TestFunctions from "./pages/TestFunctions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tasks" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Tasks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/approvals" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Approvals />
                </ProtectedRoute>
              } 
            />
        <Route path="/family" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <Family />
          </ProtectedRoute>
        } />
        <Route path="/task-instances" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <TaskInstances />
          </ProtectedRoute>
        } />
        <Route path="/convites" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <Invites />
          </ProtectedRoute>
        } />
        <Route path="/convite/:token" element={<InviteSignup />} />
            <Route 
              path="/statement" 
              element={
                <ProtectedRoute allowedRoles={['child']}>
                  <Statement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/test-functions" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <TestFunctions />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
