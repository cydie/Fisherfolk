import { createBrowserRouter, RouterProvider } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { RenewPermit } from "./pages/RenewPermit";
import { Records } from "./pages/Records";
import { Reports } from "./pages/Reports";
import { Payments } from "./pages/Payments";
import { Notifications } from "./pages/Notifications";
import { UserManagement } from "./pages/UserManagement";
import { Settings } from "./pages/Settings";
import { VerifyPermit } from "./pages/VerifyPermit";
import { NotFound } from "./pages/NotFound";

const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/verify/:number", Component: VerifyPermit },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "renew-permit", Component: RenewPermit },
      { path: "records", Component: Records },
      { path: "reports", Component: Reports },
      { path: "payments", Component: Payments },
      { path: "notifications", Component: Notifications },
      { path: "user-management", Component: UserManagement },
      { path: "settings", Component: Settings },
    ],
  },
  { path: "*", Component: NotFound },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
