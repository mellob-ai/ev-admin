import { useState } from 'react';
import Modal from '../../components/Modal';
import { isValidRecipient, sanitizeMultilineText, sanitizeText } from '../../utils/safety';

const INBOX = [
  {
    id: 1,
    from: 'Arjun Sharma',
    subject: 'Issue with morning ride unlock',
    preview: 'Hi, my e-bike didn\u2019t unlock at North Campus gate this morning\u2026',
    time: '2h ago',
    unread: true,
    body: 'Hi Admin,\n\nMy e-bike (VH-042) did not unlock at the North Campus gate this morning at 8:15 AM. I was charged ₹15 but the ride never started. Could you please look into this and process a refund if needed?\n\nThanks,\nArjun Sharma',
    replies: [],
    archived: false,
  },
  {
    id: 2,
    from: 'Santhosh Naidu',
    subject: 'Bulk subscription renewal for ORR team',
    preview: 'We need to renew subscriptions for 7 members of the Outer Ring Road ops team\u2026',
    time: '5h ago',
    unread: true,
    body: 'Hello,\n\nWe have 7 members in the Outer Ring Road operations team whose monthly subscriptions expire on Apr 10. Could you process a bulk renewal under the Corporate Standard plan? I can share the user IDs if needed.\n\nRegards,\nSanthosh Naidu',
    replies: [],
    archived: false,
  },
  {
    id: 3,
    from: 'Priya Menon',
    subject: 'Request to add new docking station — ITPL',
    preview: 'Our team has surveyed a suitable location near ITPL Main Gate for a new hub\u2026',
    time: 'Yesterday',
    unread: true,
    body: 'Hi Team,\n\nWe\u2019ve done a footfall survey and identified a high-usage corridor near ITPL Main Gate. Proposing a 10-dock station there. Attaching the survey summary separately. Let us know if this can be prioritised for Q2.\n\nBest,\nPriya Menon',
    replies: [],
    archived: false,
  },
  {
    id: 4,
    from: 'Kiran Rao',
    subject: 'Vehicle VH-078 brake issue report',
    preview: 'Rider reported a brake resistance issue on vehicle VH-078 during yesterday\u2019s peak hour\u2026',
    time: '2 days ago',
    unread: false,
    body: 'Hello,\n\nA rider reported that vehicle VH-078 had unusual brake resistance during the 6 PM peak period yesterday. The vehicle completed the trip but the rider flagged it. Recommend scheduling a maintenance check before it\u2019s assigned again.\n\nKiran Rao — Field Operations',
    replies: [{ id: 101, body: 'Thanks Kiran — flagged VH-078 for maintenance. Will update once cleared.', time: '1 day ago' }],
    archived: false,
  },
  {
    id: 5,
    from: 'Divya Krishnan',
    subject: 'Monthly sustainability report — March 2026',
    preview: 'Attached is the March 2026 sustainability impact summary across all MOS zones\u2026',
    time: '3 days ago',
    unread: false,
    body: 'Hi,\n\nPlease find below the March 2026 sustainability highlights:\n\n- Total CO₂ saved: 2,340 kg\n- Total km on clean mobility: 18,450 km\n- Active green riders: 847\n\nFull report will be shared via drive link. Let me know if you need any breakdowns by zone.\n\nDivya Krishnan — Sustainability Lead',
    replies: [],
    archived: false,
  },
  {
    id: 6,
    from: 'Rohan Desai',
    subject: 'Group ride event — weekend approval request',
    preview: 'Hi, the Whitefield Riders group wants to organise a weekend group ride on Apr 12\u2026',
    time: '4 days ago',
    unread: false,
    body: 'Hi Admin,\n\nThe Whitefield Riders community group (32 members) would like to organise a group ride event on Sunday, Apr 12 from 7 AM to 10 AM. Route: Whitefield to Varthur Lake and back. Requesting approval and any operational support needed.\n\nThanks,\nRohan Desai',
    replies: [],
    archived: false,
  },
];

export default function MessagesPage() {
  const [messages, setMessages] = useState(INBOX);
  const [activeId, setActiveId] = useState(INBOX[0]?.id ?? null);
  const [reply, setReply] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeForm, setComposeForm] = useState({ to: '', subject: '', body: '' });
  const visibleMessages = messages.filter((message) => !message.archived);
  const active = visibleMessages.find((message) => message.id === activeId) || visibleMessages[0] || null;

  const openMessage = (message) => {
    setActiveId(message.id);
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, unread: false } : item)));
  };

  const selectFallbackMessage = (messageId) => {
    const nextVisible = visibleMessages.filter((item) => item.id !== messageId);
    setActiveId(nextVisible[0]?.id ?? null);
  };

  const archiveActiveMessage = () => {
    if (!active) return;
    setMessages((current) => current.map((item) => (item.id === active.id ? { ...item, archived: true, unread: false } : item)));
    selectFallbackMessage(active.id);
  };

  const deleteActiveMessage = () => {
    if (!active) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteActiveMessage = () => {
    if (!active) return;
    setMessages((current) => current.filter((item) => item.id !== active.id));
    selectFallbackMessage(active.id);
    setShowDeleteConfirm(false);
  };

  const sendReply = () => {
    const content = sanitizeMultilineText(reply);
    if (!active || !content) return;
    setMessages((current) => current.map((item) => (
      item.id === active.id
        ? { ...item, replies: [...(item.replies || []), { id: `${item.id}-${(item.replies || []).length + 1}`, body: content, time: 'Now' }], unread: false }
        : item
    )));
    setReply('');
  };

  const sendComposedMessage = () => {
    const to = sanitizeText(composeForm.to);
    const subject = sanitizeText(composeForm.subject);
    const body = sanitizeMultilineText(composeForm.body);
    if (!to || !subject || !body) {
      setComposeError('Please fill all fields before sending.');
      return;
    }
    if (!isValidRecipient(to)) {
      setComposeError('Enter a valid recipient email or user ID.');
      return;
    }
    setComposeError('');
    const nextMessage = {
      id: `MSG-${Date.now()}`,
      from: to,
      subject,
      preview: body.slice(0, 56) + (body.length > 56 ? '…' : ''),
      time: 'Now',
      unread: false,
      body,
      replies: [],
      archived: false,
    };
    setMessages((current) => [nextMessage, ...current]);
    setActiveId(nextMessage.id);
    setComposeForm({ to: '', subject: '', body: '' });
    setShowCompose(false);
  };

  return (
    <section className="page active" id="page-messages">
      <div className="page-hero ph-messages">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-comments"></i></div>
          <div className="page-hero-text">
            <h1>Messages</h1>
            <p>Support inbox, user queries, and team communications</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-envelope"></i> {visibleMessages.filter((m) => m.unread).length} Unread</span>
            <span className="page-hero-chip"><i className="fa fa-inbox"></i> {visibleMessages.length} Total</span>
          </div>
          <button className="btn-primary" onClick={() => setShowCompose(true)}><i className="fa fa-pen-to-square"></i> Compose</button>
        </div>
      </div>

      <div className="chat-shell">
        {/* Inbox list */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span className="chat-sidebar-title">Inbox</span>
            <select className="filter-select" style={{ fontSize:'0.7rem', padding:'3px 8px' }}><option>All</option><option>Unread</option></select>
          </div>
          <div className="chat-list">
            {!visibleMessages.length && (
              <div className="empty-state" style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                No inbox messages.
              </div>
            )}
            {visibleMessages.map((m) => (
              <div key={m.id} className={`chat-item${m.unread ? ' unread' : ''}${active?.id === m.id ? ' active' : ''}`} onClick={() => openMessage(m)}>
                <div className="chat-avatar">{m.from.charAt(0)}</div>
                <div className="chat-item-info">
                  <div className="chat-item-name">{m.from} <span className="chat-item-time">{m.time}</span></div>
                  <div className="chat-item-preview">{m.preview}</div>
                </div>
                {m.unread && <span className="unread-badge"></span>}
              </div>
            ))}
          </div>
        </div>

        {/* Message view */}
        <div className="chat-main">
          <div className="chat-topbar">
            <div className="chat-topbar-avatar">{active?.from?.charAt(0) || 'A'}</div>
            <div>
              <div className="chat-topbar-name">{active?.from || 'No message selected'}</div>
              <div className="chat-topbar-sub">{active?.subject || 'Choose a conversation from the inbox'}</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:'6px' }}>
              <button className="act-btn" title="Archive" onClick={archiveActiveMessage} disabled={!active}><i className="fa fa-box-archive"></i></button>
              <button className="act-btn red" title="Delete" onClick={deleteActiveMessage} disabled={!active}><i className="fa fa-trash"></i></button>
            </div>
          </div>
          <div className="chat-messages">
            {active ? <div className="chat-bubble chat-bubble-in">{active.body}</div> : <div className="empty-state" style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-3)' }}>Select a message to view conversation.</div>}
            {(active?.replies || []).map((item) => <div key={item.id} className="chat-bubble chat-bubble-out">{item.body}</div>)}
          </div>
          <div className="chat-compose">
            <textarea
              className="chat-compose-input"
              rows={2}
              placeholder={`Reply to ${active?.from || 'selected user'}…`}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={!active}
            />
            <button className="btn-outline" onClick={() => setReply('')}>Clear</button>
            <button className="btn-primary" onClick={sendReply} disabled={!active || !reply.trim()}><i className="fa fa-paper-plane"></i> Send</button>
          </div>
        </div>
      </div>

      <Modal open={showCompose} title="Compose Message" onClose={() => setShowCompose(false)} size="lg"
        footer={<><button className="btn-outline" onClick={() => setShowCompose(false)}>Discard</button><button className="btn-primary" onClick={sendComposedMessage} disabled={!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.body.trim()}><i className="fa fa-paper-plane"></i> Send</button></>}>
        <div className="form-grid form-grid-single">
          <div className="form-field"><label>To</label><input className="setting-input" placeholder="Recipient email or user ID" value={composeForm.to} onChange={(e) => setComposeForm((current) => ({ ...current, to: e.target.value }))} /></div>
          <div className="form-field"><label>Subject</label><input className="setting-input" placeholder="Message subject…" value={composeForm.subject} onChange={(e) => setComposeForm((current) => ({ ...current, subject: e.target.value }))} /></div>
          <div className="form-field"><label>Message</label><textarea className="setting-input" rows={6} placeholder="Write your message…" value={composeForm.body} onChange={(e) => setComposeForm((current) => ({ ...current, body: e.target.value }))} /></div>
          {composeError && <div className="form-field" style={{ color: '#ef4444', fontSize: '0.78rem' }}>{composeError}</div>}
        </div>
      </Modal>

      <Modal
        open={showDeleteConfirm}
        title="Delete Message"
        onClose={() => setShowDeleteConfirm(false)}
        footer={(
          <>
            <button className="btn-outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button className="btn-outline btn-outline-danger" onClick={confirmDeleteActiveMessage}><i className="fa fa-trash"></i> Delete</button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
          This permanently removes the selected message from inbox.
        </p>
      </Modal>
    </section>
  );
}
