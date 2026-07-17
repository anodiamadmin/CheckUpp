import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Manage Calendar & Sync Settings', () => {

  /**
   * AC-1
   * Verify tapping the calendar icon opens
   * the Calendar & Sync Settings screen.
   */
  it('should open the Calendar & Sync Settings screen when the calendar icon is tapped', async () => {

    const navigate = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        navigation={{ navigate }}
      />
    );

    fireEvent.press(
      getByTestId('calendar-settings-icon')
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    expect(navigate).toHaveBeenCalledWith(
      'CalendarSyncSettings'
    );

  });

  /**
   * AC-2
   * Verify the current calendar sync status
   * is displayed on the settings screen.
   */
  it('should display the current calendar sync status', () => {

    const { getByText } = render(
      <HealthScreeningPage
        calendarSyncStatus="Synced"
      />
    );

    fireEvent.press(
      getByText('Calendar')
    );

    expect(
      getByText('Sync Status')
    ).toBeTruthy();

    expect(
      getByText('Synced')
    ).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the user can access Calendar &
   * Sync Settings at any time.
   */
  it('should allow the user to access Calendar & Sync Settings at any time', async () => {

    const navigate = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        navigation={{ navigate }}
      />
    );

    fireEvent.press(
      getByTestId('calendar-settings-icon')
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        'CalendarSyncSettings'
      );
    });

    fireEvent.press(
      getByTestId('back-button')
    );

    fireEvent.press(
      getByTestId('calendar-settings-icon')
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledTimes(2);
    });

  });

});