import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Manage Calendar Sync Preference', () => {

  /**
   * AC-1
   * Verify the user can enable Calendar Sync.
   */
  it('should allow the user to enable Calendar Sync', async () => {

    const updateCalendarSync = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        onUpdateCalendarSync={updateCalendarSync}
      />
    );

    fireEvent(
      getByTestId('calendar-sync-switch'),
      'valueChange',
      true
    );

    await waitFor(() => {
      expect(updateCalendarSync).toHaveBeenCalledWith(true);
    });

  });

  /**
   * AC-1
   * Verify the user can disable Calendar Sync.
   */
  it('should allow the user to disable Calendar Sync', async () => {

    const updateCalendarSync = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        onUpdateCalendarSync={updateCalendarSync}
      />
    );

    fireEvent(
      getByTestId('calendar-sync-switch'),
      'valueChange',
      false
    );

    await waitFor(() => {
      expect(updateCalendarSync).toHaveBeenCalledWith(false);
    });

  });

  /**
   * AC-2
   * Verify the Calendar Sync preference
   * is retained across sessions.
   */
  it('should remember the Calendar Sync preference across sessions', async () => {

    const savePreference = jest.fn();

    const { getByTestId, rerender } = render(
      <HealthScreeningPage
        calendarSyncEnabled={true}
        saveCalendarSyncPreference={savePreference}
      />
    );

    fireEvent(
      getByTestId('calendar-sync-switch'),
      'valueChange',
      true
    );

    await waitFor(() => {
      expect(savePreference).toHaveBeenCalledWith(true);
    });

    rerender(
      <HealthScreeningPage
        calendarSyncEnabled={true}
      />
    );

    expect(
      getByTestId('calendar-sync-switch').props.value
    ).toBe(true);

  });

  /**
   * AC-3
   * Verify disabling Calendar Sync does not
   * remove existing calendar events.
   */
  it('should keep existing calendar events after Calendar Sync is disabled', async () => {

    const existingEvents = [
      {
        id: '1',
        title: 'Annual Health Check',
        date: '25 Jul 2026',
      },
    ];

    const { getByTestId, getByText } = render(
      <HealthScreeningPage
        calendarEvents={existingEvents}
      />
    );

    fireEvent(
      getByTestId('calendar-sync-switch'),
      'valueChange',
      false
    );

    await waitFor(() => {

      expect(
        getByText('Annual Health Check')
      ).toBeTruthy();

    });

  });

});