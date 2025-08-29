import React, { useState } from 'react';
import axios from 'axios';

const API = (path: string) => `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050'}${path}`;

export default function Reports() {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [data, setData] = useState<any[]>([]);

  const run = async () => {
    const res = await axios.get(API('/api/reports/revenue'), { params: { start_date: start, end_date: end, grouping: 'daily' }});
    setData(res.data.revenue_report || []);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="h1">Reports</h1>
      <div className="card flex gap-3 items-end">
        <div><label>Start</label><input className="border p-2 rounded ml-2" value={start} onChange={e=>setStart(e.target.value)} placeholder="2025-08-01"/></div>
        <div><label>End</label><input className="border p-2 rounded ml-2" value={end} onChange={e=>setEnd(e.target.value)} placeholder="2025-08-31"/></div>
        <button onClick={run} className="bg-blue-500 text-white px-4 py-2 rounded">Run</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr><th className="text-left p-2">Period</th><th className="text-left p-2">Jobs</th><th className="text-left p-2">Completed</th><th className="text-right p-2">Est. Revenue</th><th className="text-right p-2">Actual Revenue</th><th className="text-right p-2">Deposits</th></tr></thead>
          <tbody>
            {data.map((r:any, idx:number) => (
              <tr className="border-t" key={idx}>
                <td className="p-2">{new Date(r.period).toLocaleDateString()}</td>
                <td className="p-2">{r.total_jobs}</td>
                <td className="p-2">{r.completed_jobs}</td>
                <td className="p-2 text-right">${r.estimated_revenue || 0}</td>
                <td className="p-2 text-right">${r.actual_revenue || 0}</td>
                <td className="p-2 text-right">${r.deposits_collected || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
