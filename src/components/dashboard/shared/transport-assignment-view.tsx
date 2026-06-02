import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Assignment = {
  stopName: string;
  route: {
    name: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
    stops: { name: string; pickupTime: string }[];
  };
};

type TransportViewProps = {
  title: string;
  assignment: Assignment | null;
};

export function TransportAssignmentView({ title, assignment }: TransportViewProps) {
  if (!assignment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transport assignment.</p>
        </CardContent>
      </Card>
    );
  }

  const { route } = assignment;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {route.name} · {route.vehicleNumber}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Your stop</p>
          <p className="text-muted-foreground">
            {assignment.stopName} —{" "}
            {route.stops.find((s) => s.name === assignment.stopName)?.pickupTime ?? "—"}
          </p>
          <p className="mt-3 text-sm font-medium">Driver</p>
          <p className="text-muted-foreground">
            {route.driverName} · {route.driverPhone}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Route stops</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {route.stops.map((s) => (
              <li key={s.name}>
                {s.pickupTime} — {s.name}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
