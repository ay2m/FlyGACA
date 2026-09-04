import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  describe('GACAR citations', () => {
    it('renders GACAR section citations with proper accessibility', () => {
      const { container } = render(
        <MarkdownView>
          {"GACAR section §91.155 defines airspace requirements."}
        </MarkdownView>
      );

      const citation = container.querySelector('[role="doc-biblioref"]');
      expect(citation).toBeTruthy();
      expect(citation?.getAttribute('aria-label')).toBe('GACAR section §91.155');
      expect(citation?.getAttribute('dir')).toBe('auto');
      expect(citation?.textContent).toBe('§91.155');
    });

    it('renders multiple citations', () => {
      const { container } = render(
        <MarkdownView>
          {"See §91.155 and §121.300 for details."}
        </MarkdownView>
      );

      const citations = container.querySelectorAll('[role="doc-biblioref"]');
      expect(citations).toHaveLength(2);
      expect(citations[0]?.textContent).toBe('§91.155');
      expect(citations[1]?.textContent).toBe('§121.300');
    });

    it('applies citation class for styling', () => {
      const { getByText } = render(
        <MarkdownView>
          {"Reference §91.155"}
        </MarkdownView>
      );

      const citation = getByText('§91.155').closest('[role="doc-biblioref"]');
      expect(citation?.className).toContain('citation');
    });
  });

  describe('bold text', () => {
    it('renders bold text with strong tag', () => {
      const { getByText } = render(
        <MarkdownView>
          {"This is **bold** text."}
        </MarkdownView>
      );

      const bold = getByText('bold');
      expect(bold.tagName).toBe('STRONG');
    });
  });

  describe('italic text', () => {
    it('renders italic text with em tag', () => {
      const { getByText } = render(
        <MarkdownView>
          {"This is *italic* text."}
        </MarkdownView>
      );

      const italic = getByText('italic');
      expect(italic.tagName).toBe('EM');
    });
  });

  describe('links', () => {
    it('renders links with proper attributes', () => {
      const { getByRole } = render(
        <MarkdownView>
          {"Visit [GACA](https://gaca.gov.sa)"}
        </MarkdownView>
      );

      const link = getByRole('link');
      expect(link).toHaveAttribute('href', 'https://gaca.gov.sa');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.textContent).toBe('GACA');
    });

    it('applies link class for styling', () => {
      const { getByRole } = render(
        <MarkdownView>
          {"[Link](https://example.com)"}
        </MarkdownView>
      );

      const link = getByRole('link');
      expect(link.className).toContain('link');
    });
  });

  describe('inline code', () => {
    it('renders inline code with code tag', () => {
      const { getByText } = render(
        <MarkdownView>
          {"Use `const x = 1` in code."}
        </MarkdownView>
      );

      const code = getByText('const x = 1');
      expect(code.tagName).toBe('CODE');
      expect(code.className).toContain('inlineCode');
    });
  });

  describe('code blocks', () => {
    it('renders code blocks', () => {
      const { container } = render(
        <MarkdownView>
          {`\`\`\`js\nconst x = 1;\n\`\`\``}
        </MarkdownView>
      );

      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();
      expect(pre?.className).toContain('codeBlock');
      expect(pre?.textContent).toContain('const x = 1;');
    });
  });

  describe('headings', () => {
    it('renders headings at specified level', () => {
      const { container } = render(
        <MarkdownView headingLevel={3}>
          {"# Main Title"}
        </MarkdownView>
      );

      const h3 = container.querySelector('h3');
      expect(h3).toBeTruthy();
      expect(h3?.textContent).toBe('Main Title');
    });

    it('increments heading level based on markdown depth', () => {
      const { container } = render(
        <MarkdownView headingLevel={3}>
          {"# Level 1\n## Level 2"}
        </MarkdownView>
      );

      const h3 = container.querySelector('h3');
      const h4 = container.querySelector('h4');
      expect(h3?.textContent).toBe('Level 1');
      expect(h4?.textContent).toBe('Level 2');
    });

    it('applies heading class for styling', () => {
      const { getByText } = render(
        <MarkdownView>
          {"# Heading"}
        </MarkdownView>
      );

      const heading = getByText('Heading');
      expect(heading.className).toContain('heading');
    });
  });

  describe('lists', () => {
    it('renders unordered lists', () => {
      const { container, getByText } = render(
        <MarkdownView>
          {"- First\n- Second"}
        </MarkdownView>
      );

      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      expect(ul?.className).toContain('list');
      expect(getByText('First')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
    });

    it('renders ordered lists', () => {
      const { container } = render(
        <MarkdownView>
          {"1. First\n2. Second"}
        </MarkdownView>
      );

      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      expect(ol?.className).toContain('list');
      expect(ol?.querySelectorAll('li')).toHaveLength(2);
    });
  });

  describe('paragraphs', () => {
    it('renders text as paragraphs', () => {
      const { container } = render(
        <MarkdownView>
          {"First paragraph\n\nSecond paragraph"}
        </MarkdownView>
      );

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]?.textContent).toContain('First paragraph');
      expect(paragraphs[1]?.textContent).toContain('Second paragraph');
    });

    it('applies paragraph class for styling', () => {
      const { container } = render(
        <MarkdownView>
          {"Some text"}
        </MarkdownView>
      );

      const p = container.querySelector('p');
      expect(p?.className).toContain('paragraph');
    });
  });

  describe('combined formatting', () => {
    it('handles bold and italic together', () => {
      const { getByText } = render(
        <MarkdownView>
          {"Text with **bold** and *italic*."}
        </MarkdownView>
      );

      const bold = getByText('bold');
      const italic = getByText('italic');
      expect(bold.tagName).toBe('STRONG');
      expect(italic.tagName).toBe('EM');
    });

    it('handles citations with other formatting', () => {
      const { container, getByText } = render(
        <MarkdownView>
          {"See **GACAR §91.155** for details."}
        </MarkdownView>
      );

      const bold = getByText('GACAR');
      expect(bold.tagName).toBe('STRONG');

      const citation = container.querySelector('[role="doc-biblioref"]');
      expect(citation?.textContent).toBe('§91.155');
    });
  });

  describe('accessibility', () => {
    it('maintains semantic HTML structure', () => {
      const { container } = render(
        <MarkdownView>
          {"# Heading\n\nParagraph with [link](url) and §91.155"}
        </MarkdownView>
      );

      const root = container.querySelector('[class*="root"]');
      expect(root).toBeTruthy();
      expect(container.querySelector('h3')).toBeTruthy();
      expect(container.querySelector('p')).toBeTruthy();
      expect(container.querySelector('[role="link"]') || container.querySelector('a')).toBeTruthy();
      expect(container.querySelector('[role="doc-biblioref"]')).toBeTruthy();
    });

    it('sets proper direction for bilingual content', () => {
      const { container } = render(
        <MarkdownView>
          {"Bilingual §91.155"}
        </MarkdownView>
      );

      const citation = container.querySelector('[role="doc-biblioref"]');
      expect(citation?.getAttribute('dir')).toBe('auto');
    });
  });

  describe('custom className', () => {
    it('applies custom className to root', () => {
      const { container } = render(
        <MarkdownView className="custom-class">
          {"Text"}
        </MarkdownView>
      );

      const root = container.firstChild;
      expect((root as HTMLElement).className).toContain('custom-class');
    });
  });

  describe('empty content', () => {
    it('renders empty string without error', () => {
      const { container } = render(
        <MarkdownView>{""}</MarkdownView>
      );

      const root = container.firstChild;
      expect(root).toBeTruthy();
    });
  });
});
