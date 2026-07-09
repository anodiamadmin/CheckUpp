import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthWallet from '../../app/(tabs)/wallet';
import * as WebBrowser from 'expo-web-browser';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
}));

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
        title: 'Heart Medication',
        description: 'Blood pressure prescription',
        documentType: 'eScript Link',
        fileType: 'link',
        file: 'https://example.com/escript/123',
        createdAt: new Date().toISOString(),
      },
    ],
  }),
}));

describe('View Wallet Link', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   * Verify the user can open the detailed view of a stored eScript link.
   */
  it('should open the selected eScript link in the supported browser', async () => {

    WebBrowser.openBrowserAsync.mockResolvedValue({});

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'https://example.com/escript/123'
      );
    });

  });

  /**
   * AC-2
   * Verify an error message is displayed when the detailed
   * view cannot be opened.
   */
  it('should display an error message when the detailed view cannot be opened', async () => {

    WebBrowser.openBrowserAsync.mockRejectedValue(
      new Error('Could not open Expanded View, try again')
    );

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Could not open Expanded View, try again',
        'error'
      );
    });

  });

  /**
   * AC-3
   * Verify the user can retry opening the link after a failure.
   */
  it('should allow the user to retry opening the detailed view after an error', async () => {

    WebBrowser.openBrowserAsync
      .mockRejectedValueOnce(
        new Error('Could not open Expanded View, try again')
      )
      .mockResolvedValueOnce({});

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledTimes(2);
    });

  });

});