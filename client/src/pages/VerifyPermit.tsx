import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Alert, Card, Spinner } from "react-bootstrap";
import { QRCodeSVG } from "qrcode.react";
import { StatusBadge } from "../components/StatusBadge";
import { formatDate } from "../api";

type Permit = {
  permit_number: string;
  status: string;
  permit_type: string;
  boat_type: string;
  fishing_method: string;
  issue_date: string;
  expiry_date: string;
  name: string;
  barangay: string;
  public_id: string;
};

export function VerifyPermit() {
  const { number } = useParams();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/permits/${number}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Not found");
        setPermit(data);
      })
      .catch((err) => setError(err.message));
  }, [number]);

  return (
    <div className="login-hero d-flex align-items-center justify-content-center p-3">
      <Card className="shadow border-0" style={{ maxWidth: 560, width: "100%" }}>
        <Card.Body className="p-4">
          <div className="text-center mb-3">
            <img src="/logo.svg" alt="MFARPS" width={72} height={72} />
            <h1 className="h4 mt-2">Permit Verification</h1>
          </div>
          {!permit && !error && (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}
          {permit && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <strong>{permit.permit_number}</strong>
                <StatusBadge value={permit.status} />
              </div>
              <p className="mb-1"><strong>Name:</strong> {permit.name}</p>
              <p className="mb-1"><strong>ID:</strong> {permit.public_id}</p>
              <p className="mb-1"><strong>Barangay:</strong> {permit.barangay}</p>
              <p className="mb-1"><strong>Type:</strong> {permit.permit_type}</p>
              <p className="mb-1"><strong>Boat:</strong> {permit.boat_type}</p>
              <p className="mb-1"><strong>Method:</strong> {permit.fishing_method}</p>
              <p className="mb-1"><strong>Issued:</strong> {formatDate(permit.issue_date)}</p>
              <p className="mb-3"><strong>Expires:</strong> {formatDate(permit.expiry_date)}</p>
              <div className="text-center">
                <QRCodeSVG value={`${window.location.origin}/verify/${permit.permit_number}`} size={120} />
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
