import type { Meta, StoryObj } from '@storybook/react';
import { MarkdownView } from '../MarkdownView';

const meta: Meta<typeof MarkdownView> = {
  title: 'Chat/MarkdownView',
  component: MarkdownView,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BasicMarkdown: Story = {
  args: {
    children: `# Runway Calculations

A runway must meet minimum requirements based on aircraft type and conditions.

- **Dry conditions**: Use POH landing distance
- **Wet conditions**: Multiply POH by 1.67
- **Soft field**: Multiply wet by additional factor

## Wind Effects

[Read §91.5 for guidance](https://gaca.gov.sa/regulations/91/5)

Wind components affect available runway length.`,
  },
};

export const WithCodeBlock: Story = {
  args: {
    children: `# Fuel Calculation

Use this formula for range planning:

\`\`\`javascript
const range = (totalFuel - reserveFuel) / burnRate;
\`\`\`

Always carry minimum reserve per regulations.`,
  },
};

export const WithLists: Story = {
  args: {
    children: `# Pre-flight Checklist

1. Check weather
2. File flight plan
3. Review NOTAMs
4. Inspect aircraft

Key items:
- Fuel quantity and quality
- Oil temperature
- Flight controls free`,
  },
};

export const WithInlineFormatting: Story = {
  args: {
    children: `Minimum *visibility* is **3 statute miles** for VFR flight.
Use \`npm run lint\` to check code quality.
[GACAR regulations](https://gaca.gov.sa) apply.`,
  },
};
