import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import AssignCrewDialog from '../components/AssignCrewDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatDateTime, labelize, money } from '../utils/format.js';

const ACTIONABLE = ['confirmed', 'crew_assigned', 'in_progress'];
const CAN_NO_SHOW = ['assigned', 'confirmed'];
const FILLED = ['assigned', 'confirmed', 'in_progress', 'completed'];

function filledCount(booking, role) {
  return (booking.assignments || []).filter((row) => row.role === role && FILLED.includes(row.status)).length;
}

function shortLabel(role) {
  return role === 'supervisor' ? 'Under powered' : 'Under filled';
}

function taxLine(percent, amount) {
  const value = money(amount);
  if (percent == null || percent === '') return value;
  return `${percent}% · ${value}`;
}

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState(null);
  const [noShowTarget, setNoShowTarget] = useState(null);

  function load() {
    return api
      .get(`/api/v1/admin/bookings/${id}`)
      .then((res) => {
        setBooking(res.data);
        setError('');
      })
      .catch((err) => {
        setError(err.message);
        throw err;
      });
  }

  useEffect(() => {
    load().catch(() => {});
  }, [id]);

  if (!booking && !error) return <p>Loading…</p>;
  if (!booking) return <div className="error-banner">{error}</div>;

  const canAct = ACTIONABLE.includes(booking.status);
  const replacedIds = new Set(
    (booking.assignments || []).map((row) => row.replacesAssignmentId).filter(Boolean)
  );

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
          {(booking.crewRequirements || []).map((r) => {
            const filled = filledCount(booking, r.role);
            const open = Math.max(0, r.countRequired - filled);
            return (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span>
                  {filled}/{r.countRequired} × {r.role} charged {money(r.rate)} each ({money(r.amount)} total)
                  {r.crewAmount != null
                    ? ` · crew ${r.crewSharePercent}% receives ${money(r.crewAmount)} each (${money(r.crewPayout)} total)`
                    : ''}
                  {open > 0 ? (
                    <span className="pill pending" style={{ marginLeft: 8 }}>
                      {shortLabel(r.role)}
                    </span>
                  ) : null}
                </span>
                {canAct && open > 0 ? (
                  <button type="button" className="btn btn-sm" onClick={() => setPicker({ role: r.role })}>
                    Assign crew
                  </button>
                ) : null}
              </li>
            );
          })}
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
                <th />
              </tr>
            </thead>
            <tbody>
              {(booking.assignments || []).length === 0 ? (
                <tr>
                  <td colSpan={12}>No crew assigned yet</td>
                </tr>
              ) : (
                booking.assignments.map((a) => {
                  const required =
                    (booking.crewRequirements || []).find((row) => row.role === a.role)?.countRequired ?? 0;
                  const open = Math.max(0, required - filledCount(booking, a.role));
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/crew/${a.crewId}`}>{a.crew?.fullName || a.crewId}</Link>
                      </td>
                      <td>{a.crew?.phoneNumber || '—'}</td>
                      <td>{a.role}</td>
                      <td>
                        {a.assignmentMethod === 'replacement' ? (
                          <span className="pill replacement">Replacement</span>
                        ) : (
                          labelize(a.assignmentMethod)
                        )}
                        {a.replaces ? (
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
                            for{' '}
                            <Link to={`/crew/${a.replaces.crewId}`}>{a.replaces.fullName || a.replaces.crewId}</Link>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge value={a.status} />
                      </td>
                      <td>{money(a.earningsAmount)}</td>
                      <td>{money(a.performanceBonus)}</td>
                      <td>{formatDateTime(a.shiftStartedAt)}</td>
                      <td>{formatDateTime(a.shiftCompletedAt)}</td>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td>{a.assignedByAdmin?.fullName || a.assignedByAdmin?.email || '—'}</td>
                      <td>
                        {canAct && CAN_NO_SHOW.includes(a.status) ? (
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setNoShowTarget(a)}>
                            Mark no-show
                          </button>
                        ) : null}
                        {canAct && a.status === 'no_show' && !replacedIds.has(a.id) && open > 0 ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setPicker({ role: a.role, replacesAssignmentId: a.id })}
                          >
                            Add replacement
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
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
      {error ? <div className="error-banner">{error}</div> : null}
      {picker ? (
        <AssignCrewDialog
          bookingId={id}
          role={picker.role}
          replacesAssignmentId={picker.replacesAssignmentId}
          onClose={() => setPicker(null)}
          onAssigned={load}
        />
      ) : null}
      {noShowTarget ? (
        <ConfirmDialog
          title="Mark this crew member as a no-show?"
          message={`${noShowTarget.crew?.fullName || 'This person'} keeps the date blocked and no longer fills the ${noShowTarget.role} slot. You can add a replacement afterwards.`}
          confirmLabel="Mark no-show"
          danger
          onConfirm={() =>
            api.post(`/api/v1/admin/bookings/${id}/assignments/${noShowTarget.id}/no-show`).then(load)
          }
          onClose={() => setNoShowTarget(null)}
        />
      ) : null}
    </>
  );
}
