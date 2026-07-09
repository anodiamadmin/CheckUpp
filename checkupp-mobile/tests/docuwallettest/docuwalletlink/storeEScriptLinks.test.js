import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthWallet from '../../app/(tabs)/wallet';

const mockSubmit = jest.fn();
const mockOpen = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/context/useAuthBootstrap', () => ({
  useGlobalContext: () => ({
    userId: 'user-123',
  }),
}));

jest.mock('@/components/ToastProvider', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/hooks/useDocumentUpload', () => ({
  useDocumentUpload: () => ({
    visible: false,
    uploading: false,
    open: mockOpen,
    close: jest.fn(),
    submit: mockSubmit,
    pickDocument: jest.fn(),
    form: {},
    setForm: jest.fn(),
  }),
}));

jest.mock('@/lib/features/documents/mutations', () => ({
  useDeleteDocumentMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock('@/lib/features/documents/queries', () => ({
  useWalletFiles: () => ({
    loading: false,
    error: null,
    refetch: jest.fn(),
    data: [
      {
        id: '1',
        title: 'My eScript',
        description: 'Blood pressure medicine',
        documentType: 'eScript Link',
        fileType: 'link',
        file: 'https://example.com/escript',
        createdAt: '2026-07-01T10:00:00Z',
      },
    ],
  }),
}));

describe('Store eScript Links', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   */
  it('should allow the user to add an eScript link with a description', () => {

    const { getByLabelText } = render(<HealthWallet />);

    fireEvent.press(getByLabelText('Add New Document'));

    expect(mockOpen).toHaveBeenCalled();

  });

  /**
   * AC-2
   */
  it('should display all saved eScript links and descriptions in the Links tab', () => {

    const { getByText } = render(<HealthWallet />);

    fireEvent.press(getByText('Links'));

    expect(getByText('My eScript')).toBeTruthy();
    expect(getByText('Blood pressure medicine')).toBeTruthy();

  });

  /**
   * AC-3
   */
  it('should display an error message when an eScript link cannot be saved', async () => {

    mockSubmit.mockRejectedValue(
      new Error('Link could not be saved, Try again')
    );

    const { getByLabelText } = render(<HealthWallet />);

    fireEvent.press(getByLabelText('Add New Document'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Link could not be saved, Try again',
        'error'
      );
    });

  });

  /**
   * AC-4
   */
  it('should display the saved link with its name and date', () => {

    const { getByText } = render(<HealthWallet />);

    fireEvent.press(getByText('Links'));

    expect(getByText('My eScript')).toBeTruthy();

    expect(
      getByText(/Document •/)
    ).toBeTruthy();

  });

  /**
   * AC-5
   */
  it('should display View, Delete and Share options for every stored eScript link', () => {

    const { getByTestId, getByText } = render(<HealthWallet />);

    fireEvent.press(getByText('Links'));

    expect(getByTestId('view-document-1')).toBeTruthy();

    expect(getByTestId('delete-document-1')).toBeTruthy();

    expect(getByTestId('share-document-1')).toBeTruthy();

  });

});