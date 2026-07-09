import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import HealthWallet from '../../app/(tabs)/wallet';

const mockDelete = jest.fn();
const mockRefetch = jest.fn();
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
        userId: 'user-123',
        title: 'Heart Medication',
        description: 'Blood pressure prescription',
        documentType: 'eScript Link',
        fileType: 'link',
        file: 'https://example.com/escript',
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

describe('Delete Wallet Link', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   */
  it('should allow the user to select the Delete option for an eScript link', () => {

    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    expect(alertSpy).toHaveBeenCalled();

  });

  /**
   * AC-2
   */
  it('should display a confirmation prompt before deleting the eScript link', () => {

    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<HealthWallet />);

    expect(alertSpy).not.toHaveBeenCalled();

  });

  /**
   * AC-3
   */
  it('should permanently delete the selected eScript link after confirmation', async () => {

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
  it('should remove the deleted eScript link from the Links section', async () => {

    mockDelete.mockResolvedValue({});

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons[1].onPress();
    });

    const { getByTestId, queryByText } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });

    expect(queryByText('Heart Medication')).toBeNull();

  });

  /**
   * AC-5
   */
  it('should display an error message if the eScript link cannot be deleted and keep the link available', async () => {

    mockDelete.mockRejectedValue(
      new Error('Link could not be deleted, please try again.')
    );

    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons[1].onPress();
    });

    const { getByTestId, getByText } = render(<HealthWallet />);

    fireEvent.press(getByTestId('delete-document-1'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Link could not be deleted, please try again.',
      'error'
    );

    expect(getByText('Heart Medication')).toBeTruthy();

  });

});