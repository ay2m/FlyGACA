import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spotlightVariants, backdropVariants } from '@/animations/pageTransitions';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

interface RegulatoryOmnibarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string) => void;
}

export function RegulatoryOmnibar({ isOpen, onClose, onSearch }: RegulatoryOmnibarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Regulatory Search Omnibar"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(10, 14, 18, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            variants={spotlightVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '640px',
              margin: '0 1rem',
              backgroundColor: 'var(--surface, #0f1a24)',
              border: '1px solid var(--border-bright, #26384a)',
              borderRadius: '16px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
              overflow: 'hidden',
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', alignItems: 'center', padding: '1rem' }}
            >
              <MagnifyingGlass
                size={20}
                style={{ color: 'var(--teal-bright, #4a9cb8)', marginRight: '0.75rem' }}
              />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search GACAR parts, advisory circulars, terms..."
                aria-label="Search GACAR regulations"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text, #e8edf2)',
                  fontSize: '1rem',
                }}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim, #8a95a1)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default RegulatoryOmnibar;
