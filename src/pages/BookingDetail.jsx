import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatDateTime, money } from '../utils/format.js';

function taxLine(percent, amount) {
  const value = money(amount);
  if (percent == null || percent === '') return value;
  return `${percent}% · ${value}`;
}

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
            <dt>Food service</dt>
            <dd>{booking.foodServiceType || '—'}</dd>
            <dt>Food items</dt>
            <dd>{booking.foodItemsCount ?? '—'}</dd>
            <dt>Latitude</dt>
            <dd>{booking.venueLatitude ?? '—'}</dd>
            <dt>Longitude</dt>
            <dd>{booking.venueLongitude ?? '—'}</dd>
            <dt>Placed</dt>
            <dd>{formatDateTime(booking.createdAt)}</dd>
            <dt>Confirmed</dt>
            <dd>{formatDateTime(booking.confirmedAt)}</dd>
            <dt>Advance</dt>
            <dd>{booking.advancePaidPct != null ? `${booking.advancePaidPct}%` : '—'}</dd>
            <dt>Subtotal</dt>
            <dd>{money(booking.subtotal)}</dd>
            <dt>CGST</dt>
            <dd>{taxLine(booking.cgstPercent, booking.cgstAmount)}</dd>
            <dt>SGST</dt>
            <dd>{taxLine(booking.sgstPercent, booking.sgstAmount)}</dd>
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
            {booking.status === 'cancelled' ? (
              <>
                <dt>Cancelled</dt>
                <dd>{formatDateTime(booking.cancelledAt)}</dd>
                <dt>Cancellation reason</dt>
                <dd>{booking.cancellationReason || '—'}</dd>
              </>
            ) : null}
          </dl>
        </div>
        <div className="card card-pad">
          <h3>Organizer</h3>
          <div className="person" style={{ marginTop: 16 }}>
            {booking.user?.profilePhotoUrl ? (
              <img className="avatar lg" src={mediaUrl(booking.user.profilePhotoUrl)} alt="" />
            ) : (
              <div className="avatar lg" />
            )}
            <div>
              <p>
                <Link to={`/users/${booking.user?.id}`}>{booking.user?.fullName || 'Unnamed organizer'}</Link>
              </p>
              <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>{booking.user?.phoneNumber || '—'}</p>
              <p style={{ color: 'var(--muted)' }}>{booking.user?.email || '—'}</p>
            </div>
          </div>
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
                <th>Phone</th>
                <th>Role</th>
                <th>Method</th>
                <th>Status</th>
                <th>Earnings</th>
                <th>Bonus</th>
                <th>Shift start</th>
                <th>Shift end</th>
                <th>Assigned</th>
                <th>Assigned by</th>
              </tr>
            </thead>
            <tbody>
              {(booking.assignments || []).map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/crew/${a.crewId}`}>{a.crew?.fullName || a.crewId}</Link>
                  </td>
                  <td>{a.crew?.phoneNumber || '—'}</td>
                  <td>{a.role}</td>
                  <td>{a.assignmentMethod?.replace('_', ' ')}</td>
                  <td>
                    <StatusBadge value={a.status} />
                  </td>
                  <td>{money(a.earningsAmount)}</td>
                  <td>{money(a.performanceBonus)}</td>
                  <td>{formatDateTime(a.shiftStartedAt)}</td>
                  <td>{formatDateTime(a.shiftCompletedAt)}</td>
                  <td>{formatDateTime(a.createdAt)}</td>
                  <td>{a.assignedByAdmin?.fullName || a.assignedByAdmin?.email || '—'}</td>
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
                <th>Razorpay payment id</th>
                <th>Razorpay order id</th>
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
                  <td>{p.paymentGatewayRef || '—'}</td>
                  <td>{p.razorpayOrderId || '—'}</td>
                  <td>{formatDateTime(p.paidAt || p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-pad">
          <h3>Refunds</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Percent</th>
                <th>Days before event</th>
                <th>Status</th>
                <th>Razorpay refund id</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {(booking.refunds || []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No refund recorded</td>
                </tr>
              ) : (
                booking.refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td>{money(refund.refundAmount)}</td>
                    <td>{refund.refundPctApplied != null ? `${refund.refundPctApplied}%` : '—'}</td>
                    <td>{refund.cancellationDaysBeforeEvent ?? '—'}</td>
                    <td>
                      <StatusBadge value={refund.status} />
                    </td>
                    <td>{refund.razorpayRefundId || '—'}</td>
                    <td>{formatDateTime(refund.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
