import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from "react-bootstrap";
import { Bell, Globe, MapPin, Pencil, Plus, Save, Shield, Trash2 } from "lucide-react";
import { api, formatDate } from "../api";

type SettingsMap = {
  fees?: Record<string, number>;
  notifications?: { expirationReminders: boolean; paymentAlerts: boolean; applicationUpdates: boolean };
  security?: { strongPasswords: boolean; twoFactor: boolean };
  system?: { municipality: string; systemName: string; version: string };
};

type Barangay = {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  created_at: string;
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [saved, setSaved] = useState("");
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [barangayError, setBarangayError] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [settingsError, setSettingsError] = useState("");

  async function loadBarangays() {
    setLoadingBarangays(true);
    try {
      const rows = await api<Barangay[]>("/barangays");
      setBarangays(rows);
      setBarangayError("");
    } catch (err) {
      setBarangayError(err instanceof Error ? err.message : "Failed to load barangays");
    } finally {
      setLoadingBarangays(false);
    }
  }

  useEffect(() => {
    api<SettingsMap>("/settings")
      .then(setSettings)
      .catch((err) => setSettingsError(err instanceof Error ? err.message : "Failed to load settings"));
    loadBarangays();
  }, []);

  const notes = settings.notifications || { expirationReminders: true, paymentAlerts: true, applicationUpdates: true };
  const security = settings.security || { strongPasswords: true, twoFactor: false };
  const system = settings.system || { municipality: "Dr. Jose P. Rizal, Palawan", systemName: "Municipal Fisherfolk & Boat Permit System", version: "1.0.0" };

  async function addBarangay() {
    const name = newName.trim();
    if (!name) return;
    setBarangayError("");
    try {
      await api("/barangays", { method: "POST", body: JSON.stringify({ name }) });
      setNewName("");
      await loadBarangays();
    } catch (err) {
      setBarangayError(err instanceof Error ? err.message : "Failed to add barangay");
    }
  }

  async function saveEdit(id: number) {
    const name = editName.trim();
    if (!name) return;
    setBusyId(id);
    setBarangayError("");
    try {
      await api(`/barangays/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setEditingId(null);
      await loadBarangays();
    } catch (err) {
      setBarangayError(err instanceof Error ? err.message : "Failed to update barangay");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(row: Barangay) {
    setBusyId(row.id);
    setBarangayError("");
    try {
      await api(`/barangays/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: row.status === "Active" ? "Inactive" : "Active" }),
      });
      await loadBarangays();
    } catch (err) {
      setBarangayError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  async function removeBarangay(row: Barangay) {
    if (!window.confirm(`Delete ${row.name}?`)) return;
    setBusyId(row.id);
    setBarangayError("");
    try {
      await api(`/barangays/${row.id}`, { method: "DELETE" });
      await loadBarangays();
    } catch (err) {
      setBarangayError(err instanceof Error ? err.message : "Failed to delete barangay");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Settings</h1>
      <p className="text-muted">Manage system configuration and preferences</p>
      {saved && <Alert variant="success">{saved}</Alert>}
      {settingsError && <Alert variant="danger">{settingsError}</Alert>}
      <Card className="stat-card mb-3">
        <Card.Body>
          <h2 className="h6"><Globe size={18} className="me-2" />System Information</h2>
          <Row>
            <Col md={6}><div className="text-muted small">System Name</div><div className="fw-semibold">{system.systemName}</div></Col>
            <Col md={6}><div className="text-muted small">Version</div><div className="fw-semibold">{system.version}</div></Col>
            <Col md={6} className="mt-3"><div className="text-muted small">Municipality</div><div className="fw-semibold">{system.municipality}</div></Col>
            <Col md={6} className="mt-3"><div className="text-muted small">Last Updated</div><div className="fw-semibold">{new Date().toLocaleDateString()}</div></Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="stat-card mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 mb-0"><MapPin size={18} className="me-2" />Barangay Management</h2>
            <span className="small text-muted">{barangays.length} barangay(s)</span>
          </div>
          {barangayError && <Alert variant="danger">{barangayError}</Alert>}
          <Row className="g-2 mb-3">
            <Col>
              <Form.Control
                placeholder="New barangay name (e.g. Barangay Canipo)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBarangay();
                  }
                }}
              />
            </Col>
            <Col xs="auto">
              <Button onClick={addBarangay} disabled={!newName.trim()}>
                <Plus size={16} className="me-1" /> Add
              </Button>
            </Col>
          </Row>
          {loadingBarangays ? (
            <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>Barangay</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {barangays.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {editingId === row.id ? (
                        <Form.Control
                          size="sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEdit(row.id);
                            }
                          }}
                        />
                      ) : (
                        row.name
                      )}
                    </td>
                    <td>
                      <span className={`badge ${row.status === "Active" ? "text-bg-success" : "text-bg-secondary"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="small text-muted">{formatDate(row.created_at)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {editingId === row.id ? (
                          <>
                            <Button size="sm" disabled={busyId === row.id} onClick={() => saveEdit(row.id)}>Save</Button>
                            <Button size="sm" variant="outline-secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              disabled={busyId === row.id}
                              onClick={() => {
                                setEditingId(row.id);
                                setEditName(row.name);
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              disabled={busyId === row.id}
                              onClick={() => toggleStatus(row)}
                            >
                              {row.status === "Active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={busyId === row.id}
                              onClick={() => removeBarangay(row)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {barangays.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">No barangays yet. Add one above.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="stat-card mb-3">
        <Card.Body>
          <h2 className="h6"><Bell size={18} className="me-2" />Notification Settings</h2>
          <Form.Check type="switch" id="exp" className="mb-2" label="Expiration Reminders" checked={notes.expirationReminders} onChange={(e) => setSettings({ ...settings, notifications: { ...notes, expirationReminders: e.target.checked } })} />
          <Form.Check type="switch" id="pay" className="mb-2" label="Payment Alerts" checked={notes.paymentAlerts} onChange={(e) => setSettings({ ...settings, notifications: { ...notes, paymentAlerts: e.target.checked } })} />
          <Form.Check type="switch" id="app" label="Application Updates" checked={notes.applicationUpdates} onChange={(e) => setSettings({ ...settings, notifications: { ...notes, applicationUpdates: e.target.checked } })} />
        </Card.Body>
      </Card>
      <Card className="stat-card mb-3">
        <Card.Body>
          <h2 className="h6"><Shield size={18} className="me-2" />Security Settings</h2>
          <Form.Check type="switch" id="pw" className="mb-2" label="Require Strong Passwords" checked={security.strongPasswords} onChange={(e) => setSettings({ ...settings, security: { ...security, strongPasswords: e.target.checked } })} />
          <Form.Check type="switch" id="2fa" label="Two-Factor Authentication" checked={security.twoFactor} onChange={(e) => setSettings({ ...settings, security: { ...security, twoFactor: e.target.checked } })} />
        </Card.Body>
      </Card>
      <div className="text-end">
        <Button
          onClick={async () => {
            await api("/settings", { method: "PUT", body: JSON.stringify({ notifications: notes, security }) });
            setSaved("Settings saved.");
          }}
        >
          <Save size={16} className="me-1" /> Save Changes
        </Button>
      </div>
    </div>
  );
}
