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
        title: 'Blood Report',
        documentType: 'Lab Report',
        fileType: 'pdf',
        file: 'https://example.com/report.pdf',
        createdAt: new Date().toISOString(),
      },
    ],
  }),
}));

describe('View Wallet Document', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   */
  it('should open the selected document using the device supported document viewer', async () => {

    WebBrowser.openBrowserAsync.mockResolvedValue({});

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'https://example.com/report.pdf'
      );
    });

  });

  /**
   * AC-2
   */
  it('should display an error message if the document cannot be opened', async () => {

    WebBrowser.openBrowserAsync.mockRejectedValue(
      new Error('Could not open file')
    );

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('view-document-1'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Could not open file',
        'error'
      );
    });

  });

  /**
   * Retry opening the document.
   */
  it('should allow the user to retry opening the document after an error', async () => {

    WebBrowser.openBrowserAsync
      .mockRejectedValueOnce(new Error('Could not open file'))
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