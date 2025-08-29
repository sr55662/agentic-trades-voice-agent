import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const API = (path: string) => `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050'}${path}`;

export default function Home() {
  const [summary, setSummary] = useState<any>({});
  const [trends, setTrends] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  
  const conversion = React.useMemo(() => {
    if (!trends || !trends.length) return 0;
    const calls = trends.reduce((a: number, t: any) => a + (t.calls || 0), 0);
    const bookings = trends.reduce((a: number, t: any) => a + (t.bookings || 0), 0);
    return calls > 0 ? Math.round((bookings / calls) * 100) : 0;
  }, [trends]);

  useEffect(() => {
    (async () => {
      const rt = await axios.get(API('/api/realtime-summary'));
      setSummary(rt.data.summary || {});
      setTrends(rt.data.hourly_trends || []);
      const day = await axios.get(API('/api/jobs/today'));
      setJobs(day.data.jobs || []);
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="h1">Ops Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card"><div className="h2">Calls Today</div><div className="text-3xl font-bold">{summary.calls_today || 0}</div></div>
        <div className="card"><div className="h2">Bookings Today</div><div className="text-3xl font-bold">{summary.bookings_today || 0}</div></div>
        <div className="card"><div className="h2">Jobs Scheduled</div><div className="text-3xl font-bold">{summary.jobs_scheduled_today || 0}</div></div>
        <div className="card"><div className="h2">Avg Job Value</div><div className="text-3xl font-bold">${summary.avg_job_value_today || 0}</div></div>
              <div className="card"><div className="h2">Conversion</div><div className="text-3xl font-bold">{conversion}%</div></div>
      </div>

      <div className="card">
        <div className="h2 mb-2">Hourly Call Trends</div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={trends}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#0ea5e9" />
              <Line type="monotone" dataKey="bookings" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </div>
              <div className="card"><div className="h2">Conversion</div><div className="text-3xl font-bold">{conversion}%</div></div>
      </div>

      <div className="card">
        <div className="h2 mb-2">Today&apos;s Jobs</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr><th className="text-left p-2">Time</th><th className="text-left p-2">Job</th><th className="text-left p-2">Customer</th><th className="text-left p-2">Tech</th><th className="text-right p-2">Estimate</th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-2">{new Date(j.window_start).toLocaleTimeString()}</td>
                  <td className="p-2">{j.svc_type} — {j.status}</td>
                  <td className="p-2">{j.customer_name} ({j.customer_phone})</td>
                  <td className="p-2">{j.technician_name || '-'}</td>
                  <td className="p-2 text-right">{j.estimated_cost ? `$${j.estimated_cost}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
