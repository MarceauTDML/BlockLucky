'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';
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
    <section className={cn('card flex flex-col p-5', className)} aria-label={t('Discussion en direct', 'Live Chat')}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-soft text-on-sun">
            <Icon name="chat" size={20} />
          </span>
          <h2 className="text-subtitle font-bold">{t('Discussion en direct', 'Live Chat')}</h2>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
            connected ? 'bg-mint text-green' : 'bg-surface-elevated text-fg-muted'
          )}
        >
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
        className="mb-3 flex max-h-72 min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-[18px] bg-surface-elevated p-3 lg:max-h-none"
      >
        {visibleMessages.length === 0 ? (
          <p className="text-caption text-fg-muted">
            {t('Aucun message pour le moment. Soyez le premier à réagir.', 'No messages yet. Be the first to react.')}
          </p>
        ) : (
          visibleMessages.map((item) => (
            <p key={item.id} className="self-start rounded-[14px] bg-surface px-3 py-2 text-caption shadow-[var(--card-shadow)]">
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
              'rounded-full px-3 py-1.5 text-caption font-semibold transition-colors',
              selectedTag === tag ? 'bg-sun text-on-sun' : 'bg-surface-elevated text-fg-secondary hover:text-fg'
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
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-caption text-fg placeholder:text-fg-muted focus:border-fg focus:outline-none focus:ring-4 focus:ring-sun/30"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-sun px-4 text-caption font-semibold text-on-sun hover:bg-sun-light"
        >
          {t('Envoyer', 'Send')}
          <Icon name="arrowSend" size={16} />
        </button>
      </form>
    </section>
  );
};

export default ChatBox;
