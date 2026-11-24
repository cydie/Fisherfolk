import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { CheckCircle, Clock, CreditCard, Printer, Search, Settings, Upload } from "lucide-react";
import { api, peso, formatDate } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { OfficialDocHeader } from "../components/OfficialDocHeader";
import { useAuth } from "../context/AuthContext";
import { canManageFees, canProcessPayments } from "../permissions";

type Payment = {
  id: number;
  public_id: string;
  permit_number: string;
  fisherfolk_name: string;
  barangay?: string;
  permit_type: string;
  amount: number;
  payment_method: string;
  or_number?: string;
  reference_number?: string;
  status: string;
  paid_at: string;
  cashier?: string;
};

type PaymentsResponse = {
  records: Payment[];
  summary: { collected: number; pending_count: number; cash: number; online: number };
};

type Fees = { newPermit: number; renewal: number; replacement: number; lateRenewalPenalty: number };

export function Payments() {
  const { user } = useAuth();
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [showPay, setShowPay] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [fees, setFees] = useState<Fees>({ newPermit: 500, renewal: 350, replacement: 250, lateRenewalPenalty: 100 });
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    permitNumber: "",
    fisherfolkName: "",
    permitType: "New Application",
    amount: 500,
    paymentMethod: "Cash",
    orNumber: "",
    referenceNumber: "",
    proofImage: "",
    cashier: user?.name || "",
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api<PaymentsResponse>(`/payments?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`);
      setData(res);
      setError("");
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, status]);

  useEffect(() => {
    api<Record<string, Fees>>("/settings").then((s) => {
      if (s.fees) setFees(s.fees);
    }).catch(() => undefined);
  }, []);

  if (loading && !data) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }

  if (error && !data) {
    return (
      <Alert variant="danger" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>{error}</span>
        <Button size="sm" variant="outline-danger" onClick={load}>Retry</Button>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="h3 mb-1">Payment Management</h1>
          <p className="text-muted mb-0">Process and track permit payments</p>
        </div>
        <div className="d-flex gap-2">
          {user && canManageFees(user.role) && (
            <Button variant="secondary" onClick={() => setShowFees(true)}><Settings size={16} className="me-1" /> Fee Settings</Button>
          )}
          {user && canProcessPayments(user.role) && (
            <Button onClick={() => setShowPay(true)}>₱ Add Payment</Button>
          )}
        </div>
      </div>
      <Row className="g-3 mb-4">
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Collected</div><div className="fs-3 fw-bold">{peso(data.summary.collected)}</div><CheckCircle size={18} className="text-success" /></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Pending Payments</div><div className="fs-3 fw-bold">{data.summary.pending_count}</div><Clock size={18} className="text-warning" /></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Cash Payments</div><div className="fs-3 fw-bold">{peso(data.summary.cash)}</div><CreditCard size={18} className="text-primary" /></Card.Body></Card></Col>
        <Col md={3}><Card className="stat-card"><Card.Body><div className="small text-muted">Online Payments</div><div className="fs-3 fw-bold">{peso(data.summary.online)}</div></Card.Body></Card></Col>
      </Row>
      <Card className="stat-card">
        <Card.Body>
          <h2 className="h6 mb-3">Payment Records</h2>
          <Row className="g-2 mb-3">
            <Col>
              <div className="position-relative">
                <Search size={16} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <Form.Control className="ps-5" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, permit number, or payment ID..." />
              </div>
            </Col>
            <Col xs="auto">
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>All Status</option>
                <option>Fully Paid</option>
                <option>Pending</option>
                <option>Partially Paid</option>
              </Form.Select>
            </Col>
          </Row>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Payment ID</th><th>Permit Number</th><th>Name</th><th>Permit Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.records.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">No payment records found</td>
                </tr>
              )}
              {data.records.map((r) => (
                <tr key={r.id}>
                  <td>{r.public_id}</td>
                  <td>{r.permit_number}</td>
                  <td>{r.fisherfolk_name}</td>
                  <td>{r.permit_type}</td>
                  <td>{peso(r.amount)}</td>
                  <td>{r.payment_method}</td>
                  <td><StatusBadge value={r.status} /></td>
                  <td>{formatDate(r.paid_at)}</td>
                  <td>
                    <Button size="sm" variant="link" onClick={() => setReceipt(r)}><Printer size={14} /> Receipt</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showPay} onHide={() => setShowPay(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Add Payment</Modal.Title></Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Permit Number *</Form.Label>
              <Form.Control value={form.permitNumber} onChange={(e) => setForm({ ...form, permitNumber: e.target.value })} placeholder="PERMIT-2026-XXXX" />
            </Col>
            <Col md={6}>
              <Form.Label>Fisherfolk Name *</Form.Label>
              <Form.Control value={form.fisherfolkName} onChange={(e) => setForm({ ...form, fisherfolkName: e.target.value })} />
            </Col>
            <Col md={6}>
              <Form.Label>Permit Type *</Form.Label>
              <Form.Select
                value={form.permitType}
                onChange={(e) => {
                  const type = e.target.value;
                  const amount = type === "Renewal" ? fees.renewal : type === "Replacement" ? fees.replacement : fees.newPermit;
                  setForm({ ...form, permitType: type, amount });
                }}
              >
                <option>New Application</option>
                <option>Renewal</option>
                <option>Replacement</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Amount *</Form.Label>
              <Form.Control type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Col>
            <Col md={6}>
              <Form.Label>Payment Method *</Form.Label>
              <Form.Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option>Cash</option>
                <option>Online</option>
              </Form.Select>
            </Col>
            {form.paymentMethod === "Cash" ? (
              <>
                <Col md={6}>
                  <Form.Label>OR Number</Form.Label>
                  <Form.Control value={form.orNumber} onChange={(e) => setForm({ ...form, orNumber: e.target.value })} />
                </Col>
                <Col md={6}>
                  <Form.Label>Cashier Name</Form.Label>
                  <Form.Control value={form.cashier} onChange={(e) => setForm({ ...form, cashier: e.target.value })} />
                </Col>
              </>
            ) : (
              <>
                <Col md={6}>
                  <Form.Label>Reference Number</Form.Label>
                  <Form.Control value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
                </Col>
                <Col md={6}>
                  <Form.Label>Proof of Payment</Form.Label>
                  <div className="border rounded p-3 text-center">
                    <Upload size={18} className="me-1" />
                    <Form.Control type="file" onChange={(e) => setForm({ ...form, proofImage: (e.target as HTMLInputElement).files?.[0]?.name || "" })} />
                  </div>
                </Col>
              </>
            )}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="success"
            onClick={async () => {
              setError("");
              try {
                await api("/payments", { method: "POST", body: JSON.stringify(form) });
                setShowPay(false);
                load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            Submit Payment
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!receipt} onHide={() => setReceipt(null)} centered>
        <Modal.Header closeButton className="no-print"><Modal.Title>Official Receipt</Modal.Title></Modal.Header>
        {receipt && (
          <Modal.Body>
            <article className="official-doc receipt print-document">
              <div className="official-doc-inner">
                <OfficialDocHeader
                  title={
                    receipt.permit_type === "Renewal"
                      ? "Official Receipt — Permit Renewal"
                      : receipt.permit_type === "Replacement"
                        ? "Official Receipt — Permit Replacement"
                        : "Official Receipt — New Fisherfolk Permit"
                  }
                  subtitle={`Payment received from ${receipt.fisherfolk_name}${receipt.barangay ? ` · ${receipt.barangay}` : ""}`}
                  logoSize={88}
                />
                <div className="official-meta-grid">
                  <div className="official-meta-item highlight">
                    <label>Receipt No.</label>
                    <div className="value">{receipt.public_id}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Date Paid</label>
                    <div className="value">{formatDate(receipt.paid_at)}</div>
                  </div>
                  <div className="official-meta-item full">
                    <label>Received From (Fisherfolk)</label>
                    <div className="value">{receipt.fisherfolk_name}</div>
                  </div>
                  {receipt.barangay ? (
                    <div className="official-meta-item">
                      <label>Barangay</label>
                      <div className="value">{receipt.barangay}</div>
                    </div>
                  ) : null}
                  <div className="official-meta-item">
                    <label>Permit Number</label>
                    <div className="value">{receipt.permit_number}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Paper / Transaction Type</label>
                    <div className="value">{receipt.permit_type}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Payment Method</label>
                    <div className="value">{receipt.payment_method}</div>
                  </div>
                  {receipt.or_number ? (
                    <div className="official-meta-item">
                      <label>OR Number</label>
                      <div className="value">{receipt.or_number}</div>
                    </div>
                  ) : null}
                  {receipt.reference_number ? (
                    <div className="official-meta-item full">
                      <label>Reference Number</label>
                      <div className="value">{receipt.reference_number}</div>
                    </div>
                  ) : null}
                </div>
                <div className="official-amount-box">
                  <span className="label">Total Amount Paid</span>
                  <span className="amount">{peso(receipt.amount)}</span>
                </div>
                <div className="official-signatures">
                  <div>
                    <div className="official-sign-line">
                      <div className="name">{receipt.cashier || "________________"}</div>
                      <div className="role">Cashier / Collecting Officer</div>
                    </div>
                  </div>
                  <div>
                    <div className="official-sign-line">
                      <div className="name">Municipal Treasurer</div>
                      <div className="role">Authorized Signatory</div>
                    </div>
                  </div>
                </div>
                <footer className="official-doc-footer">
                  Official receipt of the Municipality of Dr. Jose P. Rizal, Palawan · MFARPS<br />
                  Keep this receipt for your records. Valid only when duly signed and sealed.
                </footer>
              </div>
            </article>
          </Modal.Body>
        )}
        <Modal.Footer className="no-print">
          <Button onClick={() => window.print()}><Printer size={16} className="me-1" /> Print / Save as PDF</Button>
          <Button variant="outline-secondary" onClick={() => setReceipt(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showFees} onHide={() => setShowFees(false)}>
        <Modal.Header closeButton><Modal.Title>Permit Fee Configuration</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>New Permit Fee (₱)</Form.Label><Form.Control type="number" value={fees.newPermit} onChange={(e) => setFees({ ...fees, newPermit: Number(e.target.value) })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Renewal Fee (₱)</Form.Label><Form.Control type="number" value={fees.renewal} onChange={(e) => setFees({ ...fees, renewal: Number(e.target.value) })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Replacement Fee (₱)</Form.Label><Form.Control type="number" value={fees.replacement} onChange={(e) => setFees({ ...fees, replacement: Number(e.target.value) })} /></Form.Group>
          <Form.Group><Form.Label>Late Renewal Penalty (₱)</Form.Label><Form.Control type="number" value={fees.lateRenewalPenalty} onChange={(e) => setFees({ ...fees, lateRenewalPenalty: Number(e.target.value) })} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={async () => {
              await api("/settings", { method: "PUT", body: JSON.stringify({ fees }) });
              setShowFees(false);
            }}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
