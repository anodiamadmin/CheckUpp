import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Add Appointment To Device Calendar', () => {

  /**
   * AC-1
   * Verify a success message is displayed
   * after the appointment is successfully
   * synced to the device calendar.
   */
  it('should display a success message after the appointment is synced', async () => {

    const syncAppointment = jest.fn().mockResolvedValue(true);

    const { getByText } = render(
      <HealthScreeningPage
        onSyncCalendar={syncAppointment}
      />
    );

    fireEvent.press(getByText('Add to Calendar'));

    await waitFor(() => {
      expect(syncAppointment).toHaveBeenCalledTimes(1);
    });

    expect(
      getByText('Appointment successfully added to your calendar')
    ).toBeTruthy();

  });

  /**
   * AC-2
   * Verify the user can view the calendar event
   * after the appointment has been added.
   */
  it('should allow the user to view the calendar event', async () => {

    const viewCalendarEvent = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onViewCalendarEvent={viewCalendarEvent}
      />
    );

    fireEvent.press(getByText('View Event'));

    await waitFor(() => {
      expect(viewCalendarEvent).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-3
   * Verify the appointment exists in the
   * selected calendar after syncing.
   */
  it('should create the appointment in the selected calendar', async () => {

    const syncAppointment = jest.fn().mockResolvedValue({
      calendar: 'Google Calendar',
      eventId: 'event-123',
    });

    const { getByText } = render(
      <HealthScreeningPage
        selectedCalendar="Google Calendar"
        onSyncCalendar={syncAppointment}
      />
    );

    fireEvent.press(getByText('Add to Calendar'));

    await waitFor(() => {

      expect(syncAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar: 'Google Calendar',
        })
      );

    });

  });

});