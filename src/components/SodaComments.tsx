import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, Send, CornerDownRight } from 'lucide-react';
import { useSodaComments } from '../hooks/useSodaComments';
import type { SodaComment } from '../hooks/useSodaComments';

interface Props {
  sodaId: string;
  stashId: string;
  userId: string;
  displayName: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CommentRowProps {
  comment: SodaComment;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReply: (id: string) => void;
  replyingTo: string | null;
  replyDraft: string;
  onReplyDraftChange: (v: string) => void;
  onReplySubmit: (parentId: string) => void;
  submitting: boolean;
}

function CommentRow({
  comment, currentUserId, onDelete, onReply,
  replyingTo, replyDraft, onReplyDraftChange, onReplySubmit, submitting,
}: CommentRowProps) {
  return (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Comment body */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 group">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="font-sans text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
            {comment.displayName}
          </span>
          <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
            {relativeTime(comment.createdAt)}
          </span>
        </div>
        <p className="font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
          {comment.body}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="font-sans text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {replyingTo === comment.id ? 'Cancel' : 'Reply'}
          </button>
          {comment.userId === currentUserId && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Delete comment"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700">
          <AnimatePresence initial={false}>
            {comment.replies.map((reply) => (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700/50 group"
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="font-sans text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                    {reply.displayName}
                  </span>
                  <span className="font-sans text-[10px] text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
                    {relativeTime(reply.createdAt)}
                  </span>
                </div>
                <p className="font-sans text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                  {reply.body}
                </p>
                {reply.userId === currentUserId && (
                  <button
                    type="button"
                    onClick={() => onDelete(reply.id)}
                    className="mt-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete reply"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Inline reply input */}
      <AnimatePresence>
        {replyingTo === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-gray-100 dark:border-gray-700/50"
          >
            <div className="ml-4 border-l-2 border-gray-400 dark:border-gray-500 flex items-center gap-2 px-4 py-2.5">
              <CornerDownRight size={12} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={replyDraft}
                onChange={(e) => onReplyDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onReplySubmit(comment.id);
                  }
                }}
                placeholder="Write a reply…"
                maxLength={500}
                className="flex-1 bg-transparent text-sm font-sans text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onReplySubmit(comment.id)}
                disabled={!replyDraft.trim() || submitting}
                className="shrink-0 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SodaComments({ sodaId, stashId, userId, displayName }: Props) {
  const { comments, addComment, deleteComment } = useSodaComments(sodaId, stashId);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleReply(id: string) {
    if (replyingTo === id) {
      setReplyingTo(null);
      setReplyDraft('');
    } else {
      setReplyingTo(id);
      setReplyDraft('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    await addComment(userId, displayName, draft);
    setDraft('');
    setSubmitting(false);
  }

  async function handleReplySubmit(parentId: string) {
    if (!replyDraft.trim() || submitting) return;
    setSubmitting(true);
    await addComment(userId, displayName, replyDraft, parentId);
    setReplyDraft('');
    setReplyingTo(null);
    setSubmitting(false);
  }

  return (
    <div className="mb-5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
      <div className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          Correspondence
        </p>
      </div>

      {comments.length === 0 && (
        <p className="px-4 py-3 font-sans text-xs italic text-gray-400 dark:text-gray-500">
          No remarks on file yet.
        </p>
      )}

      <AnimatePresence initial={false}>
        {comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            currentUserId={userId}
            onDelete={deleteComment}
            onReply={toggleReply}
            replyingTo={replyingTo}
            replyDraft={replyDraft}
            onReplyDraftChange={setReplyDraft}
            onReplySubmit={handleReplySubmit}
            submitting={submitting}
          />
        ))}
      </AnimatePresence>

      {/* New top-level comment input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Add a remark…"
          maxLength={500}
          rows={1}
          className="flex-1 bg-transparent resize-none text-sm font-sans text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || submitting}
          className="shrink-0 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
