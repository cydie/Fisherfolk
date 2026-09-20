import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, Row } from "react-bootstrap";
import { Bell, Globe, Save, Shield } from "lucide-react";
import { api } from "../api";

type SettingsMap = {
  fees?: Record<string, number>;
  notifications?: { expirationReminders: boolean; paymentAlerts: boolean; applicationUpdates: boolean };
  security?: { strongPasswords: boolean; twoFactor: boolean };
  system?: { municipality: string; systemName: string; version: string };
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [saved, setSaved] = useState("");

  useEffect(() => {
    api<SettingsMap>("/settings").then(setSettings);
  }, []);

  const notes = settings.notifications || { expirationReminders: true, paymentAlerts: true, applicationUpdates: true };
  const security = settings.security || { strongPasswords: true, twoFactor: false };
  const system = settings.system || { municipality: "Dr. Jose P. Rizal, Palawan", systemName: "Municipal Fisherfolk & Boat Permit System", version: "1.0.0" };

  return (
    <div>
      <h1 className="h3 mb-1">Settings</h1>
      <p className="text-muted">Manage system configuration and preferences</p>
      {saved && <Alert variant="success">{saved}</Alert>}
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
