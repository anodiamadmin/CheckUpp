import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HealthWallet from '../../app/(tabs)/wallet';

const mockDelete = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@/context/useAuthBootstrap', () => ({
  useGlobalContext: () => ({
    userId: 'user-123',
  }),
}));

jest.mock('@/components/ToastProvider', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock('@/hooks/useDocumentUpload', () => ({
  useDocumentUpload: () => ({
    visible: false,
    uploading: false,
    open: jest.fn(),
    close: jest.fn(),
    submit: jest.fn(),
    pickDocument: jest.fn(),
    form: {},
    setForm: jest.fn(),
  }),
}));

jest.mock('@/lib/features/documents/queries', () => ({
  useWalletFiles: () => ({
    loading: false,
    error: null,
    refetch: mockRefetch,
    data: [
      {
        id: '1',
        title: 'Blood Report',
        documentType: 'Lab Report',
        fileType: 'pdf',
        file: 'https://example.com/report.pdf',
        createdAt: new Date().toISOString(),
      },
    ],
  }),
}));

jest.mock('@/lib/features/documents/mutations', () => ({
  useDeleteDocumentMutation: () => ({
    mutateAsync: mockDelete,
    isPending: false,
  }),
}));

describe('Delete Wallet Document', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   */
  it('should allow the user to select the Delete option for a document', () => {

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    expect(alertSpy).toHaveBeenCalled();

  });

  /**
   * AC-2
   */
  it('should display a confirmation prompt before deleting the document', () => {

    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<HealthWallet />);

    expect(alertSpy).not.toHaveBeenCalled();

  });

  /**
   * AC-3
   */
  it('should permanently delete the selected document after confirmation', async () => {

    mockDelete.mockResolvedValue({});

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons[1].onPress();
    });

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1');
    });

  });

  /**
   * AC-4
   */
  it('should remove the deleted document from the wallet', async () => {

    mockDelete.mockResolvedValue({});

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons[1].onPress();
    });

    const { getByTestId, queryByText } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });

    expect(queryByText('Blood Report')).toBeNull();

  });

  /**
   * AC-5
   */
  it('should display an error message when the document cannot be deleted', async () => {

    mockDelete.mockRejectedValue(new Error('Delete failed'));

    const alertSpy = jest.spyOn(Alert, 'alert');

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons[1].onPress();
    });

    const { getByTestId, getByText } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalled();

    expect(getByText('Blood Report')).toBeTruthy();

  });

});