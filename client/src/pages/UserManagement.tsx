import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Key, Pencil, Search, Shield, Trash2, User, UserPlus } from "lucide-react";
import { api, formatDateTime, type User as AppUser } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [resetId, setResetId] = useState<number | null>(null);
  const [edit, setEdit] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Staff", password: "" });

  async function load() {
    setUsers(await api<AppUser[]>(`/users?search=${encodeURIComponent(search)}`));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [search]);

  const active = users.filter((u) => u.status === "Active").length;
  const admins = users.filter((u) => u.role === "Head Admin").length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-1">User Management</h1>
          <p className="text-muted mb-0">Manage staff accounts and permissions</p>
        </div>
        <Button onClick={() => setShow(true)}><UserPlus size={16} className="me-1" /> Add New User</Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="g-3 mb-4">
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Total Users</div><div className="fs-3 fw-bold">{users.length}</div><User size={18} className="text-primary" /></Card.Body></Card></Col>
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Active Users</div><div className="fs-3 fw-bold">{active}</div><Shield size={18} className="text-success" /></Card.Body></Card></Col>
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Admins</div><div className="fs-3 fw-bold">{admins}</div></Card.Body></Card></Col>
      </Row>
      <Card className="stat-card">
        <Card.Body>
          <div className="position-relative mb-3">
            <Search size={16} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
            <Form.Control className="ps-5" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name or email..." />
          </div>
          {users.length === 0 ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><StatusBadge value={u.role} /></td>
                    <td><StatusBadge value={u.status} /></td>
                    <td>{formatDateTime(u.last_login)}</td>
                    <td className="d-flex gap-2">
                      <Button size="sm" variant="outline-primary" onClick={() => setEdit(u)}><Pencil size={14} /></Button>
                      <Button size="sm" variant="outline-success" onClick={() => setResetId(u.id)}><Key size={14} /></Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={async () => {
                          if (!confirm("Delete this user?")) return;
                          try {
                            await api(`/users/${u.id}`, { method: "DELETE" });
                            load();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Delete failed");
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton><Modal.Title>Add New User</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Full Name</Form.Label><Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Staff</option>
              <option>Cashier</option>
              <option>Head Admin</option>
            </Form.Select>
          </Form.Group>
          <Form.Group><Form.Label>Password</Form.Label><Form.Control type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={async () => {
              try {
                await api("/users", { method: "POST", body: JSON.stringify(form) });
                setShow(false);
                setForm({ name: "", email: "", role: "Staff", password: "" });
                load();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              }
            }}
          >
            Add User
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!edit} onHide={() => setEdit(null)}>
        <Modal.Header closeButton><Modal.Title>Edit User</Modal.Title></Modal.Header>
        {edit && (
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as AppUser["role"] })}>
                <option>Staff</option>
                <option>Cashier</option>
                <option>Head Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option>Active</option>
                <option>Inactive</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button
            onClick={async () => {
              if (!edit) return;
              await api(`/users/${edit.id}`, { method: "PATCH", body: JSON.stringify({ name: edit.name, role: edit.role, status: edit.status }) });
              setEdit(null);
              load();
            }}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={resetId !== null} onHide={() => setResetId(null)}>
        <Modal.Header closeButton><Modal.Title>Reset Password</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>New password</Form.Label>
            <Form.Control
              type="password"
              id="new-pass"
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  await api(`/users/${resetId}`, { method: "PATCH", body: JSON.stringify({ password: (e.target as HTMLInputElement).value }) });
                  setResetId(null);
                }
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={async () => {
              const password = (document.getElementById("new-pass") as HTMLInputElement).value;
              await api(`/users/${resetId}`, { method: "PATCH", body: JSON.stringify({ password }) });
              setResetId(null);
            }}
          >
            Update password
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
