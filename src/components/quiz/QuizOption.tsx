import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { quizOptionVariants } from '@/animations/microInteractions';

interface QuizOptionProps {
  children: ReactNode;
  isSelected?: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  index?: number;
}

export function QuizOption({
  children,
  isSelected = false,
  isCorrect,
  isIncorrect,
  disabled = false,
  onClick,
  className = '',
  index,
}: QuizOptionProps) {
  let animateState = 'idle';
  if (isCorrect) animateState = 'correct';
  else if (isIncorrect) animateState = 'incorrect';
  else if (isSelected) animateState = 'selected';

  return (
    <motion.div
      variants={quizOptionVariants}
      initial="idle"
      whileHover={disabled ? undefined : 'hover'}
      animate={animateState}
      onClick={disabled ? undefined : onClick}
      className={className}
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-option-index={index}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      {children}
    </motion.div>
  );
}

export default QuizOption;
