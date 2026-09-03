import type { Meta, StoryObj } from '@storybook/react';
import { GrundingBadge } from '../GrundingBadge';

const meta: Meta<typeof GrundingBadge> = {
  title: 'Chat/GrundingBadge',
  component: GrundingBadge,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Grounded: Story = {
  args: {
    status: 'grounded',
    label: 'Grounded in GACAR §91.155',
  },
};

export const Partial: Story = {
  args: {
    status: 'partial',
    label: 'Partially grounded (some citations incomplete)',
  },
};

export const Refusal: Story = {
  args: {
    status: 'refusal',
    label: 'Cannot be grounded in GACAR',
  },
};
