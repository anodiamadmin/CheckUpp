import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HealthScreeningPage from '../../app/(tabs)/health-screening';

describe('View Upcoming Appointments', () => {

  /**
   * AC-1
   * Verify all synced appointments are displayed
   * on the Upcoming Appointments screen.
   */
  it('should display all synced appointments', () => {

    const appointments = [
      {
        id: '1',
        title: 'Annual Health Check',
        date: '25 Jul 2026',
        time: '10:00 AM',
        location: 'City Health Clinic',
      },
      {
        id: '2',
        title: 'Blood Test',
        date: '28 Jul 2026',
        time: '09:00 AM',
        location: 'Central Pathology',
      },
    ];

    const { getByText } = render(
      <HealthScreeningPage
        appointments={appointments}
      />
    );

    fireEvent.press(getByText('View Upcoming Appointments'));

    expect(getByText('Annual Health Check')).toBeTruthy();
    expect(getByText('Blood Test')).toBeTruthy();

  });

  /**
   * AC-2
   * Verify appointments are grouped by date.
   */
  it('should group appointments by appointment date', () => {

    const appointments = [
      {
        id: '1',
        title: 'Annual Health Check',
        date: '25 Jul 2026',
        time: '10:00 AM',
      },
      {
        id: '2',
        title: 'Eye Examination',
        date: '25 Jul 2026',
        time: '02:00 PM',
      },
      {
        id: '3',
        title: 'Blood Test',
        date: '28 Jul 2026',
        time: '09:00 AM',
      },
    ];

    const { getByText } = render(
      <HealthScreeningPage
        appointments={appointments}
      />
    );

    fireEvent.press(getByText('View Upcoming Appointments'));

    expect(getByText('25 Jul 2026')).toBeTruthy();
    expect(getByText('28 Jul 2026')).toBeTruthy();

    expect(getByText('Annual Health Check')).toBeTruthy();
    expect(getByText('Eye Examination')).toBeTruthy();
    expect(getByText('Blood Test')).toBeTruthy();

  });

  /**
   * AC-3
   * Verify the user can open the device calendar
   * from the Upcoming Appointments screen.
   */
  it('should allow the user to open the device calendar', async () => {

    const openCalendar = jest.fn();

    const { getByText } = render(
      <HealthScreeningPage
        onOpenCalendar={openCalendar}
      />
    );

    fireEvent.press(getByText('View Upcoming Appointments'));

    fireEvent.press(getByText('Open Calendar'));

    await waitFor(() => {
      expect(openCalendar).toHaveBeenCalledTimes(1);
    });

  });

});