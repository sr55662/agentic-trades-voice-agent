import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = (path: string) => `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050'}${path}`;

type CallRow = {
  call_sid: string;
  started_at: string;
  outcome: string;
  booking_created: boolean;
  total_duration_seconds?: number;
  job_id?: string;
  job_number?: string;
  job_value?: number;
  intents_detected?: string;
}

export default function Calls() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [onlyBooked, setOnlyBooked] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await axios.get(API('/api/calls/recent'), { params: { limit: 100 } });
      setCalls(res.data.calls || []);
    })();
  }, []);

  const data = onlyBooked ? calls.filter(c => c.booking_created) : calls;

  const [outcome, setOutcome] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');

  const filtered = data.filter(c => {
    const okBooked = true; // already filtered by onlyBooked
    const okOutcome = (outcome === 'all') || (c.outcome === outcome);
    const okQuery = !query || (c.intents_detected||'').toLowerCase().includes(query.toLowerCase()) || (c.job_number||'').includes(query);
    const t = new Date(c.started_at).getTime();
    const after = dateStart ? t >= new Date(dateStart).getTime() : true;
    const before = dateEnd ? t <= new Date(dateEnd).getTime() : true;
    return okBooked && okOutcome && okQuery && after && before;
  });

  function toCSV(rows: any[]) {
    const header = ['start_time','outcome','booked','job_number','job_value','duration_seconds','intents'];
    const lines = [header.join(',')].concat(rows.map(r => [
      new Date(r.started_at).toISOString(),
      r.outcome || '',
      r.booking_created ? 'yes' : 'no',
      r.job_number || '',
      r.job_value || '',
      r.total_duration_seconds || '',
      (r.intents_detected || '').replace(/,/g,';')
    ].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'calls.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Calls</h1>
      
      <div className="bg-white rounded-2xl shadow p-4 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyBooked} onChange={e => setOnlyBooked(e.target.checked)} />
          <span>Only booked</span>
        </label>
        <label className="flex items-center gap-2">
          <span>Outcome</span>
          <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="booking_created">booking_created</option>
            <option value="information_only">information_only</option>
            <option value="escalated">escalated</option>
            <option value="abandoned">abandoned</option>
            <option value="no_answer">no_answer</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>Search</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="intent, job #" className="border rounded px-2 py-1" />
        </label>
        <label className="flex items-center gap-2">
          <span>Start</span>
          <input type="date" value={dateStart} onChange={e=>setDateStart(e.target.value)} className="border rounded px-2 py-1" />
        </label>
        <label className="flex items-center gap-2">
          <span>End</span>
          <input type="date" value={dateEnd} onChange={e=>setDateEnd(e.target.value)} className="border rounded px-2 py-1" />
        </label>
        <button onClick={()=>toCSV(filtered)} className="bg-blue-500 text-white px-3 py-2 rounded">Export CSV</button>
        <div className="text-sm text-gray-500">Showing {filtered.length} of {calls.length}</div>
      </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyBooked} onChange={e => setOnlyBooked(e.target.checked)} />
          <span>Only booked</span>
        </label>
        <div className="text-sm text-gray-500">Showing {data.length} of {calls.length}</div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left p-2">Start Time</th>
              <th className="text-left p-2">Outcome</th>
              <th className="text-left p-2">Booked?</th>
              <th className="text-left p-2">Job #</th>
              <th className="text-right p-2">Value</th>
              <th className="text-right p-2">Duration</th>
              <th className="text-left p-2">Intents</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.call_sid} className="border-t">
                <td className="p-2">{new Date(c.started_at).toLocaleString()}</td>
                <td className="p-2">{c.outcome || '-'}</td>
                <td className="p-2">
                  <span className={"inline-flex items-center gap-2 px-2 py-1 rounded-full " + (c.booking_created ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>
                    <span className={"w-2 h-2 rounded-full " + (c.booking_created ? "bg-green-600" : "bg-gray-400")} />
                    {c.booking_created ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-2">{c.job_number || '-'}</td>
                <td className="p-2 text-right">{c.job_value ? `$${c.job_value}` : '-'}</td>
                <td className="p-2 text-right">{c.total_duration_seconds ? `${Math.round(c.total_duration_seconds/60)}m ${c.total_duration_seconds%60}s` : '-'}</td>
                <td className="p-2">{c.intents_detected || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
