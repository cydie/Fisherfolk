import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Modal, Nav, Row, Spinner, Table } from "react-bootstrap";
import { Archive, Eye, Filter, Pencil, Search } from "lucide-react";
import { api, formatDate } from "../api";
import { StatusBadge } from "../components/StatusBadge";

type Fisherfolk = {
  id: number;
  public_id: string;
  name: string;
  barangay: string;
  contact: string;
  boat_type?: string;
  boats: number;
  permit_status: string;
  date_registered: string;
};

type Permit = {
  id: number;
  permit_number: string;
  owner_name: string;
  barangay: string;
  boat_type: string;
  issue_date: string;
  expiry_date: string;
  status: string;
};

const barangays = ["All Barangays", "Barangay Canipo", "Barangay Taburi", "Barangay Campong-Ulay", "Barangay Iraan", "Barangay Culasian", "Barangay Lao", "Barangay Panalingaan"];
const statuses = ["All Status", "Active", "Expired", "Pending"];
const boatTypes = ["All Boat Types", "Motorized Banca", "Non-Motorized Banca", "Fishing Boat", "Motorboat"];

export function Records() {
  const [tab, setTab] = useState<"fisherfolk" | "permits" | "archived">("fisherfolk");
  const [search, setSearch] = useState("");
  const [barangay, setBarangay] = useState("All Barangays");
  const [status, setStatus] = useState("All Status");
  const [boatType, setBoatType] = useState("All Boat Types");
  const [showFilters, setShowFilters] = useState(false);
  const [people, setPeople] = useState<Fisherfolk[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [archived, setArchived] = useState<Fisherfolk[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Fisherfolk | null>(null);
  const [detail, setDetail] = useState<Fisherfolk | null>(null);

  async function load() {
    setLoading(true);
    const q = `search=${encodeURIComponent(search)}&barangay=${encodeURIComponent(barangay)}&status=${encodeURIComponent(status)}&boatType=${encodeURIComponent(boatType)}`;
    const [a, b, c] = await Promise.all([
      api<Fisherfolk[]>(`/fisherfolk?${q}`),
      api<Permit[]>(`/permits?${q}`),
      api<Fisherfolk[]>(`/fisherfolk?archived=true&search=${encodeURIComponent(search)}`),
    ]);
    setPeople(a);
    setPermits(b);
    setArchived(c);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [search, barangay, status, boatType]);

  const rows = tab === "fisherfolk" ? people : tab === "archived" ? archived : [];

  const pageSize = 8;
  const [page, setPage] = useState(1);
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    if (tab === "permits") return permits.slice(start, start + pageSize);
    return rows.slice(start, start + pageSize);
  }, [page, tab, permits, rows]);
  const total = tab === "permits" ? permits.length : rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => setPage(1), [tab, search, barangay, status, boatType]);

  return (
    <div>
      <h1 className="h3 mb-1">Records Management</h1>
      <p className="text-muted">View and manage fisherfolk and permit records</p>
      <Card className="stat-card">
        <Card.Header className="bg-white">
          <Nav variant="pills">
            <Nav.Item><Nav.Link active={tab === "fisherfolk"} onClick={() => setTab("fisherfolk")}>Fisherfolk Records</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link active={tab === "permits"} onClick={() => setTab("permits")}>Permit Records</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link active={tab === "archived"} onClick={() => setTab("archived")}>Archived Records</Nav.Link></Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col>
              <div className="position-relative">
                <Search size={16} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <Form.Control className="ps-5" value={search} placeholder="Search by name, ID, or permit number..." onChange={(e) => setSearch(e.target.value)} />
              </div>
            </Col>
            <Col xs="auto">
              <Button variant="outline-secondary" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={16} className="me-1" /> Filters
              </Button>
            </Col>
          </Row>
          {showFilters && (
            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Label>Barangay</Form.Label>
                <Form.Select value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                  {barangays.map((b) => <option key={b}>{b}</option>)}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </Form.Select>
              </Col>
              {tab === "fisherfolk" && (
                <Col md={4}>
                  <Form.Label>Boat Type</Form.Label>
                  <Form.Select value={boatType} onChange={(e) => setBoatType(e.target.value)}>
                    {boatTypes.map((t) => <option key={t}>{t}</option>)}
                  </Form.Select>
                </Col>
              )}
            </Row>
          )}
          {loading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : tab === "permits" ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Permit Number</th><th>Owner Name</th><th>Barangay</th><th>Boat Type</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(paged as Permit[]).map((p) => (
                  <tr key={p.id}>
                    <td>{p.permit_number}</td>
                    <td>{p.owner_name}</td>
                    <td>{p.barangay}</td>
                    <td>{p.boat_type}</td>
                    <td>{formatDate(p.issue_date)}</td>
                    <td>{formatDate(p.expiry_date)}</td>
                    <td><StatusBadge value={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted py-5">
              <Archive className="mb-2" />
              <div>No records</div>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>ID</th><th>Name</th><th>Barangay</th><th>Contact</th><th>Boat Type</th><th>Boats</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(paged as Fisherfolk[]).map((r) => (
                  <tr key={r.id}>
                    <td>{r.public_id}</td>
                    <td>{r.name}</td>
                    <td>{r.barangay}</td>
                    <td>{r.contact}</td>
                    <td>{r.boat_type || "—"}</td>
                    <td>{r.boats}</td>
                    <td><StatusBadge value={r.permit_status} /></td>
                    <td className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={() => setDetail(r)}><Eye size={14} /></Button>
                      {tab !== "archived" && (
                        <>
                          <Button size="sm" variant="outline-success" onClick={() => setEdit(r)}><Pencil size={14} /></Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={async () => {
                              await api(`/fisherfolk/${r.id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) });
                              load();
                            }}
                          >
                            <Archive size={14} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {pages > 1 && (
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}</small>
              <div className="d-flex gap-1">
                <Button size="sm" variant="outline-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="outline-secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={!!detail} onHide={() => setDetail(null)}>
        <Modal.Header closeButton><Modal.Title>Record details</Modal.Title></Modal.Header>
        {detail && (
          <Modal.Body>
            <p><strong>Registered:</strong> {formatDate(detail.date_registered)}</p>
            <p><strong>Boats owned:</strong> {detail.boats}</p>
            <p><strong>Primary boat type:</strong> {detail.boat_type || "—"}</p>
            <p><strong>Contact:</strong> {detail.contact}</p>
          </Modal.Body>
        )}
      </Modal>

      <Modal show={!!edit} onHide={() => setEdit(null)}>
        <Modal.Header closeButton><Modal.Title>Edit fisherfolk</Modal.Title></Modal.Header>
        {edit && (
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Barangay</Form.Label>
              <Form.Select value={edit.barangay} onChange={(e) => setEdit({ ...edit, barangay: e.target.value })}>
                {barangays.slice(1).map((b) => <option key={b}>{b}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Contact</Form.Label>
              <Form.Control value={edit.contact} onChange={(e) => setEdit({ ...edit, contact: e.target.value })} />
            </Form.Group>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button
            onClick={async () => {
              if (!edit) return;
              await api(`/fisherfolk/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: edit.name, barangay: edit.barangay, contact: edit.contact }) });
              setEdit(null);
              load();
            }}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
