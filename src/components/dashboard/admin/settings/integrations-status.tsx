import { getIntegrationStatuses } from "@/lib/school/settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrationsStatus() {
  const integrations = getIntegrationStatuses();
  const configuredCount = integrations.filter((item) => item.configured).length;

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-lg">Integrations</CardTitle>
          <Badge variant="secondary">
            {configuredCount}/{integrations.length} configured
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          API keys are managed in server environment variables. Update{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code>{" "}
          and restart the dev server to change them.
        </p>
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{integration.name}</p>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
              <Badge variant={integration.configured ? "default" : "outline"}>
                {integration.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
