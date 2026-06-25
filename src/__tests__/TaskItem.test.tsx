import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TaskItem } from '../components/TaskItem';

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'Test description',
  completed: false,
  createdAt: '2024-01-15T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
};

const defaultProps = {
  task: mockTask,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
};

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task title and description', () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByText(/15 janvier 2024/i)).toBeInTheDocument();
  });

  it('does not render description if null', () => {
    render(<TaskItem {...defaultProps} task={{ ...mockTask, description: null }} />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('applies task-completed class when completed', () => {
    render(<TaskItem {...defaultProps} task={{ ...mockTask, completed: true }} />);
    expect(screen.getByTestId('task-item')).toHaveClass('task-completed');
  });

  it('calls onToggle when checkbox is clicked', () => {
    render(<TaskItem {...defaultProps} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(defaultProps.onToggle).toHaveBeenCalledWith(1);
  });

  it('checkbox reflects completed state', () => {
    render(<TaskItem {...defaultProps} task={{ ...mockTask, completed: true }} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  describe('delete behavior', () => {
    it('shows warning on first delete click', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Supprimer'));
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(defaultProps.onDelete).not.toHaveBeenCalled();
    });

    it('calls onDelete on second click', () => {
      render(<TaskItem {...defaultProps} />);
      const deleteBtn = screen.getByTitle('Supprimer');
      fireEvent.click(deleteBtn);
      fireEvent.click(deleteBtn);
      expect(defaultProps.onDelete).toHaveBeenCalledWith(1);
    });

    it('resets confirm state after 3 seconds', () => {
      vi.useFakeTimers();
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Supprimer'));
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('edit behavior', () => {
    it('shows edit form on edit button click', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));
      expect(screen.getByPlaceholderText('Titre de la tâche')).toBeInTheDocument();
      expect(screen.getByText('Enregistrer')).toBeInTheDocument();
      expect(screen.getByText('Annuler')).toBeInTheDocument();
    });

    it('edit form is pre-filled with current values', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('calls onEdit with updated values', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));

      const titleInput = screen.getByPlaceholderText('Titre de la tâche');
      fireEvent.change(titleInput, { target: { value: 'Updated Task' } });
      fireEvent.click(screen.getByText('Enregistrer'));

      expect(defaultProps.onEdit).toHaveBeenCalledWith(1, {
        title: 'Updated Task',
        description: 'Test description',
      });
    });

    it('does not call onEdit if title is empty', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));

      const titleInput = screen.getByPlaceholderText('Titre de la tâche');
      fireEvent.change(titleInput, { target: { value: '' } });
      fireEvent.click(screen.getByText('Enregistrer'));

      expect(defaultProps.onEdit).not.toHaveBeenCalled();
    });

    it('cancel restores original values and hides form', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));

      const titleInput = screen.getByPlaceholderText('Titre de la tâche');
      fireEvent.change(titleInput, { target: { value: 'Changed' } });
      fireEvent.click(screen.getByText('Annuler'));

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.queryByText('Enregistrer')).not.toBeInTheDocument();
    });

    it('sends description as undefined when cleared', () => {
      render(<TaskItem {...defaultProps} />);
      fireEvent.click(screen.getByTitle('Modifier'));

      const descInput = screen.getByPlaceholderText('Description (optionnel)');
      fireEvent.change(descInput, { target: { value: '' } });
      fireEvent.click(screen.getByText('Enregistrer'));

      expect(defaultProps.onEdit).toHaveBeenCalledWith(1, {
        title: 'Test Task',
        description: undefined,
      });
    });
  });

  it('task with null description shows no description paragraph', () => {
    render(<TaskItem {...defaultProps} task={{ ...mockTask, description: null }} />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });
});
