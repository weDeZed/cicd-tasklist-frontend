import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
  it('renders in create mode by default', () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument();
    expect(screen.getByText('Ajouter')).toBeInTheDocument();
  });

  it('renders in edit mode', () => {
    render(<TaskForm onSubmit={vi.fn()} mode="edit" />);
    expect(screen.getByText('Modifier la tâche')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
  });

  it('renders with initial values', () => {
    render(<TaskForm onSubmit={vi.fn()} initialValues={{ title: 'Hello', description: 'World' }} />);
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('World')).toBeInTheDocument();
  });

  it('shows validation error when submitting empty title', async () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument();
  });

  it('clears validation error when typing in title', async () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Titre'), 'Hello');
    expect(screen.queryByText('Le titre est requis')).not.toBeInTheDocument();
  });

  it('calls onSubmit with title and description', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Titre'), 'My Task');
    await userEvent.type(screen.getByLabelText('Description'), 'My Desc');
    await userEvent.click(screen.getByText('Ajouter'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'My Task', description: 'My Desc' });
  });

  it('calls onSubmit without description when empty', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Titre'), 'My Task');
    await userEvent.click(screen.getByText('Ajouter'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'My Task', description: undefined });
  });

  it('resets form after create mode submit', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Titre'), 'My Task');
    await userEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByLabelText('Titre')).toHaveValue('');
  });

  it('does not reset form in edit mode', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} mode="edit" initialValues={{ title: 'Edit me' }} />);
    await userEvent.click(screen.getByText('Modifier'));
    expect(screen.getByLabelText('Titre')).toHaveValue('Edit me');
  });

  it('shows cancel button and calls onCancel', async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('trims whitespace from title', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Titre'), '   ');
    await userEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByText('Le titre est requis')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies input-error class when validation fails', async () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByLabelText('Titre')).toHaveClass('input-error');
  });
});
