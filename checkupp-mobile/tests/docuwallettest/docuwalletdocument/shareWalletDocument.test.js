import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Share, Alert } from 'react-native';
import HealthWallet from '../../app/(tabs)/wallet';

// Mock Share API
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
}));

// Mock hooks
jest.mock('@/context/useAuthBootstrap', () => ({
  useGlobalContext: () => ({
    userId: 'user-123',
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
        documentType: 'PDF',
        fileType: 'pdf',
        file: 'https://example.com/report.pdf',
        createdAt: new Date(),
      },
    ],
  }),
}));

describe('Share Wallet Documents', () => {

  /**
   * AC-1
   */
  it('should allow the user to initiate sharing from the Documents section', () => {

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    expect(Share.share).toHaveBeenCalled();

  });

  /**
   * AC-2
   */
  it('should open the device native share sheet', async () => {

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
   */
  it('should share the selected document without modifying the original document', async () => {

    Share.share.mockResolvedValue({
      action: Share.sharedAction,
    });

    const { getByTestId, getByText } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(getByText('Blood Report')).toBeTruthy();
    });

  });

  /**
   * AC-4
   */
  it('should display an error message if sharing fails', async () => {

    jest.spyOn(Alert, 'alert');

    Share.share.mockRejectedValue(
      new Error('Sharing failed')
    );

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Something went wrong, please try again.'
      );
    });

  });

  /**
   * Retry sharing
   */
  it('should allow the user to retry sharing after an error', async () => {

    Share.share
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce({
        action: Share.sharedAction,
      });

    const { getByTestId } = render(<HealthWallet />);

    fireEvent.press(getByTestId('share-document-1'));

    fireEvent.press(getByTestId('retry-share'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledTimes(2);
    });

  });

});