import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, ListGroup, Modal, Row, Spinner } from "react-bootstrap";
import { Anchor, CheckCircle, FileText, Printer, Search, Upload, User, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import { OfficialDocHeader } from "../components/OfficialDocHeader";

type Lookups = {
  barangays: string[];
  boatTypes: string[];
  fishingMethods: string[];
  permitTypes: string[];
};

type Fisherfolk = {
  id: number;
  public_id: string;
  name: string;
  barangay: string;
  contact: string;
};

type Permit = {
  permit_number: string;
  fisherfolkName: string;
  barangay: string;
  boatType: string;
  fishingMethod: string;
  permitType: string;
};

const steps = [
  { number: 1, title: "Fisherfolk Information", icon: User },
  { number: 2, title: "Boat Details", icon: Anchor },
  { number: 3, title: "Documents", icon: FileText },
  { number: 4, title: "Review & Submit", icon: CheckCircle },
];

export function RenewPermit() {
  const [step, setStep] = useState(1);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [people, setPeople] = useState<Fisherfolk[]>([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Permit | null>(null);
  const [bootError, setBootError] = useState("");
  const [form, setForm] = useState({
    fisherfolkId: "" as number | "",
    fisherfolkName: "",
    barangay: "",
    contact: "",
    boatType: "",
    fishingMethod: "",
    permitType: "New Application",
  });

  function loadBoot() {
    setBootError("");
    Promise.all([api<Lookups>("/lookups"), api<Fisherfolk[]>("/fisherfolk")])
      .then(([l, p]) => {
        setLookups(l);
        setPeople(p);
      })
      .catch((err) => {
        setLookups(null);
        setBootError(err instanceof Error ? err.message : "Failed to load form data");
      });
  }

  useEffect(() => {
    loadBoot();
  }, []);

  const filtered = useMemo(
    () =>
      people.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.public_id.toLowerCase().includes(search.toLowerCase())
      ),
    [people, search]
  );

  async function submit() {
    setError("");
    setSaving(true);
    try {
      const created = await api<{ permit_number: string }>("/permits", {
        method: "POST",
        body: JSON.stringify({
          fisherfolkId: form.fisherfolkId || undefined,
          fisherfolkName: form.fisherfolkName,
          barangay: form.barangay,
          contact: form.contact,
          boatType: form.boatType,
          fishingMethod: form.fishingMethod,
          permitType: form.permitType,
          documents: docs,
        }),
      });
      setPreview({
        permit_number: created.permit_number,
        fisherfolkName: form.fisherfolkName,
        barangay: form.barangay,
        boatType: form.boatType,
        fishingMethod: form.fishingMethod,
        permitType: form.permitType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  function validateStep(current: number) {
    if (current === 1) {
      if (!form.fisherfolkName.trim() || !form.barangay || !form.contact.trim()) {
        setError("Full name, barangay, and contact number are required.");
        return false;
      }
    }
    if (current === 2) {
      if (!form.boatType || !form.fishingMethod) {
        setError("Boat type and fishing method are required.");
        return false;
      }
    }
    setError("");
    return true;
  }

  if (bootError && !lookups) {
    return (
      <Alert variant="danger" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <span>{bootError}</span>
        <Button size="sm" variant="outline-danger" onClick={loadBoot}>Retry</Button>
      </Alert>
    );
  }

  if (!lookups) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <div>
      <h1 className="h3 mb-1">Renew / Permit Application</h1>
      <p className="text-muted">Create a new permit or renew an existing one</p>
      <Card className="stat-card mb-3">
        <Card.Body className="permit-steps d-flex justify-content-between align-items-center flex-wrap gap-2">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const active = step === s.number;
            const done = step > s.number;
            return (
              <div key={s.number} className="d-flex align-items-center flex-grow-1 permit-step">
                <div className="text-center flex-grow-1">
                  <div className={`step-dot mx-auto text-white ${active ? "bg-primary" : done ? "bg-success" : "bg-secondary"}`}>
                    <Icon size={18} />
                  </div>
                  <div className={`small mt-2 ${active ? "text-primary fw-semibold" : "text-muted"}`}>{s.title}</div>
                </div>
                {index < steps.length - 1 && <div className={`flex-grow-1 d-none d-md-block ${step > s.number ? "bg-success" : "bg-light"}`} style={{ height: 4 }} />}
              </div>
            );
          })}
        </Card.Body>
      </Card>
      <Card className="stat-card">
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {step === 1 && (
            <>
              <h2 className="h5">Fisherfolk Information</h2>
              <Form.Group className="mb-3 position-relative">
                <Form.Label>Search Existing Fisherfolk</Form.Label>
                <div className="position-relative">
                  <Search size={16} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                  <Form.Control
                    className="ps-5"
                    value={search}
                    placeholder="Search by name or ID..."
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowResults(true);
                    }}
                  />
                </div>
                {showResults && search && (
                  <ListGroup className="position-absolute w-100 shadow mt-1" style={{ zIndex: 5 }}>
                    {filtered.map((p) => (
                      <ListGroup.Item
                        action
                        key={p.id}
                        onClick={() => {
                          setForm({
                            ...form,
                            fisherfolkId: p.id,
                            fisherfolkName: p.name,
                            barangay: p.barangay,
                            contact: p.contact,
                          });
                          setSearch(p.name);
                          setShowResults(false);
                        }}
                      >
                        <strong>{p.name}</strong>
                        <div className="small text-muted">{p.public_id} • {p.barangay}</div>
                      </ListGroup.Item>
                    ))}
                    {filtered.length === 0 && <ListGroup.Item>No results found</ListGroup.Item>}
                  </ListGroup>
                )}
              </Form.Group>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Full Name *</Form.Label>
                  <Form.Control value={form.fisherfolkName} onChange={(e) => setForm({ ...form, fisherfolkName: e.target.value })} />
                </Col>
                <Col md={6}>
                  <Form.Label>Barangay *</Form.Label>
                  <Form.Select value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })}>
                    <option value="">Select Barangay</option>
                    {lookups.barangays.map((b) => <option key={b}>{b}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label>Contact Number *</Form.Label>
                  <Form.Control value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="09XXXXXXXXX" />
                </Col>
                <Col md={6}>
                  <Form.Label>Permit Type *</Form.Label>
                  <Form.Select value={form.permitType} onChange={(e) => setForm({ ...form, permitType: e.target.value })}>
                    {lookups.permitTypes.map((t) => <option key={t}>{t}</option>)}
                  </Form.Select>
                </Col>
              </Row>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="h5">Boat Details</h2>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label>Boat Type *</Form.Label>
                  <Form.Select value={form.boatType} onChange={(e) => setForm({ ...form, boatType: e.target.value })}>
                    <option value="">Select Boat Type</option>
                    {lookups.boatTypes.map((t) => <option key={t}>{t}</option>)}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label>Fishing Method *</Form.Label>
                  <Form.Select value={form.fishingMethod} onChange={(e) => setForm({ ...form, fishingMethod: e.target.value })}>
                    <option value="">Select Fishing Method</option>
                    {lookups.fishingMethods.map((m) => <option key={m}>{m}</option>)}
                  </Form.Select>
                </Col>
              </Row>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="h5">Upload Required Documents</h2>
              <label className="border border-2 border-dashed rounded-3 p-5 text-center d-block" htmlFor="docs">
                <Upload className="mb-2" />
                <div>Click to attach supporting files. File names are recorded with the application (upload is local reference only).</div>
              </label>
              <input
                id="docs"
                type="file"
                multiple
                className="d-none"
                onChange={(e) => {
                  const names = Array.from(e.target.files || []).map((f) => f.name);
                  setDocs([...docs, ...names]);
                }}
              />
              {docs.map((name) => (
                <div key={name} className="d-flex justify-content-between align-items-center bg-light rounded p-2 mt-2">
                  <span><FileText size={16} className="me-2" />{name}</span>
                  <Button size="sm" variant="link" className="text-danger" onClick={() => setDocs(docs.filter((d) => d !== name))}>
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="h5">Review & Submit</h2>
              <Row>
                <Col md={6}>
                  <p className="mb-1 text-muted">Fisherfolk Name</p>
                  <p className="fw-semibold">{form.fisherfolkName || "Not provided"}</p>
                  <p className="mb-1 text-muted">Barangay</p>
                  <p className="fw-semibold">{form.barangay || "Not provided"}</p>
                  <p className="mb-1 text-muted">Contact Number</p>
                  <p className="fw-semibold">{form.contact || "Not provided"}</p>
                </Col>
                <Col md={6}>
                  <p className="mb-1 text-muted">Permit Type</p>
                  <p className="fw-semibold">{form.permitType}</p>
                  <p className="mb-1 text-muted">Boat Type</p>
                  <p className="fw-semibold">{form.boatType || "Not provided"}</p>
                  <p className="mb-1 text-muted">Fishing Method</p>
                  <p className="fw-semibold">{form.fishingMethod || "Not provided"}</p>
                </Col>
              </Row>
            </>
          )}
          <div className="d-flex justify-content-between mt-4 pt-3 border-top">
            <Button variant="outline-secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>Previous</Button>
            {step < 4 ? (
              <Button
                onClick={() => {
                  if (!validateStep(step)) return;
                  setStep(step + 1);
                }}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="success"
                disabled={saving}
                onClick={() => {
                  if (!validateStep(1) || !validateStep(2)) {
                    setStep(!form.fisherfolkName || !form.barangay || !form.contact ? 1 : 2);
                    return;
                  }
                  submit();
                }}
              >
                {saving ? "Submitting..." : "Submit Application"}
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal show={!!preview} onHide={() => setPreview(null)} size="lg" centered>
        <Modal.Header closeButton className="no-print"><Modal.Title>Permit Preview</Modal.Title></Modal.Header>
        {preview && (
          <Modal.Body>
            <article className="official-doc permit print-document">
              <div className="official-doc-inner">
                <OfficialDocHeader
                  title={
                    preview.permitType === "Renewal"
                      ? "Fisherfolk Permit Renewal"
                      : preview.permitType === "Replacement"
                        ? "Fisherfolk Permit Replacement"
                        : "New Fisherfolk Permit"
                  }
                  subtitle={`Issued to ${preview.fisherfolkName} · ${preview.boatType || "Registered Boat"} · ${preview.barangay}`}
                />
                <div className="official-meta-grid">
                  <div className="official-meta-item highlight">
                    <label>Permit Number</label>
                    <div className="value">{preview.permit_number}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Date Issued</label>
                    <div className="value">{new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
                  </div>
                  <div className="official-meta-item full">
                    <label>Name of Fisherfolk</label>
                    <div className="value">{preview.fisherfolkName}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Barangay</label>
                    <div className="value">{preview.barangay}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Transaction / Paper Type</label>
                    <div className="value">{preview.permitType}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Boat / Vessel Type</label>
                    <div className="value">{preview.boatType || "—"}</div>
                  </div>
                  <div className="official-meta-item">
                    <label>Fishing Method</label>
                    <div className="value">{preview.fishingMethod || "—"}</div>
                  </div>
                </div>
                <p className="small text-center mb-0" style={{ color: "#475569" }}>
                  This {preview.permitType === "Renewal" ? "renewal permit" : preview.permitType === "Replacement" ? "replacement permit" : "new fisherfolk permit"}{" "}
                  certifies that <strong>{preview.fisherfolkName}</strong> of <strong>{preview.barangay}</strong>,
                  operating a <strong>{preview.boatType || "registered boat"}</strong>, is duly authorized
                  to engage in fishing activities within the territorial waters of the Municipality
                  of Dr. Jose P. Rizal, Palawan, subject to existing laws and municipal ordinances.
                </p>
                <div className="official-signatures">
                  <div>
                    <div className="official-sign-line">
                      <div className="name">Municipal Agriculturist</div>
                      <div className="role">Recommending Approval</div>
                    </div>
                  </div>
                  <div>
                    <div className="official-sign-line">
                      <div className="name">Municipal Mayor</div>
                      <div className="role">Approving Authority</div>
                    </div>
                  </div>
                </div>
                <div className="official-qr-block">
                  <QRCodeSVG value={`${window.location.origin}/verify/${preview.permit_number}`} size={112} />
                  <div className="hint">Scan to verify authenticity online</div>
                </div>
                <footer className="official-doc-footer">
                  Official document of the Municipality of Dr. Jose P. Rizal, Palawan · MFARPS<br />
                  Any alteration or unauthorized reproduction of this permit is punishable by law.
                </footer>
              </div>
            </article>
          </Modal.Body>
        )}
        <Modal.Footer className="no-print">
          <Button onClick={() => window.print()}><Printer size={16} className="me-1" /> Print / Save as PDF</Button>
          <Button variant="outline-secondary" onClick={() => setPreview(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
