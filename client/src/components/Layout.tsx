import { useState } from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  BarChart3,
  Wallet,
  Bell,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from "lucide-react";
import { Button, Offcanvas } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { InstallPrompt } from "./InstallPrompt";
import type { Role } from "../api";

const navigation: { name: string; path: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["Head Admin", "Staff", "Cashier"] },
  { name: "Renew / Permit", path: "/renew-permit", icon: FileText, roles: ["Head Admin", "Staff"] },
  { name: "Records", path: "/records", icon: FolderOpen, roles: ["Head Admin", "Staff", "Cashier"] },
  { name: "Reports", path: "/reports", icon: BarChart3, roles: ["Head Admin", "Staff"] },
  { name: "Payments", path: "/payments", icon: Wallet, roles: ["Head Admin", "Staff", "Cashier"] },
  { name: "Notifications", path: "/notifications", icon: Bell, roles: ["Head Admin", "Staff", "Cashier"] },
  { name: "User Management", path: "/user-management", icon: Users, roles: ["Head Admin"] },
  { name: "Settings", path: "/settings", icon: SettingsIcon, roles: ["Head Admin"] },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const items = navigation.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="d-flex flex-column h-100 p-3 text-white app-sidebar">
      <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom border-secondary">
        <img src="/logo.svg" alt="MFARPS" width={48} height={48} />
        <div>
          <div className="fw-bold">MFARPS</div>
          <small className="text-white-50">Municipal Fisherfolk & Boat Permit System</small>
        </div>
      </div>
      <nav className="nav flex-column gap-1 flex-grow-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onNavigate}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
      <button className="btn btn-outline-light mt-3 d-flex align-items-center gap-2" onClick={logout}>
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const allowed = navigation.find((n) => n.path === location.pathname);
  if (allowed && !allowed.roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <div className="d-none d-lg-block position-fixed top-0 start-0 h-100">
        <SidebarNav />
      </div>
      <Offcanvas show={open} onHide={() => setOpen(false)} className="p-0">
        <Offcanvas.Body className="p-0">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>
      <div className="app-main">
        <header className="bg-white border-bottom sticky-top no-print">
          <div className="d-flex align-items-center justify-content-between px-3 px-lg-4 py-3">
            <Button variant="outline-secondary" className="d-lg-none" onClick={() => setOpen(true)}>
              <Menu size={18} />
            </Button>
            <div className="ms-auto d-flex align-items-center gap-3">
              <div className="text-end d-none d-sm-block">
                <div className="small text-muted">{new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</div>
                <div className="small">{user.role}</div>
              </div>
              <div
                className="rounded-circle d-grid place-items-center text-white fw-bold"
                style={{ width: 40, height: 40, background: "linear-gradient(135deg,#2563eb,#14b8a6)", placeItems: "center", display: "grid" }}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="p-3 p-lg-4">
          <InstallPrompt />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
