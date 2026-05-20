import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index           from "./pages/Index";
import SignIn          from "./pages/SignIn";
import SignUp          from "./pages/SignUp";
import Discover        from "./pages/Discover";
import CharacterDetail from "./pages/CharacterDetail";
import Chat            from "./pages/Chat";
import CreateCharacter from "./pages/CreateCharacter";
import Profile         from "./pages/Profile";
import Favourites      from "./pages/Favourites";
import NotFound        from "./pages/NotFound";
import Notifications   from "./pages/settings/Notifications";
import Privacy         from "./pages/settings/Privacy";
import Billing         from "./pages/settings/Billing";
import Preferences     from "./pages/settings/Preferences";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/signin"  element={<SignIn />} />
            <Route path="/signup"  element={<SignUp />} />

            {/* Protected routes */}
            <Route path="/"        element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
            <Route path="/character/:id" element={<ProtectedRoute><CharacterDetail /></ProtectedRoute>} />
            <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/create"  element={<ProtectedRoute><CreateCharacter /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings/privacy"       element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
            <Route path="/settings/billing"       element={<ProtectedRoute><Billing /></ProtectedRoute>} />
            <Route path="/settings/preferences"   element={<ProtectedRoute><Preferences /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
