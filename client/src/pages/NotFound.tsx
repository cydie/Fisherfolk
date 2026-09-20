import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="login-hero d-flex align-items-center justify-content-center p-3">
      <div className="bg-white rounded-4 p-5 text-center" style={{ maxWidth: 480 }}>
        <h1 className="h3">Page not found</h1>
        <p className="text-muted">That address is not part of MFARPS.</p>
        <Link className="btn btn-primary" to="/">Back to dashboard</Link>
      </div>
    </div>
  );
}
