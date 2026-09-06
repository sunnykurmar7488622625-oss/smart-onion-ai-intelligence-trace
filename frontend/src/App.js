import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { FarmerOnly, ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Batches from "@/pages/Batches";
import CreateBatch from "@/pages/CreateBatch";
import UploadInspect from "@/pages/UploadInspect";
import CameraVision from "@/pages/CameraVision";
import InspectionResult from "@/pages/InspectionResult";
import BatchPassport from "@/pages/BatchPassport";
import StorageMonitoring from "@/pages/StorageMonitoring";
import Dispatch from "@/pages/Dispatch";
import Reports from "@/pages/Reports";
import ReportView from "@/pages/ReportView";
import Verify from "@/pages/Verify";
import Profile from "@/pages/Profile";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/batches/new" element={<FarmerOnly><CreateBatch /></FarmerOnly>} />
            <Route path="/batches/:batchId" element={<BatchPassport />} />
            <Route path="/batches/:batchId/storage" element={<StorageMonitoring />} />
            <Route path="/batches/:batchId/dispatch" element={<FarmerOnly><Dispatch /></FarmerOnly>} />
            <Route path="/inspect" element={<FarmerOnly><UploadInspect /></FarmerOnly>} />
            <Route path="/camera" element={<FarmerOnly><CameraVision /></FarmerOnly>} />
            <Route path="/inspections/:inspectionId" element={<InspectionResult />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:batchId" element={<ReportView />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </AuthProvider>
  );
}

export default App;
