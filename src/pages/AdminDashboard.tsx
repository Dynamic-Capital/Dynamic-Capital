import { useLocation } from "react-router-dom";
import { AdminDashboard as AdminDashboardComponent } from "@/components/admin/AdminDashboard";
import { SystemHealth } from "@/components/admin/SystemHealth";

const AdminDashboard = () => {
  const location = useLocation();
  
  if (location.pathname === '/admin/system-health') {
    return <SystemHealth />;
  }
  
  return <AdminDashboardComponent />;
};

export default AdminDashboard;