import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { shortDateTime } from '../format';
import type { Message } from '../types';

/** Chat for one booking between the customer, vehicle owner and driver. Refreshes every 10 seconds while open. */
export function MessageThread({ bookingId }: { bookingId: number }) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.get<Message[]>(`/bookings/${bookingId}/messages`).then(setMessages).catch((e: Error) => setError(e.message));
  }, [bookingId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10_000); // simple "polling" instead of a live connection
    return () => clearInterval(timer);
  }, [load]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const m = await api.post<Message>(`/bookings/${bookingId}/messages`, { body: text });
      setMessages([...(messages ?? []), m]);
      setText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="thread">
      <div className="thread-list" ref={listRef}>
        {messages?.length === 0 && <p className="hint center">No messages yet. Say hello.</p>}
        {messages?.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? 'mine' : ''}`}>
            {!m.mine && <strong>{m.senderName} <span className="muted">· {m.senderRole}</span></strong>}
            <p>{m.body}</p>
            <small>{shortDateTime(m.createdAt)}</small>
          </div>
        ))}
      </div>
      <form className="thread-form" onSubmit={send}>
        <input aria-label="Message" maxLength={1000} placeholder="Write a message…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="primary small" disabled={sending || !text.trim()}>Send</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
