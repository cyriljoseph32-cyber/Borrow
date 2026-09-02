"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import { Alert, Button, Input } from "@/components/ui";
import { dateTime } from "@/lib/format";

type Msg = { id: string; sender_id: string; body: string; created_at: string };

export function Conversation({
  threadId,
  userId,
  initial,
}: {
  threadId: string;
  userId: string;
  initial: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [state, action, pending] = useActionState(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Temps réel : les nouveaux messages arrivent sans rechargement.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as Msg;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (state && "ok" in state && state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div>
      <div className="mb-4 max-h-[55vh] space-y-2 overflow-y-auto rounded-xl border border-navy-100 bg-white p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-navy-400">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-terracotta text-sand" : "bg-navy-50 text-navy-900"
                }`}
              >
                <p className="whitespace-pre-line">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-sand/50" : "text-navy-400"}`}>
                  {dateTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {state && "error" in state && state.error && <Alert tone="error">{state.error}</Alert>}

      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="thread_id" value={threadId} />
        <Input name="body" placeholder="Write a message…" maxLength={4000} required autoComplete="off" />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
