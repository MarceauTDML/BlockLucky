'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LiveChatMessage } from '@/store/slices/lotterySlice';

const REACTION_TAGS = ['Bravo', 'EtherBay', 'VRF', '10k'];

export const ChatBox: React.FC<{
  messages: LiveChatMessage[];
  onSendMessage: (message: string, reactionTag?: string) => void;
  connected?: boolean;
  className?: string;
}> = ({ messages, onSendMessage, connected, className }) => {
  const { t } = useAppTheme();
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.slice(-30);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text.slice(0, 280), selectedTag);
    setInputText('');
    setSelectedTag(undefined);
  };

  return (
    <section className={cn('card flex flex-col p-4', className)} aria-label={t('Discussion en direct', 'Live Chat')}>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-body font-bold">{t('Discussion en direct', 'Live Chat')}</h2>
        <span className="inline-flex items-center gap-1.5 text-caption text-secondary">
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-success' : 'bg-fg-muted')}
          />
          {connected ? t('En direct', 'Live') : t('Hors ligne', 'Offline')}
        </span>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="mb-3 flex max-h-72 min-h-24 flex-1 flex-col gap-1.5 overflow-y-auto lg:max-h-none"
      >
        {visibleMessages.length === 0 ? (
          <p className="text-caption text-fg-muted">
            {t('Aucun message pour le moment. Soyez le premier à réagir.', 'No messages yet. Be the first to react.')}
          </p>
        ) : (
          visibleMessages.map((item) => (
            <p key={item.id} className="text-caption">
              <span className="font-mono font-bold text-fg-secondary">{item.senderWallet} </span>
              <span className="text-fg">
                {item.emoji ? `[${item.emoji}] ` : ''}
                {item.message}
              </span>
            </p>
          ))
        )}
      </div>

      <div className="mb-2.5 flex flex-wrap gap-1.5" role="group" aria-label={t('Réactions', 'Reactions')}>
        {REACTION_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={selectedTag === tag}
            onClick={() => setSelectedTag(tag === selectedTag ? undefined : tag)}
            className={cn(
              'rounded-sm px-2.5 py-[5px] text-caption font-medium transition-colors',
              selectedTag === tag ? 'bg-primary text-on-primary' : 'bg-surface-elevated text-fg-secondary hover:text-fg'
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <form className="flex gap-2" onSubmit={handleSend}>
        <label htmlFor="chat-input" className="sr-only">
          {t('Votre message', 'Your message')}
        </label>
        <input
          id="chat-input"
          value={inputText}
          maxLength={280}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('Écrire un message...', 'Write a message...')}
          className="min-w-0 flex-1 rounded-md bg-surface-elevated px-3 py-[9px] text-small text-fg placeholder:text-fg-muted focus:outline-none focus-visible:outline-2 focus-visible:outline-secondary"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3.5 text-caption font-medium text-on-primary hover:bg-primary-light"
        >
          {t('Envoyer', 'Send')}
        </button>
      </form>
    </section>
  );
};

export default ChatBox;
