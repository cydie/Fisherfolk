import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, ListGroup, Modal, Row, Spinner } from "react-bootstrap";
import { Anchor, CheckCircle, FileText, Printer, Search, Upload, User, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";

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
  const [form, setForm] = useState({
    fisherfolkId: "" as number | "",
    fisherfolkName: "",
    barangay: "",
    contact: "",
    boatType: "",
    fishingMethod: "",
    permitType: "New Application",
  });

  useEffect(() => {
    api<Lookups>("/lookups").then(setLookups);
    api<Fisherfolk[]>("/fisherfolk").then(setPeople);
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

  if (!lookups) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <div>
      <h1 className="h3 mb-1">Renew / Permit Application</h1>
      <p className="text-muted">Create a new permit or renew an existing one</p>
      <Card className="stat-card mb-3">
        <Card.Body className="d-flex justify-content-between align-items-center">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const active = step === s.number;
            const done = step > s.number;
            return (
              <div key={s.number} className="d-flex align-items-center flex-grow-1">
                <div className="text-center flex-grow-1">
                  <div className={`step-dot mx-auto text-white ${active ? "bg-primary" : done ? "bg-success" : "bg-secondary"}`}>
                    <Icon size={18} />
                  </div>
                  <div className={`small mt-2 ${active ? "text-primary fw-semibold" : "text-muted"}`}>{s.title}</div>
                </div>
                {index < steps.length - 1 && <div className={`flex-grow-1 ${step > s.number ? "bg-success" : "bg-light"}`} style={{ height: 4 }} />}
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
                <div>Click to attach supporting files. Names are stored with the application.</div>
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
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button variant="success" disabled={saving} onClick={submit}>{saving ? "Submitting..." : "Submit Application"}</Button>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal show={!!preview} onHide={() => setPreview(null)} size="lg">
        <Modal.Header closeButton><Modal.Title>Permit Preview</Modal.Title></Modal.Header>
        {preview && (
          <Modal.Body>
            <div className="permit-sheet p-4 p-md-5">
              <div className="text-center mb-4">
                <img src="/logo.svg" alt="Rizal" width={80} height={80} />
                <h3 className="h5 mt-3 mb-0">MUNICIPALITY OF DR. JOSE P. RIZAL</h3>
                <div className="text-primary">PALAWAN, PHILIPPINES</div>
                <div className="fw-bold mt-2">FISHERFOLK PERMIT</div>
              </div>
              <Row className="mb-4">
                <Col><small className="text-muted">Permit Number</small><div className="fw-bold">{preview.permit_number}</div></Col>
                <Col><small className="text-muted">Issue Date</small><div>{new Date().toLocaleDateString()}</div></Col>
                <Col xs={12} md={6}><small className="text-muted">Name</small><div>{preview.fisherfolkName}</div></Col>
                <Col xs={12} md={6}><small className="text-muted">Barangay</small><div>{preview.barangay}</div></Col>
                <Col xs={12} md={6}><small className="text-muted">Boat Type</small><div>{preview.boatType}</div></Col>
                <Col xs={12} md={6}><small className="text-muted">Fishing Method</small><div>{preview.fishingMethod}</div></Col>
              </Row>
              <div className="text-center border-top pt-3">
                <QRCodeSVG value={`${window.location.origin}/verify/${preview.permit_number}`} size={120} />
                <div className="small text-muted mt-2">Scan to verify</div>
              </div>
            </div>
          </Modal.Body>
        )}
        <Modal.Footer className="no-print">
          <Button onClick={() => window.print()}><Printer size={16} className="me-1" /> Print Permit</Button>
          <Button variant="outline-secondary" onClick={() => setPreview(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
