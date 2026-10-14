import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatDateTime, money } from '../utils/format.js';

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/v1/admin/bookings/${id}`)
      .then((res) => setBooking(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (!booking && !error) return <p>Loading…</p>;
  if (!booking) return <div className="error-banner">{error}</div>;

  return (
    <>
      <PageHeader title={booking.bookingReference} subtitle={`${booking.eventType || 'Event'} · ${formatDate(booking.eventDate)}`} />
      <div className="detail-grid">
        <div className="card card-pad">
          <StatusBadge value={booking.status} />
          <dl className="kv" style={{ marginTop: 16 }}>
            <dt>Venue</dt>
            <dd>
              {booking.venueName || '—'}
              <div style={{ color: 'var(--muted)' }}>{booking.venueAddress}</div>
            </dd>
            <dt>Start</dt>
            <dd>{booking.eventStartTime || '—'}</dd>
            <dt>Duration</dt>
            <dd>{booking.expectedDurationHours ? `${booking.expectedDurationHours}h` : '—'}</dd>
            <dt>Guests</dt>
            <dd>{booking.guestCount ?? '—'}</dd>
            <dt>Subtotal</dt>
            <dd>{money(booking.subtotal)}</dd>
            <dt>GST</dt>
            <dd>{money(booking.gstAmount)}</dd>
            <dt>Discount</dt>
            <dd>{money(booking.discountAmount)}</dd>
            <dt>Coupon</dt>
            <dd>
              {booking.coupon
                ? `${booking.coupon.code} · ${
                    booking.coupon.discountType === 'percentage'
                      ? `${booking.coupon.discountValue}%`
                      : money(booking.coupon.discountValue)
                  }`
                : '—'}
            </dd>
            <dt>Total</dt>
            <dd>{money(booking.estimatedTotal)}</dd>
            <dt>Instructions</dt>
            <dd>{booking.additionalInstructions || '—'}</dd>
          </dl>
        </div>
        <div className="card card-pad">
          <h3>Organizer</h3>
          <p>
            <Link to={`/users/${booking.user?.id}`}>{booking.user?.fullName || booking.user?.phoneNumber}</Link>
          </p>
          <p style={{ color: 'var(--muted)' }}>{booking.user?.email}</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3>Crew requirements</h3>
        <ul>
          {(booking.crewRequirements || []).map((r) => (
            <li key={r.id}>
              {r.countRequired} × {r.role} charged {money(r.rate)} each ({money(r.amount)} total)
              {r.crewAmount != null
                ? ` · crew ${r.crewSharePercent}% receives ${money(r.crewAmount)} each (${money(r.crewPayout)} total)`
                : ''}
            </li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad">
          <h3>Assignments</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Crew</th>
                <th>Role</th>
                <th>Method</th>
                <th>Status</th>
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              {(booking.assignments || []).map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/crew/${a.crewId}`}>{a.crew?.fullName || a.crewId}</Link>
                  </td>
                  <td>{a.role}</td>
                  <td>{a.assignmentMethod?.replace('_', ' ')}</td>
                  <td>
                    <StatusBadge value={a.status} />
                  </td>
                  <td>{money(a.earningsAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad">
          <h3>Payments</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(booking.payments || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.paymentType}</td>
                  <td>{money(p.amount)}</td>
                  <td>
                    <StatusBadge value={p.status} />
                  </td>
                  <td>{formatDateTime(p.paidAt || p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
