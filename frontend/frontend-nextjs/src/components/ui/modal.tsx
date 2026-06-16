/**
 * Modal Component
 * 
 * A reusable modal component with backdrop blur effect, close button,
 * and full accessibility support (ARIA labels, keyboard navigation).
 * 
 * @example
 * // Basic usage
 * <Modal isOpen={isOpen} onClose={handleClose}>
 *   <h2>Modal Title</h2>
 *   <p>Modal content goes here</p>
 * </Modal>
 * 
 * // With custom className
 * <Modal isOpen={isOpen} onClose={handleClose} className="custom-modal">
 *   <p>Custom styled modal</p>
 * </Modal>
 */

import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

/**
 * Modal component with accessibility features
 * 
 * @param isOpen - Controls whether the modal is visible
 * @param onClose - Callback function when modal is closed
 * @param children - The content to display in the modal
 * @param className - Additional CSS classes to apply
 * @param title - Optional title for the modal (used for ARIA)
 * 
 * @returns React component
 */
export function Modal({ isOpen, onClose, children, className = '', title }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation (Escape key to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      if (document.body) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown);
        if (document.body) {
          document.body.style.overflow = 'auto';
        }
      }
    };
  }, [isOpen, onClose]);

  // Focus modal content when opened
  useEffect(() => {
    if (isOpen && modalRef.current && typeof document !== 'undefined') {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-bg-primary/80 backdrop-blur-[10px] p-4 md:inset-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-[90%] max-w-[500px] rounded-lg bg-bg-secondary border border-border-default p-12 shadow-xl outline-none animate-in fade-in zoom-in-95 duration-200 ${className}`}
        role="document"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-12 top-12 text-text-tertiary hover:text-text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-mint focus:ring-offset-2 focus:ring-offset-bg-secondary rounded-full p-1"
          aria-label="Close modal"
        >
          <span className="text-2xl font-bold">&times;</span>
        </button>
        
        {title && (
          <h2 id="modal-title" className="mb-6 text-xl font-semibold text-text-primary">
            {title}
          </h2>
        )}
        
        <div className="text-text-secondary">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
