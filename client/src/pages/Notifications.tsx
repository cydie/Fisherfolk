import { useEffect, useState } from "react";
import { Button, Card, Col, Row, Spinner, Table } from "react-bootstrap";
import { AlertCircle, Bell, CheckCircle, Clock, Megaphone, Trash2 } from "lucide-react";
import { api, formatDateTime } from "../api";

type Note = { id: number; type: string; title: string; message: string; is_read: boolean; created_at: string };
type Log = { id: number; user_name: string; action: string; created_at: string };
type Payload = { notifications: Note[]; activity: Log[]; unread: number; expiring: number; pending: number };

const icons: Record<string, typeof Bell> = {
  expiration: AlertCircle,
  approval: CheckCircle,
  payment: Clock,
  renewal: Bell,
  announcement: Megaphone,
  application: Bell,
};

export function Notifications() {
  const [data, setData] = useState<Payload | null>(null);

  async function load() {
    setData(await api<Payload>("/notifications"));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  if (!data) return <div className="text-center py-5"><Spinner animation="border" /></div>;

  return (
    <div>
      <h1 className="h3 mb-1">Notifications</h1>
      <p className="text-muted">Stay updated with system notifications and activity logs</p>
      <Row className="g-3 mb-4">
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Unread Notifications</div><div className="fs-3 fw-bold">{data.unread}</div></Card.Body></Card></Col>
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Expiring Permits</div><div className="fs-3 fw-bold">{data.expiring}</div><div className="small text-warning">Next 30 days</div></Card.Body></Card></Col>
        <Col md={4}><Card className="stat-card"><Card.Body><div className="small text-muted">Pending Actions</div><div className="fs-3 fw-bold">{data.pending}</div></Card.Body></Card></Col>
      </Row>
      <Card className="stat-card mb-4">
        <Card.Header className="bg-white d-flex justify-content-between">
          <strong>Recent Notifications</strong>
          <Button
            variant="link"
            size="sm"
            onClick={async () => {
              await api("/notifications/read-all", { method: "POST" });
              load();
            }}
          >
            Mark all as read
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {data.notifications.map((n) => {
            const Icon = icons[n.type] || Bell;
            return (
              <div key={n.id} className={`d-flex gap-3 p-3 border-bottom ${n.is_read ? "" : "bg-primary-subtle"}`}>
                <div className="rounded p-2 bg-white shadow-sm h-100"><Icon size={20} /></div>
                <div className="flex-grow-1">
                  <div className="fw-semibold">{n.title}</div>
                  <div className="small text-muted">{n.message}</div>
                  <div className="small text-secondary">{formatDateTime(n.created_at)}</div>
                </div>
                <Button
                  variant="link"
                  className="text-danger"
                  onClick={async () => {
                    await api(`/notifications/${n.id}`, { method: "DELETE" });
                    load();
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          })}
        </Card.Body>
      </Card>
      <Card className="stat-card">
        <Card.Body>
          <h2 className="h6">Activity Logs</h2>
          <Table responsive>
            <thead>
              <tr><th>User</th><th>Action</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              {data.activity.map((log) => (
                <tr key={log.id}>
                  <td>{log.user_name}</td>
                  <td>{log.action}</td>
                  <td>{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
