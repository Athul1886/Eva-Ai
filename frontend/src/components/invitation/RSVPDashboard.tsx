import React, { useState } from 'react';
import Icon from '../common/Icon';
import { RSVPResponse, RSVPSummary } from '../../types/invitation';

interface RSVPDashboardProps {
  rsvps?: RSVPResponse[];
  rsvpSummary?: RSVPSummary;
  totalInvitedGuests?: number;
  isLoading?: boolean;
}

const isAttendingResponse = (r: RSVPResponse): boolean => {
  const val = r.attending ?? r.attendance;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    return lower === 'yes' || lower === 'attending';
  }
  return false;
};

export const RSVPDashboard: React.FC<RSVPDashboardProps> = ({
  rsvps = [],
  rsvpSummary,
  totalInvitedGuests = 0,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate summary metrics
  const totalResponses = rsvps.length;
  const attendingList = rsvps.filter((r) => isAttendingResponse(r));
  const notAttendingList = rsvps.filter((r) => !isAttendingResponse(r));

  const attendingCount = attendingList.reduce((acc, curr) => acc + (curr.guestCount || 1), 0);
  const notAttendingCount = notAttendingList.length;
  const pendingCount = Math.max(0, (totalInvitedGuests || 0) - attendingCount - notAttendingCount);

  const summary = rsvpSummary || {
    total: totalResponses,
    attending: attendingCount,
    notAttending: notAttendingCount,
    pending: pendingCount,
  };

  const filteredRsvps = rsvps.filter((r) => {
    const name = r.guestName || r.name || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const isAtt = isAttendingResponse(r);
    if (filter === 'YES') return isAtt;
    if (filter === 'NO') return !isAtt;
    return true;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-6 sm:p-8 border border-surface-container-highest/60 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container-highest/50">
        <div>
          <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs">
            RSVP Intelligence
          </span>
          <h3 className="font-headline-sm text-xl text-on-surface font-semibold mt-0.5">
            Guest Response Tracker
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
            {rsvps.length} {rsvps.length === 1 ? 'Response' : 'Responses'} Received
          </span>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Responses */}
        <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50 space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant text-xs">
            <span className="uppercase tracking-wider font-semibold">Total Responses</span>
            <Icon name="groups" className="text-primary text-[18px]" />
          </div>
          <div className="text-2xl font-bold text-on-surface">{summary.total}</div>
          <span className="text-[11px] text-on-surface-variant block">Submissions</span>
        </div>

        {/* Attending */}
        <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="uppercase tracking-wider font-semibold">Attending</span>
            <Icon name="check_circle" className="text-emerald-400 text-[18px]" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{summary.attending}</div>
          <span className="text-[11px] text-on-surface-variant block">Confirmed Guests</span>
        </div>

        {/* Not Attending */}
        <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50 space-y-1">
          <div className="flex items-center justify-between text-on-surface-variant text-xs">
            <span className="uppercase tracking-wider font-semibold">Not Attending</span>
            <Icon name="cancel" className="text-on-surface-variant text-[18px]" />
          </div>
          <div className="text-2xl font-bold text-on-surface-variant">{summary.notAttending}</div>
          <span className="text-[11px] text-on-surface-variant block">Declined</span>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50 space-y-1">
          <div className="flex items-center justify-between text-primary text-xs">
            <span className="uppercase tracking-wider font-semibold">Pending</span>
            <Icon name="hourglass_top" className="text-primary text-[18px]" />
          </div>
          <div className="text-2xl font-bold text-primary">{summary.pending}</div>
          <span className="text-[11px] text-on-surface-variant block">Awaiting Response</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All ({rsvps.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('YES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'YES'
                ? 'bg-emerald-500 text-white font-bold'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Attending ({attendingList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('NO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'NO'
                ? 'bg-surface-bright text-on-surface font-bold'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Declined ({notAttendingList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest name..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface-container border border-surface-container-highest text-xs text-on-surface placeholder:text-outline outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Guest RSVP Table / List */}
      <div className="overflow-x-auto rounded-2xl border border-surface-container-highest/60 bg-surface-container-low/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-container-high/80 text-on-surface-variant font-bold uppercase tracking-wider border-b border-surface-container-highest/60">
            <tr>
              <th className="py-3 px-4">Guest Name</th>
              <th className="py-3 px-4">Attendance</th>
              <th className="py-3 px-4">Guest Count</th>
              <th className="py-3 px-4">Response Date</th>
              <th className="py-3 px-4">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-highest/40">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredRsvps.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant italic">
                  {rsvps.length === 0
                    ? 'No RSVPs recorded yet. Share your invitation link or QR code with guests!'
                    : 'No matching RSVP records found.'}
                </td>
              </tr>
            ) : (
              filteredRsvps.map((rsvp, idx) => {
                const isAtt = isAttendingResponse(rsvp);

                return (
                  <tr
                    key={rsvp.id || `rsvp-${idx}`}
                    className="hover:bg-surface-container/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-on-surface">
                      {rsvp.guestName || rsvp.name || 'Anonymous Guest'}
                    </td>
                    <td className="py-3 px-4">
                      {isAtt ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                          <Icon name="check" className="text-[12px]" />
                          <span>Attending</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container border border-surface-container-highest text-on-surface-variant font-medium text-[11px]">
                          <Icon name="close" className="text-[12px]" />
                          <span>Not Attending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface">
                      {isAtt ? rsvp.guestCount || 1 : '-'}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">
                      {formatDate(rsvp.responseDate || rsvp.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-xs truncate italic">
                      {rsvp.notes || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RSVPDashboard;
