import { Card } from '@/lib/ui/Card';

export function StatsCards({ stats }: { stats: { total: number; followup: number; warm: number; clients: number } }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card className="text-center">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div>Total Leads</div>
      </Card>
      <Card className="text-center">
        <div className="text-2xl font-bold">{stats.followup}</div>
        <div>Needs Follow-up</div>
      </Card>
      <Card className="text-center">
        <div className="text-2xl font-bold">{stats.warm}</div>
        <div>Warm Leads</div>
      </Card>
      <Card className="text-center">
        <div className="text-2xl font-bold">{stats.clients}</div>
        <div>Clients</div>
      </Card>
    </div>
  );
}
