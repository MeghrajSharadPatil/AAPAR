import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardsPage } from './pages/DashboardsPage';
import { StudentManagementPage } from './pages/StudentManagementPage';
import { BulkUploadPage } from './pages/BulkUploadPage';
import { DuplicateShieldPage } from './pages/DuplicateShieldPage';
import { ApaarValidationPage } from './pages/ApaarValidationPage';
import { SeatLedgerPage } from './pages/SeatLedgerPage';
import { AiIntelligencePage } from './pages/AiIntelligencePage';
import { CredentialsAndQrPage } from './pages/CredentialsAndQrPage';
import { InstitutionsPage } from './pages/InstitutionsPage';
import { ReportsPage } from './pages/ReportsPage';
import {
  AuditLogsPage,
  SystemIntegrationsPage,
  SystemArchitecturePage,
  SettingsPage,
} from './pages/GovernanceAndArchitecturePage';

const AppRoutes: React.FC = () => {
  const { user } = usePlatform();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardsPage />} />
        <Route path="/institutions" element={<InstitutionsPage />} />
        <Route path="/repository" element={<StudentManagementPage repositoryView={true} />} />
        <Route path="/students" element={<StudentManagementPage repositoryView={false} />} />
        <Route path="/bulk-upload" element={<BulkUploadPage />} />
        <Route path="/admission-monitoring" element={<SeatLedgerPage monitoringView={true} />} />
        <Route path="/seat-ledger" element={<SeatLedgerPage monitoringView={false} />} />
        <Route path="/duplicate-shield" element={<DuplicateShieldPage />} />
        <Route path="/apaar-validation" element={<ApaarValidationPage />} />
        <Route path="/ai-intelligence" element={<AiIntelligencePage />} />
        <Route path="/credentials" element={<CredentialsAndQrPage mode="issue" />} />
        <Route path="/verify-credential" element={<CredentialsAndQrPage mode="verify" />} />
        <Route path="/scan-qr" element={<CredentialsAndQrPage mode="scan" />} />
        <Route path="/my-profile" element={<CredentialsAndQrPage mode="student-profile" />} />
        <Route path="/my-credential" element={<CredentialsAndQrPage mode="student-credential" />} />
        <Route path="/my-qr" element={<CredentialsAndQrPage mode="student-qr" />} />
        <Route path="/consents" element={<CredentialsAndQrPage mode="student-consents" />} />
        <Route path="/verification-history" element={<CredentialsAndQrPage mode="history" />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/integrations" element={<SystemIntegrationsPage />} />
        <Route path="/architecture" element={<SystemArchitecturePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
};

export function App() {
  return (
    <PlatformProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PlatformProvider>
  );
}

export default App;
