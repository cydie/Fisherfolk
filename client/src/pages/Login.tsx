import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Alert, Button, Card, Form } from "react-bootstrap";
import { Lock, LogIn, Shield, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-hero d-flex align-items-center justify-content-center p-3">
      <Card className="shadow-lg border-0" style={{ maxWidth: 440, width: "100%" }}>
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <img src="/logo.svg" alt="MFARPS" width={88} height={88} className="mb-3" />
            <h1 className="h3 text-primary fw-bold mb-1">MFARPS</h1>
            <p className="text-muted mb-0">Municipal Fisherfolk & Boat Permit System</p>
            <small className="text-secondary">Municipality of Dr. Jose P. Rizal, Palawan</small>
          </div>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>
                <User size={14} className="me-1" />
                Email Address
              </Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                <Lock size={14} className="me-1" />
                Password
              </Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </Form.Group>
            {error && <Alert variant="danger">{error}</Alert>}
            <Button type="submit" className="w-100" disabled={loading}>
              <LogIn size={16} className="me-2" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Form>
          <div className="text-center mt-4 pt-3 border-top">
            <small className="text-muted d-block">
              <Shield size={12} className="me-1" />
              Secure Government System
            </small>
            <small className="text-secondary">© 2026 Municipality of Dr. Jose P. Rizal</small>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
