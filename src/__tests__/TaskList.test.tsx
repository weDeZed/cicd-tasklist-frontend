import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskList } from '../components/TaskList';

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'Test description',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const defaultProps = {
  tasks: [],
  loading: false,
  error: null,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
};

describe('TaskList', () => {
  it('shows loading spinner when loading', () => {
    render(<TaskList {...defaultProps} loading={true} />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByText('Chargement des tâches...')).toBeInTheDocument();
  });

  it('shows error state when error is set', () => {
    render(<TaskList {...defaultProps} error="Server error" />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText(/Server error/)).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('Aucune tâche')).toBeInTheDocument();
    expect(screen.getByText('Commencez par ajouter votre première tâche !')).toBeInTheDocument();
  });

  it('renders task list when tasks are provided', () => {
    render(<TaskList {...defaultProps} tasks={[mockTask]} />);
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('shows singular task count for 1 task', () => {
    render(<TaskList {...defaultProps} tasks={[mockTask]} />);
    expect(screen.getByText('1 tâche')).toBeInTheDocument();
  });

  it('shows plural task count for multiple tasks', () => {
    const tasks = [mockTask, { ...mockTask, id: 2, title: 'Task 2' }];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    expect(screen.getByText('2 tâches')).toBeInTheDocument();
  });

  it('shows completed count correctly', () => {
    const tasks = [
      mockTask,
      { ...mockTask, id: 2, title: 'Task 2', completed: true },
    ];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    expect(screen.getByText('1 terminée')).toBeInTheDocument();
  });

  it('shows plural for multiple completed tasks', () => {
    const tasks = [
      { ...mockTask, completed: true },
      { ...mockTask, id: 2, title: 'Task 2', completed: true },
    ];
    render(<TaskList {...defaultProps} tasks={tasks} />);
    expect(screen.getByText('2 terminées')).toBeInTheDocument();
  });

  it('shows 0 terminée when no tasks completed', () => {
    render(<TaskList {...defaultProps} tasks={[mockTask]} />);
    expect(screen.getByText('0 terminée')).toBeInTheDocument();
  });
});
