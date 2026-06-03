"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { assignStudentToRoute, createTransportRoute } from "@/actions/transport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Route = {
  id: string;
  name: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  stops: { name: string; pickupTime: string }[];
  assignments: Array<{
    stopName: string;
    student: { user: { name: string }; class: { name: string } };
  }>;
};

type TransportManagerProps = {
  schoolId: string;
  routes: Route[];
  students: { id: string; name: string; className: string }[];
};

export function TransportManager({ schoolId, routes, students }: TransportManagerProps) {
  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [stopName, setStopName] = useState("");
  const [stopTime, setStopTime] = useState("07:30");
  const [stops, setStops] = useState<{ name: string; pickupTime: string }[]>([]);
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [assignStop, setAssignStop] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedRoute = routes.find((r) => r.id === routeId);

  function addStop() {
    if (!stopName.trim()) return;
    setStops((prev) => [...prev, { name: stopName.trim(), pickupTime: stopTime }]);
    setStopName("");
  }

  function handleCreateRoute(e: React.FormEvent) {
    e.preventDefault();
    if (stops.length === 0) {
      toast.error("Add at least one stop");
      return;
    }
    startTransition(async () => {
      const result = await createTransportRoute({
        schoolId,
        name,
        vehicleNumber,
        driverName,
        driverPhone,
        stops,
      });
      if (result.success) {
        toast.success("Route created");
        setName("");
        setStops([]);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleAssign() {
    if (!routeId || !assignStop || !studentId) return;
    startTransition(async () => {
      const result = await assignStudentToRoute({ routeId, stopName: assignStop, studentId });
      if (result.success) toast.success("Student assigned");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Create route</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRoute} className="space-y-4">
            <div className="space-y-2">
              <Label>Route name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Driver phone</Label>
                <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Driver name</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Stop name"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
                className="w-full sm:w-32"
              />
              <Button type="button" variant="outline" onClick={addStop} className="w-full sm:w-auto">
                Add stop
              </Button>
            </div>
            {stops.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-border/60 p-3 text-sm text-muted-foreground">
                {stops.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{s.name} — {s.pickupTime}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button type="submit" disabled={isPending}>Create route</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Assign student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Route</Label>
            <Select value={routeId} onValueChange={(v) => { if (v) { setRouteId(v); setAssignStop(""); } }}>
              <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedRoute && (
            <div className="space-y-2">
              <Label>Pickup stop</Label>
              <Select value={assignStop} onValueChange={(v) => v && setAssignStop(v)}>
                <SelectTrigger><SelectValue placeholder="Select stop" /></SelectTrigger>
                <SelectContent>
                  {selectedRoute.stops.map((s) => (
                    <SelectItem key={s.name} value={s.name}>{s.name} ({s.pickupTime})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={(v) => v && setStudentId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={isPending || !routeId}>Assign</Button>
        </CardContent>
      </Card>

      {routes.map((route) => (
        <Card key={route.id} className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">{route.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {route.vehicleNumber} · {route.driverName} · {route.driverPhone}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">Stops</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {route.stops.map((s) => (
                  <li key={s.name}>{s.pickupTime} — {s.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Students ({route.assignments.length})</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {route.assignments.map((a, i) => (
                  <li key={i}>
                    {a.student.user.name} · {a.stopName}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
