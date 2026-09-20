import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button, Card, Col, Row, Spinner, Table } from "react-bootstrap";
import { Users, FileCheck, FileX, Clock, Anchor, Plus, RefreshCw, FileText, DollarSign } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, peso, formatDate } from "../api";
import { StatusBadge } from "../components/StatusBadge";

type DashboardData = {
  stats: {
    fisherfolk: number;
    active_permits: number;
    expired_permits: number;
    pending_applications: number;
    boat_owners: number;
  };
  recent: { id: string; name: string; barangay: string; type: string; status: string; date: string; amount: number }[];
  statusDistribution: { active: number; expired: number; pending: number };
  monthly: { month: string; permits: number; renewals: number }[];
};

export function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (!data) {
    return (
      <div className="text-center py-5">
        {error || <Spinner animation="border" />}
      </div>
    );
  }

  const cards = [
    { title: "Total Registered Fisherfolk", value: data.stats.fisherfolk, icon: Users, color: "#2563eb" },
    { title: "Active Permits", value: data.stats.active_permits, icon: FileCheck, color: "#16a34a" },
    { title: "Expired Permits", value: data.stats.expired_permits, icon: FileX, color: "#dc2626" },
    { title: "Pending Applications", value: data.stats.pending_applications, icon: Clock, color: "#d97706" },
    { title: "Total Boat Owners", value: data.stats.boat_owners, icon: Anchor, color: "#0f766e" },
  ];

  const pie = [
    { name: "Active", value: data.statusDistribution.active, color: "#10b981" },
    { name: "Expired", value: data.statusDistribution.expired, color: "#ef4444" },
    { name: "Pending", value: data.statusDistribution.pending, color: "#f59e0b" },
  ];

  return (
    <div>
      <h1 className="h3 mb-1">Dashboard</h1>
      <p className="text-muted">Municipal Fisherfolk & Boat Permit System Overview</p>
      <Row className="g-3 mb-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Col key={card.title} md={6} xl>
              <Card className="stat-card h-100">
                <Card.Body className="d-flex justify-content-between">
                  <div>
                    <div className="small text-muted">{card.title}</div>
                    <div className="fs-3 fw-bold">{card.value.toLocaleString()}</div>
                  </div>
                  <div className="rounded-3 p-2 align-self-start" style={{ background: `${card.color}22`, color: card.color }}>
                    <Icon size={22} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Row className="g-3 mb-4">
        <Col lg={4}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Permit Status Distribution</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Monthly Permit Analytics</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="permits" fill="#3b82f6" name="New Permits" />
                  <Bar dataKey="renewals" fill="#14b8a6" name="Renewals" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card className="stat-card mb-4">
        <Card.Body>
          <h2 className="h6 mb-3">Quick Actions</h2>
          <div className="d-grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Button onClick={() => navigate("/renew-permit")}><Plus size={16} className="me-1" /> New Permit</Button>
            <Button variant="success" onClick={() => navigate("/renew-permit")}><RefreshCw size={16} className="me-1" /> Renew Permit</Button>
            <Button variant="secondary" onClick={() => navigate("/reports")}><FileText size={16} className="me-1" /> Generate Report</Button>
            <Button variant="info" className="text-white" onClick={() => navigate("/payments")}><DollarSign size={16} className="me-1" /> Add Payment</Button>
          </div>
        </Card.Body>
      </Card>
      <Card className="stat-card">
        <Card.Body>
          <h2 className="h6 mb-3">Recent Transactions</h2>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Name</th>
                <th>Barangay</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.barangay}</td>
                  <td>{row.type}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td>{formatDate(row.date)}</td>
                  <td>{peso(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
