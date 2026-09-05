import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessage } from '../ChatMessage';

const meta: Meta<typeof ChatMessage> = {
  title: 'Chat/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'padded',
  },
  args: {
    role: 'assistant',
    timestamp: '2:35 PM',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AssistantMessage: Story = {
  args: {
    role: 'assistant',
    children: 'This is an assistant message explaining something about GACAR regulations.',
  },
};

export const UserMessage: Story = {
  args: {
    role: 'user',
    children: 'What is the minimum runway length for a Cessna 172?',
  },
};

export const AssistantMessageLoading: Story = {
  args: {
    role: 'assistant',
    children: 'Retrieving information from the regulatory corpus...',
    isLoading: true,
  },
};

export const UserMessageNoTimestamp: Story = {
  args: {
    role: 'user',
    children: 'I need clarification on weather minimums.',
    timestamp: undefined,
  },
};
