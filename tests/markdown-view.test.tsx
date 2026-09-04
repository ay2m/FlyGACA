import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownView } from '@/components/Chat/MarkdownView';

describe('MarkdownView', () => {
  describe('headings', () => {
    it('renders single # as h3 by default', () => {
      render(<MarkdownView># Heading 1</MarkdownView>);
      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      const heading = screen.getByText('Heading 1').closest('h3');
      expect(heading).toBeInTheDocument();
    });

    it('renders ## as h4 by default', () => {
      render(<MarkdownView>## Heading 2</MarkdownView>);
      const heading = screen.getByText('Heading 2').closest('h4');
      expect(heading).toBeInTheDocument();
    });

    it('renders ### as h5 by default', () => {
      render(<MarkdownView>### Heading 3</MarkdownView>);
      const heading = screen.getByText('Heading 3').closest('h5');
      expect(heading).toBeInTheDocument();
    });

    it('respects custom heading level prop', () => {
      render(<MarkdownView headingLevel={2}># Heading</MarkdownView>);
      const heading = screen.getByText('Heading').closest('h2');
      expect(heading).toBeInTheDocument();
    });

    it('respects custom heading level prop with ##', () => {
      render(<MarkdownView headingLevel={2}>## Heading</MarkdownView>);
      const heading = screen.getByText('Heading').closest('h3');
      expect(heading).toBeInTheDocument();
    });

    it('caps heading level at h6', () => {
      render(<MarkdownView headingLevel={4}>### Heading</MarkdownView>);
      const heading = screen.getByText('Heading').closest('h6');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('lists', () => {
    it('renders unordered list with -', () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      const listItems = screen.getAllByText(/Item \d/);
      expect(listItems).toHaveLength(3);
      expect(screen.getByText('Item 1').closest('ul')).toBeInTheDocument();
    });

    it('renders unordered list with *', () => {
      const markdown = `* Item 1
* Item 2`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('Item 1').closest('ul')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('renders ordered list', () => {
      const markdown = `1. First
2. Second
3. Third`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('First').closest('ol')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('handles lists mixed with paragraphs', () => {
      const markdown = `Paragraph before
- Item 1
- Item 2
Paragraph after`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('Paragraph before')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph after')).toBeInTheDocument();
    });
  });

  describe('code blocks', () => {
    it('renders code block', () => {
      const markdown = `\`\`\`
const x = 42;
\`\`\``;
      render(<MarkdownView>{markdown}</MarkdownView>);
      const codeBlock = screen.getByText('const x = 42;').closest('pre');
      expect(codeBlock).toBeInTheDocument();
    });

    it('renders code block with multiple lines', () => {
      const markdown = `\`\`\`
line 1
line 2
line 3
\`\`\``;
      render(<MarkdownView>{markdown}</MarkdownView>);
      const codeBlock = screen.getByText(/line 1/);
      expect(codeBlock.textContent).toContain('line 1');
      expect(codeBlock.textContent).toContain('line 2');
      expect(codeBlock.textContent).toContain('line 3');
    });

    it('handles empty code block', () => {
      const markdown = `\`\`\`
\`\`\``;
      const { container } = render(<MarkdownView>{markdown}</MarkdownView>);
      expect(container.querySelector('pre')).toBeInTheDocument();
    });
  });

  describe('inline formatting', () => {
    it('renders bold text', () => {
      render(<MarkdownView>Text with **bold** content</MarkdownView>);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
    });

    it('renders italic text', () => {
      render(<MarkdownView>Text with *italic* content</MarkdownView>);
      expect(screen.getByText('italic').tagName).toBe('EM');
    });

    it('renders links', () => {
      render(<MarkdownView>Check [this link](https://example.com)</MarkdownView>);
      const link = screen.getByTestId('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders inline code', () => {
      render(<MarkdownView>Use \`const x = 1\` in your code</MarkdownView>);
      expect(screen.getByTestId('inline-code')).toHaveTextContent('const x = 1');
    });

    it('renders GACAR citations', () => {
      render(<MarkdownView>See §91.155 for details</MarkdownView>);
      const citation = screen.getByTestId('citation');
      expect(citation).toHaveTextContent('§91.155');
      expect(citation).toHaveAttribute('role', 'doc-biblioref');
    });

    it('renders multiple citations', () => {
      render(<MarkdownView>§91.155 and §91.156 apply</MarkdownView>);
      const citations = screen.getAllByTestId('citation');
      expect(citations).toHaveLength(2);
    });

    it('handles multiple bold texts', () => {
      render(<MarkdownView>**Bold1** and **Bold2**</MarkdownView>);
      const strongs = screen.getAllByText(/Bold\d/);
      expect(strongs).toHaveLength(2);
      expect(strongs[0].tagName).toBe('STRONG');
      expect(strongs[1].tagName).toBe('STRONG');
    });

    it('handles bold and italic together', () => {
      render(<MarkdownView>Text with **bold** and *italic*</MarkdownView>);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('italic').tagName).toBe('EM');
    });

    it('handles multiple formatting in one line', () => {
      render(<MarkdownView>Text with **bold** and *italic* and `code` and [link](http://example.com) and §91.155</MarkdownView>);
      expect(screen.getByTestId('inline-code')).toBeInTheDocument();
      expect(screen.getByTestId('link')).toBeInTheDocument();
      expect(screen.getByTestId('citation')).toBeInTheDocument();
      // Verify the text contains all elements
      expect(screen.getByText(/Text with/)).toBeInTheDocument();
    });
  });

  describe('paragraphs', () => {
    it('renders simple paragraph', () => {
      render(<MarkdownView>This is a paragraph</MarkdownView>);
      expect(screen.getByText('This is a paragraph').closest('p')).toBeInTheDocument();
    });

    it('renders multiple paragraphs', () => {
      const markdown = `First paragraph
Second paragraph
Third paragraph`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      const paragraphs = screen.getAllByText(/paragraph/);
      expect(paragraphs).toHaveLength(3);
    });

    it('skips empty lines between paragraphs', () => {
      const markdown = `First paragraph

Second paragraph`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  describe('mixed content', () => {
    it('renders complex markdown', () => {
      const markdown = `# Main Heading
## Subheading

This is a paragraph with **bold** text and *italic* text.

- List item 1
- List item 2

See §91.155 for rules.

\`\`\`
const example = true;
\`\`\`

[Learn more](http://example.com)`;
      const { container } = render(<MarkdownView>{markdown}</MarkdownView>);

      expect(screen.getByText('Main Heading').closest('h3')).toBeInTheDocument();
      expect(screen.getByText('Subheading').closest('h4')).toBeInTheDocument();
      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('italic').tagName).toBe('EM');
      expect(screen.getByText('List item 1').closest('ul')).toBeInTheDocument();
      expect(screen.getByTestId('citation')).toBeInTheDocument();
      expect(container.querySelector('pre')).toBeInTheDocument();
      expect(screen.getByTestId('link')).toHaveAttribute('href', 'http://example.com');
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <MarkdownView className="custom-class">Test</MarkdownView>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty markdown', () => {
      const { container } = render(<MarkdownView>{''}</MarkdownView>);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('handles markdown with only whitespace', () => {
      const { container } = render(<MarkdownView>{'   '}</MarkdownView>);
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('handles heading with inline formatting', () => {
      render(<MarkdownView># **Bold** Heading</MarkdownView>);
      const heading = screen.getByText('Bold').closest('h3');
      expect(heading).toBeInTheDocument();
      expect(screen.getByText('Bold').tagName).toBe('STRONG');
    });

    it('handles list items with inline formatting', () => {
      const markdown = `- Item with **bold**
- Item with *italic*
- Item with \`code\``;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('bold').tagName).toBe('STRONG');
      expect(screen.getByText('italic').tagName).toBe('EM');
      expect(screen.getByTestId('inline-code')).toBeInTheDocument();
    });

    it('handles consecutive headings', () => {
      const markdown = `# Heading 1
## Heading 2
### Heading 3`;
      render(<MarkdownView>{markdown}</MarkdownView>);
      expect(screen.getByText('Heading 1').closest('h3')).toBeInTheDocument();
      expect(screen.getByText('Heading 2').closest('h4')).toBeInTheDocument();
      expect(screen.getByText('Heading 3').closest('h5')).toBeInTheDocument();
    });

    it('handles special characters in text', () => {
      render(<MarkdownView>Text with special chars: &lt; &gt; &amp;</MarkdownView>);
      expect(screen.getByText(/Text with special chars/)).toBeInTheDocument();
    });

    it('renders text without formatting unchanged', () => {
      render(<MarkdownView>Plain text without any formatting</MarkdownView>);
      expect(screen.getByText('Plain text without any formatting')).toBeInTheDocument();
    });
  });
});
