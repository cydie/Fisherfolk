import { useEffect, useState } from "react";
import { Alert, Button } from "react-bootstrap";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!event || hidden) return null;

  return (
    <Alert variant="info" className="d-flex justify-content-between align-items-center no-print mb-3">
      <span>Install MFARPS on this device for faster access, even with a weak connection.</span>
      <div className="d-flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            await event.prompt();
            setEvent(null);
          }}
        >
          <Download size={14} className="me-1" />
          Install app
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setHidden(true)}>
          Not now
        </Button>
      </div>
    </Alert>
  );
}
