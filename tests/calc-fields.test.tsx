import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';

// The shared field primitives every calculator composes. Thin, but they own the
// label/onChange/unit/hint contract the tool pages rely on.

afterEach(cleanup);

describe('<NumberField />', () => {
  it('renders the label, value and optional unit', () => {
    render(<NumberField label="Wind speed" value="15" unit="kt" onChange={() => {}} />);
    expect(screen.getByText('Wind speed')).toBeInTheDocument();
    expect(screen.getByText('kt')).toBeInTheDocument();
    const input = screen.getByDisplayValue('15');
    expect(input).toHaveAttribute('inputMode', 'decimal');
  });

  it('reports edits through onChange', () => {
    const onChange = vi.fn();
    render(<NumberField label="Wind" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '270' } });
    expect(onChange).toHaveBeenCalledWith('270');
  });

  it('omits the unit affix when none is given', () => {
    const { container } = render(<NumberField label="X" value="" onChange={() => {}} />);
    expect(container.querySelectorAll('span')).toHaveLength(2); // label text + inputRow only
  });
});

describe('<TextField />', () => {
  it('defaults to a text input and shows the hint', () => {
    render(
      <TextField label="Email" value="a@b.co" hint="We never share it." onChange={() => {}} />,
    );
    const input = screen.getByDisplayValue('a@b.co');
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByText('We never share it.')).toBeInTheDocument();
  });

  it('honours an explicit type and autoComplete', () => {
    render(
      <TextField
        label="Password"
        value=""
        type="password"
        autoComplete="current-password"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
  });

  it('reports edits through onChange', () => {
    const onChange = vi.fn();
    render(<TextField label="Name" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Adel' } });
    expect(onChange).toHaveBeenCalledWith('Adel');
  });
});

describe('<ResultStat />', () => {
  it('renders a dt/dd pair', () => {
    render(<ResultStat label="Crosswind" value="12 kt" />);
    expect(screen.getByRole('term')).toHaveTextContent('Crosswind');
    expect(screen.getByRole('definition')).toHaveTextContent('12 kt');
  });

  it('renders the sub-text only when supplied', () => {
    const { rerender } = render(<ResultStat label="X" value="1" sub="from the right" />);
    expect(screen.getByText('from the right')).toBeInTheDocument();
    rerender(<ResultStat label="X" value="1" />);
    expect(screen.queryByText('from the right')).not.toBeInTheDocument();
  });
});

describe('grid wrappers', () => {
  it('FieldGrid wraps children in a div', () => {
    const { container } = render(
      <FieldGrid>
        <span>field</span>
      </FieldGrid>,
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(screen.getByText('field')).toBeInTheDocument();
  });

  it('OutputGrid wraps children in a dl', () => {
    const { container } = render(
      <OutputGrid>
        <span>stat</span>
      </OutputGrid>,
    );
    expect(container.firstElementChild?.tagName).toBe('DL');
    expect(screen.getByText('stat')).toBeInTheDocument();
  });
});
