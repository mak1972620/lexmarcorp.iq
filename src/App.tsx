import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useLocation
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Cases from './pages/Cases';
import Tasks from './pages/Tasks';
import Payments from './pages/Payments';
import Documents from './pages/Documents';
import Messages from './pages/Messages';
import UsersAdmin from './pages/UsersAdmin';
import AuditLog from './pages/AuditLog';
import Auditor from './pages/Auditor';
import DocumentScanner from './pages/DocumentScanner';
import Templates from './pages/Templates';
import LiquidacionForense from './pages/LiquidacionForense';
import DueloProcesal from './pages/DueloProcesal';
import TerminosJudiciales from './pages/TerminosJudiciales';
import TimelineProcesal from './pages/TimelineProcesal';
import Profile from './pages/Profile';
import { motion, AnimatePresence } from 'motion/react';
import AiAssistant from './components/AiAssistant';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#060709] text-[#D4AF37] font-['Cinzel'] text-xl font-bold tracking-widest animate-pulse">
      EDILIA TANAKA Y ASOCIADOS...
    </div>
  );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex h-screen bg-[#060709] text-[#F3F4F6] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#060709]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="p-8 md:p-10 max-w-[1600px] mx-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <AiAssistant />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute roles={['admin', 'abogado']}><Clients /></ProtectedRoute>} />
          <Route path="/expedientes" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
          <Route path="/tareas" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/documentos" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/mensajes" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/pagos" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/auditor" element={<ProtectedRoute roles={['admin', 'abogado']}><Auditor /></ProtectedRoute>} />
          <Route path="/liquidacion" element={<ProtectedRoute roles={['admin', 'abogado']}><LiquidacionForense /></ProtectedRoute>} />
          <Route path="/duelo-procesal" element={<ProtectedRoute roles={['admin', 'abogado']}><DueloProcesal /></ProtectedRoute>} />
          <Route path="/terminos" element={<ProtectedRoute><TerminosJudiciales /></ProtectedRoute>} />
          <Route path="/timeline" element={<ProtectedRoute><TimelineProcesal /></ProtectedRoute>} />
          <Route path="/plantillas" element={<ProtectedRoute roles={['admin', 'abogado']}><Templates /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><DocumentScanner /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin/usuarios" element={<ProtectedRoute roles={['admin']}><UsersAdmin /></ProtectedRoute>} />
          <Route path="/admin/auditoria" element={<ProtectedRoute roles={['admin']}><AuditLog /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
