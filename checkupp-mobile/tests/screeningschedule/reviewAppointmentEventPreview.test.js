import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('Review Appointment Event Preview', () => {

  /**
   * AC-1
   * Verify the Event Preview screen displays
   * the appointment title, date, time,
   * location and reminder.
   */
  it('should display the appointment title, date, time, location and reminder', () => {

    const appointment = {
      title: 'Annual Health Check',
      date: '25 Jul 2026',
      time: '10:00 AM',
      location: 'City Health Clinic',
      reminder: '30 minutes before',
    };

    const { getByText } = render(
      <HealthScreeningPage
        appointment={appointment}
      />
    );

    fireEvent.press(getByText('Event Preview'));

    expect(getByText('Annual Health Check')).toBeTruthy();
    expect(getByText('25 Jul 2026')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();
    expect(getByText('City Health Clinic')).toBeTruthy();
    expect(getByText('30 minutes before')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify the user can edit the appointment
   * before synchronising it to the calendar.
   */
  it('should allow the user to edit the appointment before syncing', async () => {

    const onEditAppointment = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onEditAppointment={onEditAppointment}
      />
    );

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(onEditAppointment).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-2
   * Verify the user can cancel the calendar sync
   * before the event is created.
   */
  it('should allow the user to cancel before syncing the appointment', async () => {

    const onCancelSync = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onCancelSync={onCancelSync}
      />
    );

    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      expect(onCancelSync).toHaveBeenCalledTimes(1);
    });

  });

  /**
   * AC-3
   * Verify the calendar event matches
   * the information displayed in the preview.
   */
  it('should create a calendar event that matches the displayed appointment details', async () => {

    const syncToCalendar = jest.fn();

    const appointment = {
      title: 'Annual Health Check',
      date: '25 Jul 2026',
      time: '10:00 AM',
      location: 'City Health Clinic',
      reminder: '30 minutes before',
    };

    const { getByText } = render(
      <HealthScreeningPage
        appointment={appointment}
        onSyncCalendar={syncToCalendar}
      />
    );

    fireEvent.press(getByText('Sync'));

    await waitFor(() => {

      expect(syncToCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Annual Health Check',
          date: '25 Jul 2026',
          time: '10:00 AM',
          location: 'City Health Clinic',
          reminder: '30 minutes before',
        })
      );

    });

  });

});