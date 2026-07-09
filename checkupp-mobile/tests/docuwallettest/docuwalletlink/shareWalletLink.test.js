import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import HealthWallet from '../../app/(tabs)/wallet';

jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
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
        userId: 'user-123',
        title: 'Heart Medication',
        description: 'Blood pressure prescription',
        documentType: 'eScript Link',
        fileType: 'link',
        file: 'https://example.com/escript/123',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user-999',
        title: 'Another User Link',
        description: 'Should not be shared',
        documentType: 'eScript Link',
        fileType: 'link',
        file: 'https://example.com/escript/999',
        createdAt: new Date().toISOString(),
      },
    ],
  }),
}));

describe('Share Wallet Link', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * AC-1
   * Verify the user can initiate sharing for an eScript link.
   */
  it('should allow the user to initiate sharing for an eScript link', () => {

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    expect(Share.share).toHaveBeenCalled();

  });

  /**
   * AC-2
   * Verify the native share sheet is displayed.
   */
  it('should open the device native sharing services', async () => {

    Share.share.mockResolvedValue({
      action: Share.sharedAction,
    });

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalled();
    });

  });

  /**
   * AC-3
   * Verify the selected link and description are shared.
   */
  it('should share the selected eScript link with its description', async () => {

    Share.share.mockResolvedValue({
      action: Share.sharedAction,
    });

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        message:
          'Blood pressure prescription\nhttps://example.com/escript/123',
      });
    });

  });

  /**
   * AC-4
   * Verify only links belonging to the logged-in user
   * can be shared.
   */
  it('should only allow sharing of eScript links associated with the logged-in user', () => {

    const { queryByTestId } = render(<HealthWallet />);

    expect(queryByTestId('share-document-1')).toBeTruthy();

    expect(queryByTestId('share-document-2')).toBeNull();

  });

  /**
   * AC-5
   * Verify an error message is displayed when sharing fails
   * and the user can retry.
   */
  it('should display an error message and allow retry if sharing fails', async () => {

    Share.share
      .mockRejectedValueOnce(
        new Error('Something went wrong, please try again.')
      )
      .mockResolvedValueOnce({
        action: Share.sharedAction,
      });

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Something went wrong, please try again.',
        'error'
      );
    });

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledTimes(2);
    });

  });

});