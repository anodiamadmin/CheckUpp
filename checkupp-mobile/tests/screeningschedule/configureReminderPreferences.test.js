import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Configure Reminder Preferences', () => {

  /**
   * AC-1
   * Verify the user can select
   * a reminder interval.
   */
  it('should allow the user to choose a reminder interval', async () => {

    const updateReminderPreference = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onUpdateReminderPreference={updateReminderPreference}
      />
    );

    fireEvent.press(getByText('30 minutes before'));

    await waitFor(() => {
      expect(updateReminderPreference).toHaveBeenCalledWith(
        '30 minutes before'
      );
    });

  });

  /**
   * AC-2
   * Verify reminder settings are applied
   * to newly synced appointments.
   */
  it('should apply the selected reminder interval to newly synced appointments', async () => {

    const syncAppointment = jest.fn();

    const { getByTestId } = render(
      <HealthScreeningPage
        reminderInterval="1 hour before"
        onSyncCalendar={syncAppointment}
      />
    );

    fireEvent.press(
      getByTestId('sync-calendar-button')
    );

    await waitFor(() => {

      expect(syncAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          reminder: '1 hour before',
        })
      );

    });

  });

  /**
   * AC-3
   * Verify the default reminder preference
   * can be configured.
   */
  it('should allow the user to configure the default reminder interval', async () => {

    const saveDefaultReminder = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onSaveDefaultReminder={saveDefaultReminder}
      />
    );

    fireEvent.press(getByText('1 day before'));

    await waitFor(() => {

      expect(saveDefaultReminder).toHaveBeenCalledWith(
        '1 day before'
      );

    });

  });

});