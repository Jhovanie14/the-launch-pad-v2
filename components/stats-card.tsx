import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function StatCard({
  title,
  value,
  note,
}: {
  title: string;
  value: any;
  note: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
