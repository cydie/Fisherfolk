import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Row, Table } from "react-bootstrap";
import { Calendar, Download, FileText, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, peso } from "../api";

type ReportData = {
  monthly: { month: string; permits: number; renewals: number; revenue: number }[];
  barangay: { name: string; value: number; color: string }[];
  boatTypes: { name: string; permits: number }[];
  totals: { total_permits: number; total_renewals: number; total_revenue: number; expiring: number };
};

export function Reports() {
  const [selectedReport, setSelectedReport] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [barangay, setBarangay] = useState("All Barangays");
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    api<ReportData>(`/reports?barangay=${encodeURIComponent(barangay)}`).then(setData).catch(() => setData(null));
  }, [barangay]);

  function exportCsv() {
    if (!data) return;
    const lines = ["Month,New Permits,Renewals,Revenue,Total", ...data.monthly.map((m) => `${m.month},${m.permits},${m.renewals},${m.revenue},${m.permits + m.renewals}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mfarps-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <div className="text-muted">Loading reports...</div>;

  return (
    <div>
      <h1 className="h3 mb-1">Reports & Analytics</h1>
      <p className="text-muted">Generate and export comprehensive reports</p>
      <Card className="stat-card mb-4 no-print">
        <Card.Body>
          <h2 className="h6">Report Configuration</h2>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label>Report Type</Form.Label>
              <Form.Select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="yearly">Yearly Report</option>
                <option value="custom">Custom Date Range</option>
              </Form.Select>
            </Col>
            {selectedReport === "custom" && (
              <>
                <Col md={3}>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Col>
                <Col md={3}>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Col>
              </>
            )}
            <Col md={3}>
              <Form.Label>Barangay</Form.Label>
              <Form.Select value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                <option>All Barangays</option>
                <option>Barangay Canipo</option>
                <option>Barangay Taburi</option>
                <option>Barangay Campong-Ulay</option>
                <option>Barangay Iraan</option>
                <option>Barangay Culasian</option>
                <option>Barangay Lao</option>
                <option>Barangay Panalingaan</option>
              </Form.Select>
            </Col>
          </Row>
          <div className="d-flex gap-2 mt-3">
            <Button variant="danger" onClick={() => window.print()}><Download size={16} className="me-1" /> Export as PDF</Button>
            <Button variant="success" onClick={exportCsv}><Download size={16} className="me-1" /> Export as Excel</Button>
            <Button onClick={() => window.print()}><Printer size={16} className="me-1" /> Print Report</Button>
          </div>
        </Card.Body>
      </Card>
      <Row className="g-3 mb-4">
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Permits Issued</div><div className="fs-3 fw-bold">{data.totals.total_permits}</div><FileText size={18} className="text-primary" /></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Renewals</div><div className="fs-3 fw-bold">{data.totals.total_renewals}</div><Calendar size={18} className="text-success" /></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Revenue</div><div className="fs-3 fw-bold">{peso(data.totals.total_revenue)}</div></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Expiring Soon</div><div className="fs-3 fw-bold">{data.totals.expiring}</div><div className="small text-warning">Next 30 days</div></Card.Body></Card></Col>
      </Row>
      <Row className="g-3 mb-4">
        <Col lg={6}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Monthly Permit Analytics</h2>
              <ResponsiveContainer width="100%" height={280}>
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
        <Col lg={6}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Permits by Barangay</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.barangay} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {data.barangay.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Revenue Trend</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue (₱)" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="stat-card h-100">
            <Card.Body>
              <h2 className="h6">Boat Type Statistics</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.boatTypes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="permits" fill="#8b5cf6" name="Total Permits" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card className="stat-card">
        <Card.Body>
          <h2 className="h6">Detailed Report Summary</h2>
          <Table responsive>
            <thead>
              <tr><th>Month</th><th>New Permits</th><th>Renewals</th><th>Revenue</th><th>Total</th></tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month} {new Date().getFullYear()}</td>
                  <td>{m.permits}</td>
                  <td>{m.renewals}</td>
                  <td>{peso(m.revenue)}</td>
                  <td>{m.permits + m.renewals}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
