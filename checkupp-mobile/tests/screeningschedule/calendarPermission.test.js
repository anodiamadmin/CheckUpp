import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Calendar Permission', () => {

  /**
   * AC-1
   * Verify the application requests calendar permission
   * before the first calendar synchronization.
   */
  it('should request calendar permission before the first calendar sync', async () => {

    const requestCalendarPermission = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        requestCalendarPermission={requestCalendarPermission}
      />
    );

    fireEvent.press(
      getByTestId('add-to-calendar-button')
    );

    await waitFor(() => {
      expect(requestCalendarPermission).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-2
   * Verify the user can allow calendar access.
   */
  it('should allow the user to grant calendar permission', async () => {

    const onPermissionGranted = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onPermissionGranted={onPermissionGranted}
      />
    );

    fireEvent.press(getByText('Allow'));

    await waitFor(() => {
      expect(onPermissionGranted).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-2
   * Verify the user can deny calendar access.
   */
  it('should allow the user to deny calendar permission', async () => {

    const onPermissionDenied = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onPermissionDenied={onPermissionDenied}
      />
    );

    fireEvent.press(getByText('Deny'));

    await waitFor(() => {
      expect(onPermissionDenied).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-3
   * Verify the permission request is not shown again
   * once the user has already made a choice.
   */
  it('should not request calendar permission again after a permission choice has been made', () => {

    const requestCalendarPermission = jest.fn();

    render(
      <HealthScreeningPage
        calendarPermissionStatus="granted"
        requestCalendarPermission={requestCalendarPermission}
      />
    );

    expect(requestCalendarPermission).not.toHaveBeenCalled();

  });

});