import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Calendar, Download, FileText, Printer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, formatDate, peso } from "../api";
import { OfficialDocHeader } from "../components/OfficialDocHeader";

type ListingRow = {
  permit_number?: string;
  fisherfolk_name?: string;
  owner_name?: string;
  barangay?: string;
  public_id?: string;
  fisherfolk_id?: string;
  boat_type?: string;
  boat_name?: string;
  fishing_method?: string;
  status?: string;
  permit_type?: string;
  issue_date?: string;
  expiry_date?: string;
  receipt_no?: string;
  or_number?: string;
  amount?: number;
  payment_method?: string;
  paid_at?: string;
  cashier?: string;
  reference_number?: string;
};

type ReportData = {
  monthly: { month: string; permits: number; renewals: number; revenue: number }[];
  barangay: { name: string; value: number; color: string }[];
  boatTypes: { name: string; permits: number }[];
  totals: { total_permits: number; total_renewals: number; total_revenue: number; expiring: number };
  listings: {
    newFisherfolk: ListingRow[];
    renewals: ListingRow[];
    replacements: ListingRow[];
    boats: ListingRow[];
    payments: ListingRow[];
    expiring: ListingRow[];
    allPermits: ListingRow[];
  };
};

type Lookups = { barangays: string[] };

type ReportCategory =
  | "summary"
  | "new"
  | "renewal"
  | "replacement"
  | "boats"
  | "payments"
  | "expiring"
  | "all-permits";

const REPORT_CATEGORIES: { value: ReportCategory; label: string; paperTitle: string }[] = [
  { value: "summary", label: "All / Summary Report", paperTitle: "Municipal Fisherfolk Summary Report" },
  { value: "new", label: "New Fisherfolk Permits", paperTitle: "List of New Fisherfolk Permits" },
  { value: "renewal", label: "Permit Renewals", paperTitle: "List of Fisherfolk Permit Renewals" },
  { value: "replacement", label: "Permit Replacements", paperTitle: "List of Fisherfolk Permit Replacements" },
  { value: "boats", label: "Registered Boats", paperTitle: "List of Registered Boats / Fishing Vessels" },
  { value: "payments", label: "Payments & Collections", paperTitle: "List of Payments & Collections" },
  { value: "expiring", label: "Expiring Permits (30 days)", paperTitle: "List of Permits Expiring Within 30 Days" },
  { value: "all-permits", label: "All Permits", paperTitle: "Master List of All Permits" },
];

function PermitListingTable({ title, rows }: { title: string; rows: ListingRow[] }) {
  return (
    <section className="report-listing-sheet mb-4">
      <h2 className="h6 report-listing-title">{title}</h2>
      <Table responsive bordered size="sm" className="mb-0 report-listing-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Fisherfolk Name</th>
            <th>ID</th>
            <th>Barangay</th>
            <th>Boat Type</th>
            <th>Fishing Method</th>
            <th>Permit No.</th>
            <th>Type</th>
            <th>Issued</th>
            <th>Expires</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={11} className="text-center text-muted">No records found</td></tr>
          )}
          {rows.map((row, index) => (
            <tr key={`${row.permit_number}-${index}`}>
              <td>{index + 1}</td>
              <td>{row.fisherfolk_name}</td>
              <td>{row.public_id}</td>
              <td>{row.barangay}</td>
              <td>{row.boat_type}</td>
              <td>{row.fishing_method}</td>
              <td>{row.permit_number}</td>
              <td>{row.permit_type || "—"}</td>
              <td>{formatDate(row.issue_date)}</td>
              <td>{formatDate(row.expiry_date)}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="small text-muted mt-2">Total: {rows.length}</div>
    </section>
  );
}

function BoatListingTable({ title, rows }: { title: string; rows: ListingRow[] }) {
  return (
    <section className="report-listing-sheet mb-4">
      <h2 className="h6 report-listing-title">{title}</h2>
      <Table responsive bordered size="sm" className="mb-0 report-listing-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Owner / Fisherfolk</th>
            <th>Barangay</th>
            <th>Boat / Type</th>
            <th>Fishing Method</th>
            <th>Permit No.</th>
            <th>Permit Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} className="text-center text-muted">No records found</td></tr>
          )}
          {rows.map((row, index) => (
            <tr key={`${row.permit_number}-${index}`}>
              <td>{index + 1}</td>
              <td>{row.owner_name}</td>
              <td>{row.barangay}</td>
              <td>{row.boat_name || row.boat_type}</td>
              <td>{row.fishing_method}</td>
              <td>{row.permit_number}</td>
              <td>{row.permit_type}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="small text-muted mt-2">Total: {rows.length}</div>
    </section>
  );
}

function PaymentListingTable({ title, rows }: { title: string; rows: ListingRow[] }) {
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return (
    <section className="report-listing-sheet mb-4">
      <h2 className="h6 report-listing-title">{title}</h2>
      <Table responsive bordered size="sm" className="mb-0 report-listing-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Receipt No.</th>
            <th>Fisherfolk Name</th>
            <th>Barangay</th>
            <th>Permit No.</th>
            <th>Transaction Type</th>
            <th>Method</th>
            <th>OR / Ref</th>
            <th>Date Paid</th>
            <th>Cashier</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={12} className="text-center text-muted">No records found</td></tr>
          )}
          {rows.map((row, index) => (
            <tr key={`${row.receipt_no}-${index}`}>
              <td>{index + 1}</td>
              <td>{row.receipt_no}</td>
              <td>{row.fisherfolk_name}</td>
              <td>{row.barangay || "—"}</td>
              <td>{row.permit_number}</td>
              <td>{row.permit_type}</td>
              <td>{row.payment_method}</td>
              <td>{row.or_number || row.reference_number || "—"}</td>
              <td>{formatDate(row.paid_at)}</td>
              <td>{row.cashier || "—"}</td>
              <td>{peso(row.amount || 0)}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="d-flex justify-content-between small text-muted mt-2">
        <span>Total transactions: {rows.length}</span>
        <span className="fw-semibold text-dark">Total amount: {peso(totalAmount)}</span>
      </div>
    </section>
  );
}

export function Reports() {
  const [selectedReport, setSelectedReport] = useState("all");
  const [reportCategory, setReportCategory] = useState<ReportCategory>("summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [barangay, setBarangay] = useState("All Barangays");
  const [barangays, setBarangays] = useState<string[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Lookups>("/lookups").then((l) => setBarangays(l.barangays)).catch(() => setBarangays([]));
  }, []);

  function loadReports() {
    if (selectedReport === "custom" && (!startDate || !endDate)) {
      setError("Choose both start and end dates for a custom range.");
      return;
    }
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({
      barangay,
      period: selectedReport,
    });
    if (selectedReport === "custom") {
      qs.set("start", startDate);
      qs.set("end", endDate);
    }
    api<ReportData>(`/reports?${qs.toString()}`)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(err instanceof Error ? err.message : "Failed to load reports");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports();
  }, [barangay, selectedReport, startDate, endDate]);

  const categoryMeta = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.value === reportCategory) || REPORT_CATEGORIES[0],
    [reportCategory]
  );

  function exportCsv() {
    if (!data) return;
    const lines: string[] = [`Report Category,${categoryMeta.label}`, `Barangay,${barangay}`, ""];

    if (reportCategory === "payments" || reportCategory === "summary") {
      lines.push("Section,Receipt No,Fisherfolk,Barangay,Permit No,Type,Method,Amount,Date Paid,Status");
      data.listings.payments.forEach((r) => {
        lines.push(
          `Payment,${r.receipt_no},${r.fisherfolk_name},${r.barangay || ""},${r.permit_number},${r.permit_type},${r.payment_method},${r.amount},${r.paid_at || ""},${r.status}`
        );
      });
      lines.push("");
    }

    const pushPermitRows = (section: string, rows: ListingRow[]) => {
      lines.push("Section,Name,ID,Barangay,Boat Type,Fishing Method,Permit Number,Permit Type,Issued,Expires,Status");
      rows.forEach((r) => {
        lines.push(
          `${section},${r.fisherfolk_name},${r.public_id},${r.barangay},${r.boat_type},${r.fishing_method},${r.permit_number},${r.permit_type || ""},${r.issue_date || ""},${r.expiry_date || ""},${r.status}`
        );
      });
      lines.push("");
    };

    if (reportCategory === "new" || reportCategory === "summary") pushPermitRows("New Fisherfolk", data.listings.newFisherfolk);
    if (reportCategory === "renewal" || reportCategory === "summary") pushPermitRows("Renewal", data.listings.renewals);
    if (reportCategory === "replacement" || reportCategory === "summary") pushPermitRows("Replacement", data.listings.replacements);
    if (reportCategory === "expiring" || reportCategory === "summary") pushPermitRows("Expiring", data.listings.expiring);
    if (reportCategory === "all-permits") pushPermitRows("All Permits", data.listings.allPermits);

    if (reportCategory === "boats" || reportCategory === "summary") {
      lines.push("Section,Owner,ID,Barangay,Boat,Fishing Method,Permit Number,Permit Type,Status");
      data.listings.boats.forEach((r) => {
        lines.push(
          `Registered Boat,${r.owner_name},${r.fisherfolk_id},${r.barangay},${r.boat_name || r.boat_type},${r.fishing_method},${r.permit_number},${r.permit_type},,${r.status}`
        );
      });
      lines.push("");
    }

    if (reportCategory === "summary") {
      lines.push("Month,New Permits,Renewals,Revenue,Total");
      data.monthly.forEach((m) => {
        lines.push(`${m.month},${m.permits},${m.renewals},${m.revenue},${m.permits + m.renewals}`);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mfarps-${reportCategory}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodLabel =
    selectedReport === "custom" && startDate && endDate
      ? `Custom Range: ${startDate} to ${endDate}`
      : selectedReport === "all"
        ? "All Time"
        : `${selectedReport.charAt(0).toUpperCase()}${selectedReport.slice(1)} Period`;
  const generatedOn = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const showCharts = reportCategory === "summary";

  return (
    <div>
      {data && (
        <div className="report-print-header">
          <article className="official-doc">
            <div className="official-doc-inner">
              <OfficialDocHeader
                title={categoryMeta.paperTitle}
                subtitle={`${periodLabel} · ${barangay} · Generated ${generatedOn}`}
                logoSize={80}
              />
              <p className="small text-center mb-0" style={{ color: "#475569" }}>
                Official MFARPS report focused on: {categoryMeta.label}
              </p>
            </div>
          </article>
        </div>
      )}

      <div className="no-print">
        <h1 className="h3 mb-1">Reports & Analytics</h1>
        <p className="text-muted">Choose a report category to view, print, or export named records</p>
      </div>
      <Card className="stat-card mb-4 no-print">
        <Card.Body>
          <h2 className="h6">Report Configuration</h2>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label>Report Category</Form.Label>
              <Form.Select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as ReportCategory)}
              >
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Period</Form.Label>
              <Form.Select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
                <option value="all">All Time</option>
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
                {barangays.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button variant="danger" disabled={!data} onClick={() => window.print()}><Download size={16} className="me-1" /> Export as PDF</Button>
            <Button variant="success" disabled={!data} onClick={exportCsv}><Download size={16} className="me-1" /> Export as CSV</Button>
            <Button disabled={!data} onClick={() => window.print()}><Printer size={16} className="me-1" /> Print Report</Button>
            <Button variant="outline-secondary" onClick={loadReports}>Refresh</Button>
          </div>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center flex-wrap gap-2 no-print">
          <span>{error}</span>
          <Button size="sm" variant="outline-danger" onClick={loadReports}>Retry</Button>
        </Alert>
      )}

      {loading && !data && (
        <div className="text-center py-5 text-muted no-print">
          <Spinner animation="border" className="mb-2" />
          <div>Loading reports...</div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="text-muted no-print">No report data available.</div>
      )}

      {data && (
        <>

      {showCharts && (
        <>
          <Row className="g-3 mb-4 no-print">
            <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Permits Issued</div><div className="fs-3 fw-bold">{data.totals.total_permits}</div><FileText size={18} className="text-primary" /></Card.Body></Card></Col>
            <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Renewals</div><div className="fs-3 fw-bold">{data.totals.total_renewals}</div><Calendar size={18} className="text-success" /></Card.Body></Card></Col>
            <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Revenue</div><div className="fs-3 fw-bold">{peso(data.totals.total_revenue)}</div></Card.Body></Card></Col>
            <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Expiring Soon</div><div className="fs-3 fw-bold">{data.totals.expiring}</div><div className="small text-warning">Next 30 days</div></Card.Body></Card></Col>
          </Row>
          <Row className="g-3 mb-4 no-print">
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
        </>
      )}

      <Card className="stat-card mb-4">
        <Card.Body>
          {(reportCategory === "new" || reportCategory === "summary") && (
            <PermitListingTable title="List of New Fisherfolk Permits" rows={data.listings.newFisherfolk} />
          )}
          {(reportCategory === "renewal" || reportCategory === "summary") && (
            <PermitListingTable title="List of Fisherfolk Permit Renewals" rows={data.listings.renewals} />
          )}
          {(reportCategory === "replacement" || reportCategory === "summary") && (
            <PermitListingTable title="List of Fisherfolk Permit Replacements" rows={data.listings.replacements} />
          )}
          {(reportCategory === "boats" || reportCategory === "summary") && (
            <BoatListingTable title="List of Registered Boats / Fishing Vessels" rows={data.listings.boats} />
          )}
          {(reportCategory === "payments" || reportCategory === "summary") && (
            <PaymentListingTable title="List of Payments & Collections" rows={data.listings.payments} />
          )}
          {(reportCategory === "expiring" || reportCategory === "summary") && (
            <PermitListingTable title="List of Permits Expiring Within 30 Days" rows={data.listings.expiring} />
          )}
          {reportCategory === "all-permits" && (
            <PermitListingTable title="Master List of All Permits" rows={data.listings.allPermits} />
          )}

          {showCharts && (
            <>
              <h2 className="h6 mt-4">Monthly Summary</h2>
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
            </>
          )}

          <footer className="official-doc-footer mt-3">
            Official named report · Municipality of Dr. Jose P. Rizal, Palawan · MFARPS<br />
            Category: {categoryMeta.label} · Scope: {barangay} · Period: {periodLabel}
          </footer>
        </Card.Body>
      </Card>
        </>
      )}
    </div>
  );
}
