import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import MaskedValue from '../components/MaskedValue.jsx';
import { dayName, formatDate } from '../utils/format.js';

export default function CrewDetail() {
  const { id } = useParams();
  const [crew, setCrew] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  async function load() {
    const { data } = await api.get(`/api/v1/admin/crew/${id}`);
    setCrew(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (!crew && !error) return <p>Loading…</p>;
  if (!crew) return <div className="error-banner">{error}</div>;

  return (
    <>
      <PageHeader
        title={crew.fullName || 'Unnamed crew'}
        subtitle={crew.phoneNumber}
        actions={
          <>
            {crew.verificationStatus === 'pending' && crew.submittedAt ? (
              <>
                <button type="button" className="btn btn-ok" onClick={() => setDialog('approve')}>
                  Approve
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setDialog('reject')}>
                  Reject
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDialog(crew.isActive ? 'suspend' : 'activate')}
            >
              {crew.isActive ? 'Suspend' : 'Reactivate'}
            </button>
          </>
        }
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {crew.verificationStatus === 'pending' && !crew.submittedAt ? (
        <div className="error-banner" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
          This person started an account but has not finished signup or tapped Submit. They stay out of the
          verification queue until they do.
        </div>
      ) : null}

      <div className="detail-grid">
        <div className="card card-pad">
          <div className="person" style={{ marginBottom: 18 }}>
            {crew.profilePhotoUrl ? <img className="avatar lg" src={mediaUrl(crew.profilePhotoUrl)} alt="" /> : <div className="avatar lg" />}
            <div>
              {crew.verificationStatus === 'pending' && !crew.submittedAt ? (
                <span className="pill pending">Onboarding</span>
              ) : (
                <StatusBadge value={crew.verificationStatus} />
              )}{' '}
              <StatusBadge active={crew.isActive} />
              {crew.isOnline ? <span className="pill approved">Online</span> : null}
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>
                {crew.primaryRole} · {crew.city || 'No city'} · {crew.yearsOfExperience ?? 0} yrs
              </p>
            </div>
          </div>
          <dl className="kv">
            <dt>Email</dt>
            <dd>{crew.email || '—'}</dd>
            <dt>Date of birth</dt>
            <dd>{formatDate(crew.dateOfBirth)}</dd>
            <dt>Gender</dt>
            <dd style={{ textTransform: 'capitalize' }}>{crew.gender || '—'}</dd>
            <dt>Address</dt>
            <dd>{crew.currentAddress || '—'}</dd>
            <dt>Languages</dt>
            <dd>{crew.languages?.join(', ') || '—'}</dd>
            <dt>Skills</dt>
            <dd>{crew.skills?.join(', ') || '—'}</dd>
            <dt>Joined</dt>
            <dd>{formatDate(crew.createdAt)}</dd>
            {crew.rejectionReason ? (
              <>
                <dt>Rejection</dt>
                <dd>{crew.rejectionReason}</dd>
              </>
            ) : null}
          </dl>
        </div>

        <div className="card card-pad">
          <h3>Identity & bank</h3>
          <dl className="kv" style={{ marginTop: 12 }}>
            <dt>Aadhaar</dt>
            <dd>
              <MaskedValue
                label="Aadhaar number"
                masked={crew.identityDocuments?.aadhaarMasked}
                value={crew.identityDocuments?.aadhaarNumber}
              />
            </dd>
            <dt>PAN</dt>
            <dd>
              <MaskedValue
                label="PAN number"
                masked={crew.identityDocuments?.panMasked}
                value={crew.identityDocuments?.panNumber}
              />
            </dd>
            <dt>Account</dt>
            <dd>
              <MaskedValue
                label="bank account number"
                masked={crew.bankDetails?.accountNumberMasked}
                value={crew.bankDetails?.accountNumber}
              />
            </dd>
            <dt>Holder</dt>
            <dd>{crew.bankDetails?.accountHolderName || '—'}</dd>
            <dt>IFSC</dt>
            <dd>{crew.bankDetails?.ifscCode || '—'}</dd>
            <dt>UPI</dt>
            <dd>{crew.bankDetails?.upiId || '—'}</dd>
          </dl>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3>KYC documents</h3>
        <div className="docs" style={{ marginTop: 12 }}>
          {[
            ['Aadhaar front', crew.identityDocuments?.aadhaarFrontUrl],
            ['Aadhaar back', crew.identityDocuments?.aadhaarBackUrl],
            ['PAN card', crew.identityDocuments?.panCardUrl],
          ].map(([label, url]) => (
            <div key={label}>
              <div className="doc-label">{label}</div>
              {url ? (
                <a href={mediaUrl(url)} target="_blank" rel="noreferrer">
                  <img src={mediaUrl(url)} alt={label} />
                </a>
              ) : (
                <div className="empty">Not uploaded</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3>Weekly availability</h3>
        {crew.availability?.length ? (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Available</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {crew.availability.map((d) => (
                  <tr key={d.dayOfWeek}>
                    <td>{dayName(d.dayOfWeek)}</td>
                    <td>{d.isAvailable ? 'Yes' : 'No'}</td>
                    <td>
                      {d.shiftStart || '—'} – {d.shiftEnd || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>No weekly schedule set.</p>
        )}
        {crew.pendingEditRequests > 0 ? (
          <p style={{ marginTop: 12 }}>
            <Link to={`/edit-requests?crewId=${crew.id}&status=pending`}>
              {crew.pendingEditRequests} pending edit request(s)
            </Link>
          </p>
        ) : null}
      </div>

      {dialog === 'approve' ? (
        <ConfirmDialog
          title="Approve this crew member?"
          message="They will be able to accept assignments."
          confirmLabel="Approve"
          onConfirm={() => api.post(`/api/v1/admin/crew/${id}/approve`).then(load)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'reject' ? (
        <ConfirmDialog
          title="Reject this profile?"
          message="The crew member will see your reason and can resubmit."
          confirmLabel="Reject"
          danger
          requireReason
          onConfirm={(reason) => api.post(`/api/v1/admin/crew/${id}/reject`, { reason }).then(load)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === 'suspend' || dialog === 'activate' ? (
        <ConfirmDialog
          title={dialog === 'suspend' ? 'Suspend this account?' : 'Reactivate this account?'}
          message={
            dialog === 'suspend'
              ? 'They will not be able to log in until you reactivate them.'
              : 'They will be able to log in again.'
          }
          confirmLabel={dialog === 'suspend' ? 'Suspend' : 'Reactivate'}
          danger={dialog === 'suspend'}
          onConfirm={() => api.patch(`/api/v1/admin/crew/${id}/active`, { isActive: dialog === 'activate' }).then(load)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
