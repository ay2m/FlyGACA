import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  describe('rendering', () => {
    it('renders user message with correct role', () => {
      const { getByTestId } = render(
        <ChatMessage role="user">User message content</ChatMessage>
      );

      const message = getByTestId('chat-message-user');
      expect(message).toBeTruthy();
      expect(message).toHaveAttribute('data-role', 'user');
    });

    it('renders assistant message with correct role', () => {
      const { getByTestId } = render(
        <ChatMessage role="assistant">Assistant message content</ChatMessage>
      );

      const message = getByTestId('chat-message-assistant');
      expect(message).toBeTruthy();
      expect(message).toHaveAttribute('data-role', 'assistant');
    });

    it('displays message content', () => {
      const { getByText } = render(
        <ChatMessage role="user">Test message</ChatMessage>
      );

      expect(getByText('Test message')).toBeTruthy();
    });
  });

  describe('accessibility roles', () => {
    it('sets article role for assistant messages', () => {
      const { container } = render(
        <ChatMessage role="assistant">Content</ChatMessage>
      );

      const message = container.querySelector('[role="article"]');
      expect(message).toBeTruthy();
    });

    it('sets complementary role for user messages', () => {
      const { container } = render(
        <ChatMessage role="user">Content</ChatMessage>
      );

      const message = container.querySelector('[role="complementary"]');
      expect(message).toBeTruthy();
    });
  });

  describe('timestamp', () => {
    it('displays timestamp when provided', () => {
      const { getByText } = render(
        <ChatMessage role="user" timestamp="2:30 PM">
          Message
        </ChatMessage>
      );

      expect(getByText('2:30 PM')).toBeTruthy();
    });

    it('does not render timestamp div when not provided', () => {
      const { container } = render(
        <ChatMessage role="user">Message</ChatMessage>
      );

      const timestamp = container.querySelector('[class*="timestamp"]');
      expect(timestamp?.textContent).toBe('');
    });

    it('displays translated timestamp', () => {
      const { getByText } = render(
        <ChatMessage role="assistant" timestamp="الساعة 2:30 م">
          الرسالة
        </ChatMessage>
      );

      expect(getByText('الساعة 2:30 م')).toBeTruthy();
    });
  });

  describe('loading indicator', () => {
    it('renders typing dots when loading', () => {
      const { getAllByTestId } = render(
        <ChatMessage role="assistant" isLoading={true}>
          Content
        </ChatMessage>
      );

      const dots = getAllByTestId('typing-dot');
      expect(dots).toHaveLength(3);
    });

    it('does not render typing dots when not loading', () => {
      const { queryAllByTestId } = render(
        <ChatMessage role="assistant" isLoading={false}>
          Content
        </ChatMessage>
      );

      const dots = queryAllByTestId('typing-dot');
      expect(dots).toHaveLength(0);
    });

    it('sets aria-live and aria-label on loading div', () => {
      const { container } = render(
        <ChatMessage role="assistant" isLoading={true}>
          Content
        </ChatMessage>
      );

      const loading = container.querySelector('[aria-live="polite"]');
      expect(loading).toBeTruthy();
      expect(loading).toHaveAttribute('aria-label', 'Message streaming');
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { getByTestId } = render(
        <ChatMessage role="user" className="custom-class">
          Message
        </ChatMessage>
      );

      const message = getByTestId('chat-message-user');
      expect(message.className).toContain('custom-class');
    });
  });

  describe('ReactNode children', () => {
    it('renders JSX children', () => {
      const { getByText } = render(
        <ChatMessage role="user">
          <span>Message with <strong>bold</strong> text</span>
        </ChatMessage>
      );

      expect(getByText('Message with')).toBeTruthy();
      expect(getByText('bold')).toBeTruthy();
    });

    it('renders complex nested content', () => {
      const { getByText, container } = render(
        <ChatMessage role="assistant">
          <div>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </div>
        </ChatMessage>
      );

      expect(getByText('First paragraph')).toBeTruthy();
      expect(getByText('Second paragraph')).toBeTruthy();
      expect(container.querySelectorAll('p')).toHaveLength(2);
    });
  });

  describe('semantic structure', () => {
    it('maintains proper semantic hierarchy', () => {
      const { container, getByTestId } = render(
        <ChatMessage role="assistant" isLoading={true} timestamp="2:30 PM">
          <span>Content</span>
        </ChatMessage>
      );

      const wrapper = getByTestId('chat-message-assistant');
      const bubble = wrapper.querySelector('[class*="bubble"]');
      const content = wrapper.querySelector('[class*="content"]');

      expect(wrapper).toBeTruthy();
      expect(bubble).toBeTruthy();
      expect(content).toBeTruthy();
      expect(content?.textContent).toContain('Content');
    });
  });

  describe('both user and assistant', () => {
    it('renders user and assistant messages with different styling', () => {
      const { getByTestId } = render(
        <>
          <ChatMessage role="user">User says something</ChatMessage>
          <ChatMessage role="assistant">Assistant responds</ChatMessage>
        </>
      );

      const userMessage = getByTestId('chat-message-user');
      const assistantMessage = getByTestId('chat-message-assistant');

      expect(userMessage).toHaveAttribute('data-role', 'user');
      expect(assistantMessage).toHaveAttribute('data-role', 'assistant');
      expect(userMessage.className).not.toEqual(assistantMessage.className);
    });
  });

  describe('combined features', () => {
    it('renders all features together', () => {
      const { getByTestId, getByText, getAllByTestId } = render(
        <ChatMessage
          role="assistant"
          timestamp="2:30 PM"
          isLoading={true}
          className="highlighted"
        >
          Streaming response
        </ChatMessage>
      );

      const message = getByTestId('chat-message-assistant');
      expect(message).toHaveAttribute('data-role', 'assistant');
      expect(message.className).toContain('highlighted');

      expect(getByText('Streaming response')).toBeTruthy();
      expect(getByText('2:30 PM')).toBeTruthy();
      expect(getAllByTestId('typing-dot')).toHaveLength(3);
    });
  });
});
